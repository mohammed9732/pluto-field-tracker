import { getDb, nextId, saveDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityName, collectionCommission, currentPeriod, flagMissedDays, monthlyIncentiveTotal, monthlySalesValue, payrollFigures, periodsInQuarter, quarterAccrual, quarterOf, samplesGiven } from "@/lib/compute";

export const dynamic = "force-dynamic";

/* Everything you need to look at before paying anyone, for one month.
 *
 * Deliberately built as one answer rather than five screens: the mistake this
 * prevents is paying a month while a spending is still unapproved or a missed
 * day is still undecided, and then finding out afterwards. Anything that would
 * change a figure is listed as a blocker at the top.
 */
export async function GET(req: Request) {
  try {
    requireUser(["admin", "accountant"]);
    const db = getDb();
    const period = new URL(req.url).searchParams.get("period") ?? currentPeriod();
    // The blockers card must reflect reality whichever page she opens first —
    // these flags used to be created only when the Payroll page was opened.
    flagMissedDays(db, () => nextId(db), period);
    saveDb();
    const quarter = quarterOf(period);
    const isQuarterEnd = periodsInQuarter(quarter)[2] === period;

    const inPeriod = (iso: string) => (iso ?? "").slice(0, 7) === period;

    const people = db.users
      .filter((u) => u.active && u.baseSalary > 0)
      .map((u) => {
        const deductions = db.deductions.filter((d) => d.userId === u.id && inPeriod(d.date));
        const confirmed = deductions.filter((d) => d.status === "confirmed").reduce((s, d) => s + d.amount, 0);
        const undecided = deductions.filter((d) => d.status === "flagged");

        const spendings = db.spendings.filter((s) => s.userId === u.id && inPeriod(s.date));
        const reimburse = spendings.filter((s) => s.status === "approved").reduce((x, s) => x + s.amount, 0);
        const spendingsPending = spendings.filter((s) => s.status !== "approved" && s.status !== "rejected" && s.status !== "paid");

        // Shared with Payroll and with the recorded payment — see
        // payrollFigures in lib/compute.ts for why this must not be local.
        const fig = payrollFigures(db, u.id, period);
        const commission = fig.commission;
        const incentiveDue = fig.incentiveDue;
        const netPay = fig.netPay;
        const paid = db.payrollPaid.find((p) => p.userId === u.id && p.period === period);

        return {
          userId: u.id, name: u.name, role: u.role, city: cityName(db, u.city),
          base: u.baseSalary,
          commission,
          incentiveDue,
          accruedThisMonth: monthlyIncentiveTotal(db, u.id, period),
          deducted: confirmed,
          undecidedDeductions: undecided.length,
          netPay,
          reimburse,
          spendingsPendingCount: spendingsPending.length,
          // What the company actually hands over: wages plus expenses back.
          handOver: netPay + reimburse,
          sales: monthlySalesValue(db, u.id, period),
          collected: db.payments
            .filter((p) => p.collectedBy === u.id && inPeriod(p.ts))
            .reduce((s, p) => s + p.amount, 0),
          samples: samplesGiven(db, u.id, period),
          paid: paid
            ? { amount: paid.amount, paidAt: paid.paidAt, byName: db.users.find((x) => x.id === paid.paidBy)?.name ?? "?" }
            : null,
        };
      });

    // Anything unresolved that would move a number after you have paid.
    const pendingOrders = db.orders.filter((o) => o.status === "pending" && inPeriod(o.createdAt)).length;
    const awaitingInvoice = db.orders.filter((o) => o.status === "approved" && inPeriod(o.createdAt)).length;
    const blockers: { key: string; label: string; count: number; href: string }[] = [];
    const undecided = people.reduce((s, p) => s + p.undecidedDeductions, 0);
    if (undecided) blockers.push({ key: "deductions", label: "missed days still undecided", count: undecided, href: "/acct/payroll" });
    const spPending = people.reduce((s, p) => s + p.spendingsPendingCount, 0);
    if (spPending) blockers.push({ key: "spendings", label: "spendings not yet approved", count: spPending, href: "/spendings" });
    if (pendingOrders) blockers.push({ key: "orders", label: "orders still awaiting approval", count: pendingOrders, href: "/approvals" });
    if (awaitingInvoice) blockers.push({ key: "invoices", label: "approved orders not yet invoiced", count: awaitingInvoice, href: "/acct/queue" });

    const totals = {
      base: people.reduce((s, p) => s + p.base, 0),
      commission: people.reduce((s, p) => s + p.commission, 0),
      incentiveDue: people.reduce((s, p) => s + p.incentiveDue, 0),
      deducted: people.reduce((s, p) => s + p.deducted, 0),
      netPay: people.reduce((s, p) => s + p.netPay, 0),
      reimburse: people.reduce((s, p) => s + p.reimburse, 0),
      handOver: people.reduce((s, p) => s + p.handOver, 0),
      sales: people.reduce((s, p) => s + p.sales, 0),
      collected: people.reduce((s, p) => s + p.collected, 0),
      paidCount: people.filter((p) => p.paid).length,
    };

    saveDb();
    return Response.json({
      period, quarter, isQuarterEnd,
      closedThrough: db.settings.closedThrough,
      isClosedAlready: !!db.settings.closedThrough && period <= db.settings.closedThrough,
      people, totals, blockers,
    });
  } catch (e) {
    return errResponse(e);
  }
}

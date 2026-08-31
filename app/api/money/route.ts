import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { collectionCommission, currentPeriod, currentQuarter, dailyRate, flagMissedDays, monthlyIncentiveTotal, nowIso, onApprovedLeave, payrollFigures, periodOf, periodsInQuarter, quarterAccrual, quarterIncentivePaid, quarterOf, recordChange, todayStr, workDaysInMonth } from "@/lib/compute";
import { nextId as seqNext } from "@/lib/db";


// GET ?view=payouts|payroll&quarter=&period=
export async function GET(req: Request) {
  try {
    const user = requireUser(["accountant", "admin"]);
    const db = getDb();
    const url = new URL(req.url);
    const view = url.searchParams.get("view") ?? "payouts";
    if (view === "payouts") {
      const quarter = url.searchParams.get("quarter") ?? currentQuarter();
      const rows = db.users
        .filter((u) => u.active && (u.role === "rep" || u.role === "supervisor"))
        .map((u) => {
          const acc = quarterAccrual(db, u.id, quarter);
          const paid = db.payoutsPaid.find((p) => p.userId === u.id && p.quarter === quarter);
          // If the quarter-end payroll already carried this incentive, say so
          // here rather than offering a second Mark-as-paid button.
          const viaPayroll = !paid ? quarterIncentivePaid(db, u.id, quarter) : null;
          return {
            userId: u.id, name: u.name, city: u.city, role: u.role,
            months: acc.months, total: acc.total, incentives: acc.incentives, commission: acc.commission,
            paid: paid
              ? { amount: paid.amount, paidAt: paid.paidAt, paidByName: db.users.find((x) => x.id === paid.paidBy)?.name ?? "?" }
              : null,
            paidWithWages: viaPayroll?.via === "payroll" ? viaPayroll.at : null,
          };
        });
      const history = db.payoutsPaid
        .slice().sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .map((p) => ({ ...p, name: db.users.find((u) => u.id === p.userId)?.name ?? "?", paidByName: db.users.find((u) => u.id === p.paidBy)?.name ?? "?" }));
      return Response.json({ quarter, rows, history });
    }
    // payroll
    const period = url.searchParams.get("period") ?? currentPeriod();
    flagMissedDays(db, () => nextId(db), period);
    saveDb();
    const isQuarterEnd = periodsInQuarter(quarterOf(period))[2] === period;
    const rows = db.users
      .filter((u) => u.active && u.baseSalary > 0)
      .map((u) => {
        // Only offer the incentive here if it has not already been paid out
        // separately — otherwise the quarter-end wage run would pay it twice.
        const fig = payrollFigures(db, u.id, period);
        const incentiveDue = fig.incentiveDue;
        const paid = db.payrollPaid.find((p) => p.userId === u.id && p.period === period);
        const userDeductions = db.deductions.filter((x) => x.userId === u.id && x.date.slice(0, 7) === period);
        const confirmed = userDeductions.filter((x) => x.status === "confirmed").reduce((s, x) => s + x.amount, 0);
        const spendingsDue = db.spendings.filter((s) => s.userId === u.id && s.date.slice(0, 7) === period && s.status === "approved").reduce((x, s) => x + s.amount, 0);
        const commission = fig.commission;
        const collected = db.payments.filter((p) => p.collectedBy === u.id && periodOf(p.ts) === period)
          .reduce((s, p) => s + p.amount, 0);
        return {
          userId: u.id, name: u.name, role: u.role, city: u.city,
          collected, canCollect: u.canCollect !== false,
          collectionTarget: u.collectionTarget ?? null,
          collectionPctBelow: u.collectionPctBelow ?? null,
          collectionPctAbove: u.collectionPctAbove ?? null,
          base: u.baseSalary, incentiveDue,
          deductions: userDeductions,
          deducted: confirmed,
          spendingsDue,
          commission,
          total: fig.netPay,
          monthIncentive: monthlyIncentiveTotal(db, u.id, period),
          paid: paid ? { amount: paid.amount, paidAt: paid.paidAt, paidByName: db.users.find((x) => x.id === paid.paidBy)?.name ?? "?" } : null,
        };
      });
    return Response.json({ period, isQuarterEnd, deductionsEnabled: db.settings.deductionsEnabled, rows });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "payout"|"payroll", userId, quarter|period, amount }
export async function POST(req: Request) {
  try {
    const user = requireUser(["accountant", "admin"]);
    const db = getDb();
    const b = await req.json();

    /* The tiered collection incentive, per person: a monthly target, a rate
     * below it, a rate at/above it. The accountant owns these numbers. */
    if (b.action === "collectionPlan") {
      const target = db.users.find((u) => u.id === Number(b.userId));
      if (!target) return Response.json({ error: "Person not found" }, { status: 404 });
      const num = (v: unknown) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(String(v).replace(/,/g, ""));
        return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
      };
      const before = `${(target.collectionTarget ?? 0).toLocaleString()} @ ${target.collectionPctBelow ?? "co."}/${target.collectionPctAbove ?? "co."}%`;
      target.collectionTarget = num(b.target);
      target.collectionPctBelow = num(b.below);
      target.collectionPctAbove = num(b.above);
      recordChange(db, () => seqNext(db), user.id, "user", target.id, "collection plan changed",
        `${before} → ${(target.collectionTarget ?? 0).toLocaleString()} @ ${target.collectionPctBelow ?? "co."}/${target.collectionPctAbove ?? "co."}%`);
      saveDb();
      return Response.json({ ok: true });
    }

    if (b.action === "payout") {
      const quarter = String(b.quarter);
      const settled = quarterIncentivePaid(db, Number(b.userId), quarter);
      if (settled) {
        return Response.json({
          error: settled.via === "payroll"
            ? `Already paid — it went out with the ${periodsInQuarter(quarter)[2]} wages on ${settled.at.slice(0, 10)}.`
            : "Already paid",
        }, { status: 400 });
      }
      const amount = quarterAccrual(db, Number(b.userId), quarter).total;
      db.payoutsPaid.push({ id: nextId(db), userId: Number(b.userId), quarter, amount, paidAt: nowIso(), paidBy: user.id });
      saveDb();
      return Response.json({ ok: true });
    }
    if (b.action === "payroll") {
      const period = String(b.period);
      const userId = Number(b.userId);
      if (db.payrollPaid.some((p) => p.userId === userId && p.period === period)) {
        return Response.json({ error: "Already paid" }, { status: 400 });
      }
      const target = db.users.find((u) => u.id === userId);
      if (!target) return Response.json({ error: "User not found" }, { status: 404 });
      // The amount is recomputed here rather than taken from the request. The
      // client's figure is a display value; letting it decide what was paid
      // would put the payroll ledger at the mercy of a stale screen.
      const amount = payrollFigures(db, userId, period).netPay;
      db.payrollPaid.push({ id: nextId(db), userId, period, amount, paidAt: nowIso(), paidBy: user.id });
      saveDb();
      return Response.json({ ok: true });
    }
    if (b.action === "deduction") {
      const d = db.deductions.find((x) => x.id === Number(b.id));
      if (!d) return Response.json({ error: "Not found" }, { status: 404 });
      d.status = b.decision === "confirm" ? "confirmed" : "waived";
      d.decidedBy = user.id;
      saveDb();
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

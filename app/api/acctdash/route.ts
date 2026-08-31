import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { collectionCommission, currentPeriod, monthlySeries, orderTotal, periodOf, todayStr } from "@/lib/compute";

// Everything the accountant's money dashboard needs.
export async function GET(req: Request) {
  try {
    requireUser(["accountant", "admin"]);
    const db = getDb();
    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? currentPeriod();
    const today = todayStr();

    const monthOrders = db.orders.filter((o) => periodOf(o.createdAt) === period && !o.isSample && (o.status === "approved" || o.status === "invoiced"));
    const salesMTD = monthOrders.reduce((s, o) => s + orderTotal(o), 0);
    const monthPayments = db.payments.filter((p) => periodOf(p.ts) === period);
    const collectedMTD = monthPayments.reduce((s, p) => s + p.amount, 0);
    const queueCount = db.orders.filter((o) => o.status === "approved").length;

    // Collections list (this month).
    const collections = monthPayments
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .map((p) => ({
        id: p.id,
        ref: p.ref, ts: p.ts, amount: p.amount, method: p.method, note: p.note,
        doctorId: p.doctorId,
        doctor: db.doctors.find((d) => d.id === p.doctorId)?.name ?? "?",
        rep: db.users.find((u) => u.id === p.collectedBy)?.name ?? "?",
        photo: p.photo,
      }));

    // Cash reconciliation: per rep per day, cash receipts issued.
    const recon: Record<string, { rep: string; date: string; cash: number; transfer: number; receipts: number }> = {};
    for (const p of monthPayments) {
      const rep = db.users.find((u) => u.id === p.collectedBy)?.name ?? "?";
      const key = `${rep}|${p.ts.slice(0, 10)}`;
      recon[key] = recon[key] ?? { rep, date: p.ts.slice(0, 10), cash: 0, transfer: 0, receipts: 0 };
      recon[key][p.method === "cash" ? "cash" : "transfer"] += p.amount;
      recon[key].receipts += 1;
    }
    const reconciliation = Object.values(recon).sort((a, b) => b.date.localeCompare(a.date));

    // Spendings + payroll summary for the month.
    const people = db.users.filter((u) => u.active && u.baseSalary > 0).map((u) => {
      const spend = db.spendings.filter((s) => s.userId === u.id && s.date.slice(0, 7) === period && s.status !== "rejected").reduce((x, s) => x + s.amount, 0);
      const deducted = db.deductions.filter((d) => d.userId === u.id && d.date.slice(0, 7) === period && d.status === "confirmed").reduce((x, d) => x + d.amount, 0);
      return {
        name: u.name, base: u.baseSalary,
        commission: collectionCommission(db, u.id, period),
        spendings: spend, deducted,
        paid: db.payrollPaid.some((p) => p.userId === u.id && p.period === period),
      };
    });

    return Response.json({
      period, today,
      monthly: monthlySeries(db, 12),
      kpis: { salesMTD, collectedMTD, queueCount, collectedToday: monthPayments.filter((p) => p.ts.startsWith(today)).reduce((s, p) => s + p.amount, 0) },
      collections, reconciliation, people,
    });
  } catch (e) {
    return errResponse(e);
  }
}

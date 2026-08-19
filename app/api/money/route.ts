import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { collectionCommission, currentPeriod, currentQuarter, dailyRate, monthlyIncentiveTotal, nowIso, onApprovedLeave, quarterAccrual, quarterOf, periodsInQuarter, todayStr, workDaysInMonth } from "@/lib/compute";
import { nextId as seqNext } from "@/lib/db";

// Flag unexcused no-check-in workdays (past days only) as pending deductions.
function flagMissedDays(db: ReturnType<typeof getDb>, period: string) {
  if (!db.settings.deductionsEnabled) return;
  const today = todayStr();
  // Only look back 7 days — older gaps shouldn't suddenly appear on payroll.
  const cutoff = new Date(today + "T12:00:00");
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  for (const u of db.users.filter((x) => x.active && (x.role === "rep" || x.role === "supervisor"))) {
    for (const d of workDaysInMonth(period)) {
      if (d >= today || d < cutoffStr) continue;
      if (onApprovedLeave(db, u.id, d)) continue;
      if (db.checkins.some((c) => c.userId === u.id && c.type === "in" && c.ts.startsWith(d))) continue;
      if (db.deductions.some((x) => x.userId === u.id && x.date === d)) continue;
      db.deductions.push({ id: seqNext(db), userId: u.id, date: d, amount: dailyRate(u.baseSalary), status: "flagged", decidedBy: null });
    }
  }
}

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
          return {
            userId: u.id, name: u.name, city: u.city, role: u.role,
            months: acc.months, total: acc.total, incentives: acc.incentives, commission: acc.commission,
            paid: paid ? { amount: paid.amount, paidAt: paid.paidAt, paidByName: db.users.find((x) => x.id === paid.paidBy)?.name ?? "?" } : null,
          };
        });
      const history = db.payoutsPaid
        .slice().sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .map((p) => ({ ...p, name: db.users.find((u) => u.id === p.userId)?.name ?? "?", paidByName: db.users.find((u) => u.id === p.paidBy)?.name ?? "?" }));
      return Response.json({ quarter, rows, history });
    }
    // payroll
    const period = url.searchParams.get("period") ?? currentPeriod();
    flagMissedDays(db, period);
    saveDb();
    const isQuarterEnd = periodsInQuarter(quarterOf(period))[2] === period;
    const rows = db.users
      .filter((u) => u.active && u.baseSalary > 0)
      .map((u) => {
        const incentiveDue = isQuarterEnd ? quarterAccrual(db, u.id, quarterOf(period)).total : 0;
        const paid = db.payrollPaid.find((p) => p.userId === u.id && p.period === period);
        const userDeductions = db.deductions.filter((x) => x.userId === u.id && x.date.slice(0, 7) === period);
        const confirmed = userDeductions.filter((x) => x.status === "confirmed").reduce((s, x) => s + x.amount, 0);
        const spendingsDue = db.spendings.filter((s) => s.userId === u.id && s.date.slice(0, 7) === period && s.status === "approved").reduce((x, s) => x + s.amount, 0);
        const commission = collectionCommission(db, u.id, period);
        return {
          userId: u.id, name: u.name, role: u.role, city: u.city,
          base: u.baseSalary, incentiveDue,
          deductions: userDeductions,
          deducted: confirmed,
          spendingsDue,
          commission,
          total: Math.max(0, u.baseSalary + incentiveDue + commission - confirmed),
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
    if (b.action === "payout") {
      const quarter = String(b.quarter);
      if (db.payoutsPaid.some((p) => p.userId === Number(b.userId) && p.quarter === quarter)) {
        return Response.json({ error: "Already paid" }, { status: 400 });
      }
      const amount = quarterAccrual(db, Number(b.userId), quarter).total;
      db.payoutsPaid.push({ id: nextId(db), userId: Number(b.userId), quarter, amount, paidAt: nowIso(), paidBy: user.id });
      saveDb();
      return Response.json({ ok: true });
    }
    if (b.action === "payroll") {
      const period = String(b.period);
      if (db.payrollPaid.some((p) => p.userId === Number(b.userId) && p.period === period)) {
        return Response.json({ error: "Already paid" }, { status: 400 });
      }
      db.payrollPaid.push({ id: nextId(db), userId: Number(b.userId), period, amount: Number(b.amount) || 0, paidAt: nowIso(), paidBy: user.id });
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

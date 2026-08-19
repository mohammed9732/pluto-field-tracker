import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import {
  cityName, notify, onApprovedLeave, orderTotal, periodOf, samplesGiven,
  currentPeriod, todayStr, visitsOn, fieldTimeMinutes,
} from "@/lib/compute";

// End-of-day summary for the owner and supervisor: one honest picture of the day.
function buildSummary(db: ReturnType<typeof getDb>, date: string) {
  const fieldUsers = db.users.filter((u) => u.active && (u.role === "rep" || u.role === "supervisor"));
  const rows = fieldUsers.map((u) => {
    const vs = visitsOn(db, u.id, date);
    const ft = fieldTimeMinutes(db, u.id, date);
    const onLeave = onApprovedLeave(db, u.id, date);
    const dayOrders = db.orders.filter((o) => o.createdBy === u.id && o.createdAt.startsWith(date) && !o.isSample);
    const daySamples = db.orders.filter((o) => o.createdBy === u.id && o.createdAt.startsWith(date) && o.isSample);
    const collected = db.payments.filter((p) => p.collectedBy === u.id && p.ts.startsWith(date)).reduce((s, p) => s + p.amount, 0);
    return {
      userId: u.id, name: u.name, city: cityName(db, u.city),
      onLeave,
      started: ft.minutes > 0 || ft.checkedIn,
      visits: vs.length,
      target: onLeave ? 0 : u.dailyMin,
      outOfLocation: vs.filter((v) => v.outOfLocation).length,
      fieldMinutes: ft.minutes,
      orders: dayOrders.length,
      orderValue: dayOrders.reduce((s, o) => s + orderTotal(o), 0),
      samples: daySamples.reduce((s, o) => s + o.items.reduce((x, it) => x + it.qty, 0), 0),
      collected,
    };
  });
  const totals = {
    visits: rows.reduce((s, r) => s + r.visits, 0),
    target: rows.reduce((s, r) => s + r.target, 0),
    orderValue: rows.reduce((s, r) => s + r.orderValue, 0),
    collected: rows.reduce((s, r) => s + r.collected, 0),
    samples: rows.reduce((s, r) => s + r.samples, 0),
    outOfLocation: rows.reduce((s, r) => s + r.outOfLocation, 0),
    notStarted: rows.filter((r) => !r.started && !r.onLeave).map((r) => r.name),
    belowTarget: rows.filter((r) => !r.onLeave && r.visits < r.target).map((r) => r.name),
  };
  const pendingOrders = db.orders.filter((o) => o.status === "pending").length;
  const pendingInvoices = db.orders.filter((o) => o.status === "approved").length;
  return { date, rows, totals, pendingOrders, pendingInvoices };
}

export async function GET(req: Request) {
  try {
    requireUser(["admin", "supervisor"]);
    const db = getDb();
    const date = new URL(req.url).searchParams.get("date") ?? todayStr();
    return Response.json({ ...buildSummary(db, date), hour: db.settings.dailySummaryHour });
  } catch (e) {
    return errResponse(e);
  }
}

// Called by the app (or a scheduled job after deployment) to push the summary once a day.
export async function POST() {
  try {
    requireUser();
    const db = getDb();
    const date = todayStr();
    const now = new Date().getHours();
    if (now < (db.settings.dailySummaryHour ?? 18)) return Response.json({ ok: true, sent: false, reason: "too early" });
    const marker = `daily-summary:${date}`;
    if (db.activity.some((a) => a.action === marker)) return Response.json({ ok: true, sent: false, reason: "already sent" });

    const s = buildSummary(db, date);
    const parts = [
      `Visits ${s.totals.visits}/${s.totals.target}`,
      `orders ${Math.round(s.totals.orderValue).toLocaleString()} IQD`,
      `collected ${Math.round(s.totals.collected).toLocaleString()} IQD`,
    ];
    if (s.totals.samples) parts.push(`${s.totals.samples} samples`);
    if (s.totals.notStarted.length) parts.push(`never started: ${s.totals.notStarted.join(", ")}`);
    if (s.totals.outOfLocation) parts.push(`${s.totals.outOfLocation} out-of-location`);
    if (s.pendingOrders) parts.push(`${s.pendingOrders} orders awaiting approval`);
    const body = `Today: ${parts.join(" · ")}`;

    for (const u of db.users.filter((x) => x.active && (x.role === "admin" || x.role === "supervisor"))) {
      notify(db, () => nextId(db), u.id, body, "/summary");
    }
    db.activity.push({ id: nextId(db), userId: 0, action: marker, ts: new Date().toISOString().slice(0, 19) });
    saveDb();
    return Response.json({ ok: true, sent: true, body });
  } catch (e) {
    return errResponse(e);
  }
}

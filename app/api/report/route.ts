import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityIds, cityName, currentPeriod, monthlyAccrual, onApprovedLeave, orderTotal, periodOf, samplesGiven, visitsOn, workDaysInMonth, nowIso } from "@/lib/compute";

export async function GET(req: Request) {
  try {
    requireUser(["admin"]);
    const db = getDb();
    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? currentPeriod();
    const fieldUsers = db.users.filter((u) => u.active && (u.role === "rep" || u.role === "supervisor"));
    const days = workDaysInMonth(period);
    const cities = cityIds(db);

    // (a) visits vs plan
    const visitRows = fieldUsers.map((u) => {
      let visits = 0;
      let joint = 0;
      let plan = 0;
      for (const d of days) {
        const vs = visitsOn(db, u.id, d);
        visits += vs.length;
        joint += vs.filter((v) => v.jointVisit).length;
        if (!onApprovedLeave(db, u.id, d)) plan += u.dailyMin;
      }
      return { name: u.name, role: u.role, city: cityName(db, u.city), visits, joint, plan, samples: samplesGiven(db, u.id, period) };
    });

    // (b) sales qty+value per product × city × rep
    const monthOrders = db.orders.filter((o) => periodOf(o.createdAt) === period && !o.isSample && (o.status === "approved" || o.status === "invoiced"));
    const salesRows: { product: string; city: string; rep: string; qty: number; value: number }[] = [];
    for (const o of monthOrders) {
      const rep = db.users.find((u) => u.id === o.createdBy);
      for (const it of o.items) {
        const product = db.products.find((p) => p.id === it.productId);
        const key = salesRows.find((r) => r.product === product?.name && r.rep === rep?.name);
        if (key) { key.qty += it.qty; key.value += it.qty * it.price; }
        else salesRows.push({ product: product?.name ?? "?", city: cityName(db, rep?.city), rep: rep?.name ?? "?", qty: it.qty, value: it.qty * it.price });
      }
    }
    salesRows.sort((a, b) => a.product.localeCompare(b.product) || a.city.localeCompare(b.city));

    // (c) target achievement + (d) incentives
    const achievementRows = fieldUsers.flatMap((u) =>
      monthlyAccrual(db, u.id, period).map((r) => ({ name: u.name, ...r }))
    );
    const incentivesTotal = achievementRows.reduce((s, r) => s + r.incentiveAmount, 0);

    // (e) orders funnel
    const allMonth = db.orders.filter((o) => periodOf(o.createdAt) === period);
    const funnel = {
      total: allMonth.length,
      pending: allMonth.filter((o) => o.status === "pending").length,
      approved: allMonth.filter((o) => o.status === "approved").length,
      rejected: allMonth.filter((o) => o.status === "rejected").length,
      invoiced: allMonth.filter((o) => o.status === "invoiced").length,
      value: allMonth.filter((o) => o.status !== "rejected").reduce((s, o) => s + orderTotal(o), 0),
    };

    // (f) stock & expiry
    const stock = db.stock.map((s) => ({
      product: `${db.products.find((p) => p.id === s.productId)?.name ?? "?"}${s.location === "main" ? "" : ` (${s.location})`}`,
      qty: s.qty, expiry: s.expiry,
      low: s.qty <= db.settings.lowStockThreshold,
      nearExpiry: !!s.expiry && s.expiry <= new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 10),
    }));

    // (g) leaves taken in the month
    const leaves = db.leaves
      .filter((l) => l.status === "approved" && l.start.slice(0, 7) <= period && l.end.slice(0, 7) >= period)
      .map((l) => ({
        name: db.users.find((u) => u.id === l.userId)?.name ?? "?",
        start: l.start, end: l.end, type: l.type,
      }));

    // payments collected in the month
    const collected = db.payments.filter((p) => periodOf(p.ts) === period).reduce((s, p) => s + p.amount, 0);

    return Response.json({
      period, generatedAt: nowIso(),
      visitRows, salesRows, achievementRows, incentivesTotal, funnel, stock, leaves, collected,
      competitors: db.competitorNotes
        .filter((c) => periodOf(c.ts) === period)
        .map((c) => ({
          competitor: c.competitor, product: c.product, price: c.price, note: c.note,
          doctor: c.doctorId ? db.doctors.find((d) => d.id === c.doctorId)?.name ?? "?" : "General",
          by: db.users.find((u) => u.id === c.userId)?.name ?? "?",
          date: c.ts.slice(0, 10),
        })),
      samplesTotal: db.users.filter((u) => u.active).reduce((s2, u) => s2 + samplesGiven(db, u.id, period), 0),
      cities,
    });
  } catch (e) {
    return errResponse(e);
  }
}

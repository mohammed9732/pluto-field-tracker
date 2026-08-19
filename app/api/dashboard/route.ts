import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityIds, cityName, currentPeriod, fieldTimeMinutes, monthlyAccrual, onApprovedLeave, orderTotal, periodOf, todayStr, visitsOn, weekDates, weekStartOf } from "@/lib/compute";

export async function GET() {
  try {
    requireUser(["admin"]);
    const db = getDb();
    const today = todayStr();
    const period = currentPeriod();
    const fieldUsers = db.users.filter((u) => u.active && (u.role === "rep" || u.role === "supervisor"));

    let visitsToday = 0;
    let minToday = 0;
    let onLeaveCount = 0;
    let outOfLocationToday = 0;
    for (const u of fieldUsers) {
      const vs = visitsOn(db, u.id, today);
      visitsToday += vs.length;
      outOfLocationToday += vs.filter((v) => v.outOfLocation).length;
      if (onApprovedLeave(db, u.id, today)) onLeaveCount += 1;
      else minToday += u.dailyMin;
    }

    const monthOrders = db.orders.filter((o) => periodOf(o.createdAt) === period && !o.isSample && (o.status === "approved" || o.status === "invoiced"));
    const salesValue = monthOrders.reduce((s, o) => s + orderTotal(o), 0);
    const salesBoxes = monthOrders.reduce((s, o) => s + o.items.reduce((x, it) => x + it.qty, 0), 0);

    const pending = db.orders.filter((o) => o.status === "pending");
    const pendingValue = pending.reduce((s, o) => s + orderTotal(o), 0);

    const stockAlerts: string[] = [];
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 3);
    for (const s of db.stock) {
      const p = db.products.find((x) => x.id === s.productId);
      if (!p) continue;
      const locLabel = s.location === "main" ? "" : ` ${s.location}`;
      if (s.qty <= db.settings.lowStockThreshold) stockAlerts.push(`${p.name}${locLabel} low (${s.qty})`);
      else if (s.location === "main" && s.expiry && s.expiry <= soon.toISOString().slice(0, 10)) stockAlerts.push(`${p.name} near expiry (${s.expiry.slice(0, 7)})`);
    }

    // Visits vs minimum, this week.
    const week = weekDates(weekStartOf(today)).filter((d) => d <= today);
    const weekRows = fieldUsers.map((u) => {
      let visits = 0;
      let joint = 0;
      let plan = 0;
      for (const d of week) {
        const vs = visitsOn(db, u.id, d);
        visits += vs.length;
        joint += vs.filter((v) => v.jointVisit).length;
        if (!onApprovedLeave(db, u.id, d)) plan += u.dailyMin;
      }
      return { name: u.name + (u.role === "supervisor" ? " (Supervisor)" : ""), city: cityName(db, u.city), visits, plan, joint };
    });

    // Sales product × city (this month, boxes + value).
    const cities = cityIds(db);
    const salesMatrix = db.products.filter((p) => p.active).map((p) => {
      const byCity: Record<string, number> = {};
      for (const c of cities) byCity[c] = 0;
      let value = 0;
      for (const o of monthOrders) {
        const creator = db.users.find((u) => u.id === o.createdBy);
        const city = creator?.city && cities.includes(creator.city) ? creator.city : cities[0];
        for (const it of o.items) {
          if (it.productId !== p.id) continue;
          byCity[city] += it.qty;
          value += it.qty * it.price;
        }
      }
      return { product: p.name, byCity, value };
    });

    // Target heat per city.
    const heat = cities.map((city) => {
      const label = cityName(db, city);
      const users = fieldUsers.filter((u) => u.city === city);
      let pctSum = 0;
      let n = 0;
      for (const u of users) {
        for (const r of monthlyAccrual(db, u.id, period)) {
          pctSum += Math.min(150, r.achievementPct);
          n++;
        }
      }
      return { city, label, pct: n ? Math.round(pctSum / n) : 0 };
    });

    const inField = fieldUsers.filter((u) => fieldTimeMinutes(db, u.id, today).checkedIn).length;

    return Response.json({
      today, period,
      kpis: {
        visitsToday, minToday, onLeaveCount, outOfLocationToday,
        salesValue, salesBoxes,
        pendingCount: pending.length, pendingValue,
        stockAlerts,
        inField,
      },
      cities: db.settings.cities,
      weekRows, salesMatrix, heat,
      pendingPlans: db.plans.filter((p) => p.status === "submitted").length,
    });
  } catch (e) {
    return errResponse(e);
  }
}

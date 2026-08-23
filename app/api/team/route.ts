import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityName, fieldTimeMinutes, monthlyAccrual, currentPeriod, onApprovedLeave, todayStr, visitsOn, weekStartOf, weekDates } from "@/lib/compute";

export async function GET() {
  try {
    const user = requireUser(["supervisor", "admin"]);
    const db = getDb();
    const today = todayStr();
    const week = weekDates(weekStartOf(today));
    const reps = db.users.filter((u) => u.active && u.role === "rep");
    const rows = reps.map((u) => {
      const ft = fieldTimeMinutes(db, u.id, today);
      const lastIn = db.checkins.filter((c) => c.userId === u.id && c.ts.startsWith(today) && c.type === "in").pop();
      const onLeave = onApprovedLeave(db, u.id, today);
      const leave = db.leaves.find((l) => l.userId === u.id && l.status === "approved" && l.start <= today && today <= l.end);
      const accrual = monthlyAccrual(db, u.id, currentPeriod()).filter((r) => r.targetQty > 0);
      const weekVisits = week.reduce((s, d) => s + visitsOn(db, u.id, d).length, 0);
      const pair = [user.id, u.id].sort((a, b) => a - b);
      return {
        userId: u.id, name: u.name, city: u.city, cityLabel: cityName(db, u.city), dailyMin: u.dailyMin,
        phone: u.phone,
        dmChannel: `dm-${pair[0]}-${pair[1]}`,
        checkedIn: ft.checkedIn, inSince: ft.inSince, fieldMinutes: ft.minutes,
        lastInAt: lastIn?.ts ?? null,
        todayVisits: visitsOn(db, u.id, today).length,
        // A bare count ("2 out-of-location visits") tells a supervisor nothing
        // they can act on. Naming the doctor and the day turns it into a
        // question they can actually ask: "why were you logging Dr Ahmed from
        // three kilometres away on Tuesday?"
        outOfLocationVisits: week.filter((d) => d <= today).flatMap((d) =>
          visitsOn(db, u.id, d).filter((v) => v.outOfLocation).map((v) => ({
            id: v.id,
            date: v.date,
            time: v.time,
            doctorId: v.doctorId,
            doctorName: db.doctors.find((x) => x.id === v.doctorId)?.name ?? "?",
            noGps: v.lat == null,
          }))),
        weekVisits,
        onLeave, leaveUntil: leave?.end ?? null,
        products: accrual.map((r) => ({ name: r.productName, pct: Math.round(r.achievementPct) })),
      };
    });
    // Team week vs plan
    const workDaysSoFar = week.filter((d) => d <= today);
    let planned = 0;
    let leaveAdjust = 0;
    for (const u of reps) {
      for (const d of workDaysSoFar) {
        if (onApprovedLeave(db, u.id, d)) leaveAdjust += u.dailyMin;
      }
      planned += u.dailyMin * workDaysSoFar.length;
    }
    const teamVisits = rows.reduce((s, r) => s + r.weekVisits, 0);
    const jointVisits = week.reduce((s, d) => s + db.visits.filter((v) => v.date === d && v.jointVisit).length, 0);
    return Response.json({
      today, rows,
      week: { visits: teamVisits, plan: Math.max(0, planned - leaveAdjust), joint: jointVisits },
    });
  } catch (e) {
    return errResponse(e);
  }
}

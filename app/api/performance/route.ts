import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityName, currentPeriod, doctorsFor, fieldTimeMinutes, monthlyAccrual, onApprovedLeave, periodOf, todayStr, workDaysInMonth } from "@/lib/compute";

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    if (!db.settings.performanceTab) return Response.json({ enabled: false });
    const url = new URL(req.url);
    let userId = Number(url.searchParams.get("userId") ?? user.id);
    if (user.role === "rep" || user.role === "accountant") userId = user.id;
    const target = db.users.find((u) => u.id === userId);
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });
    const period = url.searchParams.get("period") ?? currentPeriod();
    const today = todayStr();
    // Only count working days that have already happened.
    const daysElapsed = workDaysInMonth(period).filter((d) => d <= today);

    let visitCount = 0;
    let joint = 0;
    let fieldDays = 0;
    let fieldMinutes = 0;
    let requiredVisits = 0;
    let leaveDays = 0;
    for (const d of daysElapsed) {
      const vs = db.visits.filter((v) => v.userId === userId && v.date === d);
      visitCount += vs.length;
      joint += vs.filter((v) => v.jointVisit).length;
      const ft = fieldTimeMinutes(db, userId, d);
      if (ft.minutes > 0) { fieldDays++; fieldMinutes += ft.minutes; }
      if (onApprovedLeave(db, userId, d)) leaveDays++;
      else requiredVisits += target.dailyMin;
    }
    const workedDays = daysElapsed.length - leaveDays;

    // Doctor frequency this month.
    const perDoctor = new Map<number, number>();
    for (const v of db.visits.filter((v) => v.userId === userId && v.date.slice(0, 7) === period)) {
      perDoctor.set(v.doctorId, (perDoctor.get(v.doctorId) ?? 0) + 1);
    }
    const myDoctors = doctorsFor(db, target);
    const visited = myDoctors.filter((d) => perDoctor.has(d.id));
    const notVisited = myDoctors.filter((d) => !perDoctor.has(d.id));
    const mostVisited = Array.from(perDoctor.entries())
      .map(([docId, n]) => {
        const doc = db.doctors.find((d) => d.id === docId);
        return { id: docId, name: doc?.name ?? "?", class: doc?.class ?? "?", n };
      })
      .sort((a, b) => b.n - a.n);

    // Coverage per class: how many of that class were reached, and how often.
    const byClass = ["A", "B", "C"].map((cls) => {
      const inClass = myDoctors.filter((d) => d.class === cls);
      const reached = inClass.filter((d) => perDoctor.has(d.id));
      const visits = inClass.reduce((s, d) => s + (perDoctor.get(d.id) ?? 0), 0);
      return { cls, total: inClass.length, reached: reached.length, visits };
    }).filter((r) => r.total > 0);

    const collected = db.payments
      .filter((p) => p.collectedBy === userId && periodOf(p.ts) === period)
      .reduce((s, p) => s + p.amount, 0);

    const accrual = monthlyAccrual(db, userId, period);

    // Supervisors work by city — show how many days he spent in each.
    let cityDays: { city: string; label: string; days: number }[] = [];
    if (target.role === "supervisor") {
      const counts = new Map<string, number>();
      for (const d of daysElapsed) {
        const vs = db.visits.filter((v) => v.userId === userId && v.date === d);
        if (!vs.length) continue;
        // The city of the doctors he met that day.
        const cities = vs.map((v) => db.doctors.find((x) => x.id === v.doctorId)?.city).filter(Boolean) as string[];
        const main = cities.sort((a, b) =>
          cities.filter((c) => c === b).length - cities.filter((c) => c === a).length)[0];
        if (main) counts.set(main, (counts.get(main) ?? 0) + 1);
      }
      cityDays = Array.from(counts.entries())
        .map(([city, days]) => ({ city, label: cityName(db, city), days }))
        .sort((a, b) => b.days - a.days);
    }

    let leaderboard: any[] = [];
    if (db.settings.leaderboard) {
      leaderboard = db.users.filter((u) => u.active && u.role === "rep").map((u) => {
        const acc = monthlyAccrual(db, u.id, period);
        const avgPct = acc.length ? acc.reduce((s, r) => s + Math.min(120, r.achievementPct), 0) / acc.length : 0;
        const v = db.visits.filter((x) => x.userId === u.id && x.date.slice(0, 7) === period).length;
        const col = db.payments.filter((p) => p.collectedBy === u.id && periodOf(p.ts) === period).reduce((s, p) => s + p.amount, 0);
        return { name: u.name, city: cityName(db, u.city), avgPct: Math.round(avgPct), visits: v, collected: col, score: Math.round(avgPct + v) };
      }).sort((a, b) => b.score - a.score);
    }

    return Response.json({
      enabled: true, period, name: target.name, role: target.role,
      dailyMin: target.dailyMin,
      cityLabel: cityName(db, target.city),
      visits: {
        total: visitCount,
        required: requiredVisits,
        joint,
        workedDays,
        leaveDays,
        perDayAvg: workedDays ? Number((visitCount / workedDays).toFixed(1)) : 0,
      },
      field: {
        days: fieldDays,
        avgMinutes: fieldDays ? Math.round(fieldMinutes / fieldDays) : 0,
        totalMinutes: fieldMinutes,
        missedDays: Math.max(0, workedDays - fieldDays),
      },
      coverage: { visited: visited.length, total: myDoctors.length },
      byClass,
      mostVisited: mostVisited.slice(0, 5),
      leastVisited: notVisited.slice(0, 6).map((d) => ({ id: d.id, name: d.name, class: d.class })),
      cityDays,
      collected,
      accrual,
      leaderboard,
      leaderboardOn: db.settings.leaderboard,
    });
  } catch (e) {
    return errResponse(e);
  }
}

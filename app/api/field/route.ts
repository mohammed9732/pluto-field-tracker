import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { fieldTimeMinutes, nowIso, todayStr, visitsOn, monthlyAccrual, currentPeriod, currentQuarter, quarterAccrual, weekStartOf } from "@/lib/compute";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// GET → everything the rep/supervisor home screen needs.
export async function GET() {
  try {
    const user = requireUser();
    const db = getDb();
    const today = todayStr();
    const ft = fieldTimeMinutes(db, user.id, today);
    const hasStarted = db.checkins.some((c) => c.userId === user.id && c.type === "in" && c.ts.startsWith(today));
    const visits = visitsOn(db, user.id, today).map((v) => ({
      ...v,
      doctor: db.doctors.find((d) => d.id === v.doctorId) ?? null,
    }));
    const followUps = db.visits
      .filter((v) => v.userId === user.id && v.followUpDate && v.followUpDate >= today)
      .sort((a, b) => (a.followUpDate! < b.followUpDate! ? -1 : 1))
      .slice(0, 5)
      .map((v) => ({ id: v.id, date: v.followUpDate, doctor: db.doctors.find((d) => d.id === v.doctorId)?.name ?? "?" }));
    const accrual = monthlyAccrual(db, user.id, currentPeriod());
    const quarter = quarterAccrual(db, user.id, currentQuarter());

    // Today's route from the approved plan for this week.
    let route: any = null;
    if (db.settings.plannerEnabled) {
      const plan = db.plans.find((p) => p.userId === user.id && p.weekStart === weekStartOf(today) && p.status === "approved");
      const dayName = DAY_NAMES[new Date(today + "T12:00:00").getDay()];
      const day = plan?.days.find((d) => d.day === dayName);
      if (plan && day) {
        const visitedIds = new Set(visits.map((v: any) => v.doctorId));
        const docInfo = (id: number) => {
          const d = db.doctors.find((x) => x.id === id);
          const v = visits.find((x: any) => x.doctorId === id);
          return d ? { id: d.id, name: d.name, clinic: d.clinic, area: d.area, class: d.class, visited: visitedIds.has(id), outcome: v?.outcome ?? null, time: v?.time ?? null } : null;
        };
        route = {
          area: day.area,
          note: day.note,
          doctors: (day.doctorIds ?? []).map(docInfo).filter(Boolean),
          backups: (day.backupIds ?? []).map(docInfo).filter(Boolean),
        };
      }
    }

    return Response.json({
      hasStarted,
      route,
      supervisorVisitLabel: db.settings.supervisorVisitLabel,
      settings: {
        plannerEnabled: db.settings.plannerEnabled,
        paymentsEnabled: db.settings.paymentsEnabled,
        spendingsEnabled: db.settings.spendingsEnabled,
        tasksEnabled: db.settings.tasksEnabled,
        performanceTab: db.settings.performanceTab,
        leaderboard: db.settings.leaderboard,
        visitPhotos: db.settings.visitPhotos,
        competitorTracking: db.settings.competitorTracking,
        samplesEnabled: db.settings.samplesEnabled,
        pingMinutes: db.settings.pingMinutes,
      },
      today,
      fieldTime: ft,
      visits,
      dailyMin: user.dailyMin,
      followUps,
      accrual,
      quarter: { name: currentQuarter(), ...quarter },
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "checkin" | "checkout" | "ping", lat, lng, accuracy }
export async function POST(req: Request) {
  try {
    const user = requireUser(["rep", "supervisor", "admin"]);
    const db = getDb();
    const body = await req.json();
    const { action, lat = null, lng = null, accuracy = null } = body;
    if (action === "ping") {
      if (lat != null && lng != null) {
        db.pings.push({ id: nextId(db), userId: user.id, ts: nowIso(), lat, lng, accuracy });
        saveDb();
      }
      return Response.json({ ok: true });
    }
    if (action === "checkin" || action === "checkout") {
      db.checkins.push({
        id: nextId(db), userId: user.id, type: action === "checkin" ? "in" : "out",
        ts: nowIso(), lat, lng, accuracy,
      });
      saveDb();
      return Response.json({ ok: true, fieldTime: fieldTimeMinutes(db, user.id, todayStr()) });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

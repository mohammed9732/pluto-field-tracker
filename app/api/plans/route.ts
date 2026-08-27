import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityIds, cityName, notify, todayStr, weekStartOf } from "@/lib/compute";

function nextWeekStart(): string {
  const cur = weekStartOf(todayStr());
  const d = new Date(cur + "T12:00:00");
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "mine";
    let plans = db.plans.slice();
    if (scope === "mine") plans = plans.filter((p) => p.userId === user.id);
    else requireUser(["supervisor", "admin"]);
    plans.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const docName = (id: number) => db.doctors.find((d) => d.id === id)?.name ?? "?";
    const isSup = user.role === "supervisor";
    // Follow-ups due in the planned week — the rep should slot these in.
    const ws = nextWeekStart();
    const weekEnd = (() => { const d = new Date(ws + "T12:00:00"); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })();
    const dueFollowUps = db.visits
      .filter((v) => v.userId === user.id && v.followUpDate && v.followUpDate >= ws && v.followUpDate <= weekEnd)
      .map((v) => ({
        doctorId: v.doctorId,
        name: db.doctors.find((d) => d.id === v.doctorId)?.name ?? "?",
        date: v.followUpDate,
      }))
      .filter((f, i, arr) => arr.findIndex((x) => x.doctorId === f.doctorId) === i);
    return Response.json({
      cities: db.settings.cities,
      reps: db.users.filter((u) => u.active && u.role === "rep").map((u) => ({ id: u.id, name: u.name, city: u.city })),
      dueFollowUps,
      nextWeekStart: ws,
      targets: isSup
        ? { visit: db.settings.supervisorPlanVisitTarget, backup: db.settings.supervisorPlanBackupTarget }
        : { visit: db.settings.planVisitTarget, backup: db.settings.planBackupTarget },
      roleTargets: {
        rep: { visit: db.settings.planVisitTarget, backup: db.settings.planBackupTarget },
        supervisor: { visit: db.settings.supervisorPlanVisitTarget, backup: db.settings.supervisorPlanBackupTarget },
      },
      plans: plans.map((p) => ({
        ...p,
        userName: db.users.find((u) => u.id === p.userId)?.name ?? "?",
        userCity: db.users.find((u) => u.id === p.userId)?.city ?? "",
        totalVisits: p.days.reduce((s, d) => s + (d.doctorIds?.length || Number(d.visits) || 0), 0),
        days: p.days.map((d) => ({
          ...d,
          doctorNames: (d.doctorIds ?? []).map(docName),
          backupNames: (d.backupIds ?? []).map(docName),
          cityLabel: d.city ? cityName(db, d.city) : "",
          jointWithName: d.jointWith ? db.users.find((u) => u.id === d.jointWith)?.name ?? "" : "",
        })),
      })),
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "submit"|"decide", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const b = await req.json();
    if (b.action === "submit") {
      requireUser(["rep", "supervisor"]);
      const weekStart = String(b.weekStart ?? nextWeekStart());
      const isSupervisor = user.role === "supervisor";
      const days = (b.days ?? []).map((d: any) => {
        // Supervisors plan by city (they ride with a rep); reps plan by doctor.
        if (isSupervisor) {
          const city = d.city && cityIds(db).includes(String(d.city)) ? String(d.city) : null;
          const jointWith = d.jointWith && db.users.some((u) => u.id === Number(d.jointWith) && u.role === "rep") ? Number(d.jointWith) : null;
          // Riding with a rep = the rep's own doctor list covers the day.
          // Solo = the supervisor names the doctors he will see himself.
          const solo = !!city && !jointWith;
          const doctorIds = solo && Array.isArray(d.doctorIds)
            ? d.doctorIds.map(Number).filter((x: number) => db.doctors.some((doc) => doc.id === x && doc.city === city))
            : [];
          return {
            day: String(d.day), area: "", note: String(d.note ?? ""),
            visits: solo ? doctorIds.length : Number(d.visits) || db.settings.supervisorPlanVisitTarget,
            doctorIds, backupIds: [], city, jointWith,
          };
        }
        // Reps may only plan doctors in their own city.
        const allowed = (x: number) => db.doctors.some((doc) => doc.id === x && (user.city === "all" || doc.city === user.city));
        const doctorIds = Array.isArray(d.doctorIds) ? d.doctorIds.map(Number).filter(allowed) : [];
        const backupIds = Array.isArray(d.backupIds) ? d.backupIds.map(Number).filter((x: number) => allowed(x) && !doctorIds.includes(x)) : [];
        return {
          day: String(d.day), area: String(d.area ?? ""), note: String(d.note ?? ""),
          visits: doctorIds.length || Number(d.visits) || 0,
          doctorIds, backupIds, city: null, jointWith: null,
        };
      });
      if (isSupervisor) {
        const min = db.settings.supervisorPlanVisitTarget;
        const short = days.find((d: any) => d.city && !d.jointWith && d.doctorIds.length < min);
        if (short) {
          return Response.json({ error: `${short.day}: a solo day needs at least ${min} doctors` }, { status: 400 });
        }
      }
      let plan = db.plans.find((p) => p.userId === user.id && p.weekStart === weekStart);
      if (plan) {
        plan.days = days;
        plan.status = "submitted";
        plan.note = null;
        plan.decidedBy = null;
        plan.attachment = b.attachment ?? plan.attachment;
      } else {
        plan = {
          id: nextId(db), userId: user.id, weekStart, days, status: "submitted",
          note: null, decidedBy: null, attachment: b.attachment ?? null,
        };
        db.plans.push(plan);
      }
      // Whoever decides on this plan should know it is waiting.
      for (const a of db.users.filter((u) => u.active && (u.role === "supervisor" || u.role === "admin") && u.id !== user.id)) {
        notify(db, () => nextId(db), a.id, `${user.name} submitted a weekly plan for approval.`, "/approvals", "planStatus");
      }
      saveDb();
      return Response.json({ ok: true, plan });
    }
    if (b.action === "decide") {
      requireUser(["supervisor", "admin"]);
      const plan = db.plans.find((p) => p.id === Number(b.id));
      if (!plan || plan.status !== "submitted") return Response.json({ error: "Plan is not awaiting approval" }, { status: 400 });
      plan.status = b.decision === "approve" ? "approved" : "returned";
      plan.note = b.note ? String(b.note) : null;
      plan.decidedBy = user.id;
      notify(db, () => nextId(db), plan.userId,
        plan.status === "approved"
          ? `Your weekly plan was approved by ${user.name}.`
          : `Your weekly plan was returned by ${user.name}${plan.note ? ` — ${plan.note}` : "."}`,
        "/plan", "planStatus");
      saveDb();
      return Response.json({ ok: true, plan });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

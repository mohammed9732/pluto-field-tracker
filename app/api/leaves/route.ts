import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { notify } from "@/lib/compute";

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    // Anything that is not explicitly "approvals" is your own record. The
    // previous version fell through on an unrecognised scope and returned the
    // whole table — every employee's leave, sick-leave reasons included.
    const scope = url.searchParams.get("scope") === "approvals" ? "approvals" : "mine";
    let leaves = db.leaves.slice();
    if (scope === "mine") leaves = leaves.filter((l) => l.userId === user.id);
    else {
      requireUser(["supervisor", "admin"]);
      leaves = leaves.filter((l) => {
        const owner = db.users.find((u) => u.id === l.userId);
        if (!owner) return false;
        if (user.role === "supervisor") return owner.role === "rep";
        return owner.role !== "admin"; // admin decides supervisor + accountant (and can see reps)
      });
    }
    leaves.sort((a, b) => b.start.localeCompare(a.start));
    return Response.json({
      leaves: leaves.map((l) => ({
        ...l,
        userName: db.users.find((u) => u.id === l.userId)?.name ?? "?",
        userCity: db.users.find((u) => u.id === l.userId)?.city ?? "",
        decidedByName: l.decidedBy ? db.users.find((u) => u.id === l.decidedBy)?.name ?? "?" : null,
      })),
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "request"|"decide", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const b = await req.json();
    if (b.action === "request") {
      if (!b.start || !b.end || b.end < b.start) return Response.json({ error: "Pick valid dates" }, { status: 400 });
      const type = b.type === "sick" ? "sick" : "annual";
      if (type === "annual") {
        // Notice scales with the length of the trip: a day off needs little
        // warning, a fortnight needs the territory covered.
        const days = Math.max(1, Math.round(
          (new Date(String(b.end)).getTime() - new Date(String(b.start)).getTime()) / 86400000) + 1);
        const short = db.settings.leaveShortMaxDays ?? 2;
        const needed = days <= short
          ? (db.settings.leaveShortNoticeDays ?? 2)
          : (db.settings.leaveLongNoticeDays ?? 10);
        const minStart = new Date();
        minStart.setDate(minStart.getDate() + needed);
        if (String(b.start) < minStart.toISOString().slice(0, 10)) {
          return Response.json({
            error: `${days} day${days === 1 ? "" : "s"} of leave needs ${needed} days' notice. The earliest you can start is ${minStart.toISOString().slice(0, 10)}.`,
          }, { status: 400 });
        }
      }
      const leave = {
        id: nextId(db), userId: user.id, start: String(b.start), end: String(b.end),
        type: type as "annual" | "sick",
        reason: String(b.reason ?? ""), status: "pending" as const, decidedBy: null,
      };
      db.leaves.push(leave);
      // Leave has to be seen by someone, or it sits unanswered.
      for (const a of db.users.filter((u) => u.active && (u.role === "supervisor" || u.role === "admin") && u.id !== user.id)) {
        notify(db, () => nextId(db), a.id, `${user.name} requested leave.`, "/approvals");
      }
      saveDb();
      return Response.json({ ok: true, leave });
    }
    if (b.action === "decide") {
      requireUser(["supervisor", "admin"]);
      const leave = db.leaves.find((l) => l.id === Number(b.id));
      if (!leave || leave.status !== "pending") return Response.json({ error: "Leave not pending" }, { status: 400 });
      const owner = db.users.find((u) => u.id === leave.userId);
      if (user.role === "supervisor" && owner?.role !== "rep") return Response.json({ error: "The owner approves this one" }, { status: 403 });
      leave.status = b.decision === "approve" ? "approved" : "rejected";
      leave.decidedBy = user.id;
      notify(db, () => nextId(db), leave.userId,
        `Your ${leave.type} leave (${leave.start} to ${leave.end}) was ${leave.status} by ${user.name}.`,
        "/leave");
      saveDb();
      return Response.json({ ok: true, leave });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

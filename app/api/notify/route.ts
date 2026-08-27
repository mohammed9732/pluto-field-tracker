import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { notify, nowIso } from "@/lib/compute";

// GET → my notifications + active announcement (if unseen list wanted, client decides)
export async function GET() {
  try {
    const user = requireUser();
    const db = getDb();
    const notifications = db.notifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 40);
    const announcements = db.settings.announcementsEnabled
      ? db.announcements.filter((a) => a.active).map((a) => ({
          ...a,
          createdByName: db.users.find((u) => u.id === a.createdBy)?.name ?? "?",
          seen: a.seenBy.includes(user.id),
        }))
      : [];
    return Response.json({ notifications, unread: notifications.filter((n) => !n.read).length, announcements });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "readAll" | "seenAnnouncement" | "announce" | "stopAnnouncement", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const b = await req.json();
    if (b.action === "readAll") {
      for (const n of db.notifications) if (n.userId === user.id) n.read = true;
      saveDb();
      return Response.json({ ok: true });
    }
    if (b.action === "seenAnnouncement") {
      const a = db.announcements.find((x) => x.id === Number(b.id));
      if (a && !a.seenBy.includes(user.id)) a.seenBy.push(user.id);
      saveDb();
      return Response.json({ ok: true });
    }
    if (b.action === "announce") {
      requireUser(["admin"]);
      if (!b.body) return Response.json({ error: "Write the announcement" }, { status: 400 });
      db.announcements.push({ id: nextId(db), body: String(b.body), createdBy: user.id, ts: nowIso(), active: true, seenBy: [] });
      // Optionally straight to phones too — the ticker only reaches people
      // who happen to open the app.
      if (b.push) {
        for (const u of db.users.filter((x) => x.active && x.id !== user.id)) {
          notify(db, () => nextId(db), u.id, `📢 ${String(b.body)}`, "/", "custom");
        }
      }
      saveDb();
      return Response.json({ ok: true });
    }

    /* The owner's own megaphone — a one-off message pushed to phones.
     * Target: everyone, one role, or one person. Owner only: a supervisor
     * with a broadcast button becomes a second announcement channel, which
     * the owner said no to. */
    if (b.action === "pushMessage") {
      requireUser(["admin"]);
      const text = String(b.text ?? "").trim().slice(0, 300);
      if (!text) return Response.json({ error: "Write the message" }, { status: 400 });
      let targets = db.users.filter((u) => u.active && u.id !== user.id);
      if (b.role) targets = targets.filter((u) => u.role === String(b.role));
      if (b.userId) targets = targets.filter((u) => u.id === Number(b.userId));
      if (!targets.length) return Response.json({ error: "Nobody matches that target" }, { status: 400 });
      for (const u of targets) {
        notify(db, () => nextId(db), u.id, `💬 ${user.name}: ${text}`, "/", "custom");
      }
      saveDb();
      return Response.json({ ok: true, sent: targets.length });
    }
    if (b.action === "stopAnnouncement") {
      requireUser(["admin"]);
      const a = db.announcements.find((x) => x.id === Number(b.id));
      if (a) a.active = false;
      saveDb();
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

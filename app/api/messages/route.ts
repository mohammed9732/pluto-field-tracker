import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { nowIso } from "@/lib/compute";
import { User, DB } from "@/lib/types";

// Channels = admin-built groups the user belongs to + DMs allowed by policy.
function channelsFor(user: User, db: DB) {
  const chans: { id: string; label: string; kind: "group" | "dm"; phone?: string }[] = [];
  for (const g of db.chatGroups) {
    if (g.memberIds.includes(user.id)) chans.push({ id: `g-${g.id}`, label: g.name, kind: "group" });
  }
  const canDm = (other: User): boolean => {
    if (user.role !== "rep") return true; // management can DM anyone
    if (db.settings.dmPolicy === "all") return true;
    if (db.settings.dmPolicy === "none") return false;
    // "management": reps may DM supervisor + accountant only
    return other.role === "supervisor" || other.role === "accountant";
  };
  for (const u of db.users.filter((u) => u.active && u.id !== user.id)) {
    // both directions must be allowed
    if (!canDm(u)) continue;
    if (u.role === "rep" && user.role === "rep" && db.settings.dmPolicy !== "all") continue;
    const pair = [user.id, u.id].sort((a, b) => a - b);
    chans.push({ id: `dm-${pair[0]}-${pair[1]}`, label: u.name, kind: "dm", phone: u.phone });
  }
  return chans;
}

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    const allowed = channelsFor(user, db);
    const channel = url.searchParams.get("channel") ?? allowed[0]?.id ?? "";
    const after = Number(url.searchParams.get("after") ?? 0);
    if (!allowed.some((c) => c.id === channel)) return Response.json({ error: "No access to that channel" }, { status: 403 });
    const messages = db.messages
      .filter((m) => m.channel === channel && m.id > after)
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .slice(-100)
      .map((m) => ({ ...m, senderName: db.users.find((u) => u.id === m.senderId)?.name ?? "?", mine: m.senderId === user.id }));
    return Response.json({ channels: allowed, channel, messages, me: user.id });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const b = await req.json();
    const allowed = channelsFor(user, db).map((c) => c.id);
    const channel = String(b.channel ?? "");
    if (!allowed.includes(channel)) return Response.json({ error: "No access to that channel" }, { status: 403 });
    const kind = ["image", "file", "voice"].includes(b.kind) ? b.kind : "text";
    if (kind !== "text" && !db.settings.chatAttachments) return Response.json({ error: "Attachments are switched off" }, { status: 403 });
    const body = String(b.body ?? "").trim();
    if (!body && kind === "text") return Response.json({ error: "Empty message" }, { status: 400 });
    if (kind !== "text" && !b.fileId) return Response.json({ error: "Missing file" }, { status: 400 });
    const msg = {
      id: nextId(db), channel, senderId: user.id, body, ts: nowIso(),
      kind: kind as any, fileId: b.fileId ?? null, fileName: b.fileName ?? null,
      duration: b.duration != null ? Math.round(Number(b.duration)) : null,
    };
    db.messages.push(msg);
    saveDb();
    return Response.json({ ok: true, message: { ...msg, senderName: user.name, mine: true } });
  } catch (e) {
    return errResponse(e);
  }
}

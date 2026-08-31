import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { notifyOnce, nowIso } from "@/lib/compute";
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
    const name = (id: number) => db.users.find((u) => u.id === id)?.name ?? "?";
    const messages = db.messages
      .filter((m) => m.channel === channel && m.id > after)
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .slice(-100)
      .map((m) => {
        const orig = m.replyToId ? db.messages.find((x) => x.id === m.replyToId) : null;
        return {
          ...m, senderName: name(m.senderId), mine: m.senderId === user.id,
          replyTo: orig ? {
            id: orig.id, senderName: name(orig.senderId),
            preview: orig.kind === "text" ? orig.body.slice(0, 80) : orig.kind,
          } : null,
        };
      });
    /* Reactions travel separately from the incremental message stream: a
     * reaction lands on an OLD message, which `after` would never re-send.
     * Shipping the channel's full reaction map on every poll keeps them
     * live at trivial cost. */
    const reactions: Record<number, { emoji: string; userId: number; name: string }[]> = {};
    for (const m of db.messages.filter((x) => x.channel === channel).slice(-100)) {
      if (m.reactions?.length) reactions[m.id] = m.reactions.map((r) => ({ ...r, name: name(r.userId) }));
    }
    return Response.json({ channels: allowed, channel, messages, reactions, me: user.id });
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

    /* React to a message: one emoji per person, tap the same one to take it
     * back, a different one to change it. The set is fixed — a reaction is
     * a wink, not a message. */
    if (b.action === "react") {
      const EMOJIS = ["🤑", "💸", "😂", "❤️", "😢", "👍", "🎉"];
      const target = db.messages.find((m) => m.id === Number(b.id));
      if (!target || !allowed.includes(target.channel)) return Response.json({ error: "Message not found" }, { status: 404 });
      const emoji = String(b.emoji ?? "");
      if (!EMOJIS.includes(emoji)) return Response.json({ error: "Unknown reaction" }, { status: 400 });
      const list = target.reactions ?? [];
      const mine = list.find((r) => r.userId === user.id);
      target.reactions = mine && mine.emoji === emoji
        ? list.filter((r) => r.userId !== user.id)
        : [...list.filter((r) => r.userId !== user.id), { emoji, userId: user.id }];
      saveDb();
      return Response.json({ ok: true });
    }

    const channel = String(b.channel ?? "");
    if (!allowed.includes(channel)) return Response.json({ error: "No access to that channel" }, { status: 403 });
    const kind = ["image", "file", "voice", "meet"].includes(b.kind) ? b.kind : "text";
    if (kind !== "text" && kind !== "meet" && !db.settings.chatAttachments) return Response.json({ error: "Attachments are switched off" }, { status: 403 });
    const body = String(b.body ?? "").trim();
    if (!body && (kind === "text" || kind === "meet")) return Response.json({ error: "Empty message" }, { status: 400 });
    if (kind !== "text" && kind !== "meet" && !b.fileId) return Response.json({ error: "Missing file" }, { status: 400 });
    // A quoted reply must point at a message in the same room.
    const replyTo = b.replyToId ? db.messages.find((m) => m.id === Number(b.replyToId) && m.channel === channel) : null;
    const msg = {
      id: nextId(db), channel, senderId: user.id, body, ts: nowIso(),
      kind: kind as any, fileId: b.fileId ?? null, fileName: b.fileName ?? null,
      duration: b.duration != null ? Math.round(Number(b.duration)) : null,
      replyToId: replyTo ? replyTo.id : null,
    };
    db.messages.push(msg);
    // Everyone in the channel except the sender.
    const label = channelsFor(user, db).find((c) => c.id === channel)?.label ?? "Chat";
    const recipients = channel.startsWith("dm-")
      ? channel.split("-").slice(1).map(Number).filter((id) => id !== user.id)
      : db.chatGroups
          .filter((g) => `g-${g.id}` === channel)
          .flatMap((g) => g.memberIds)
          .filter((id) => id !== user.id);
    const preview = kind === "text"
      ? (body.length > 60 ? body.slice(0, 57) + "…" : body)
      : kind === "image" ? "sent a photo" : kind === "voice" ? "sent a voice note"
      : kind === "meet" ? "📹 started a video meeting — tap to join" : "sent a file";
    for (const id of Array.from(new Set(recipients))) {
      notifyOnce(db, () => nextId(db), id,
        channel.startsWith("dm-") ? `${user.name}: ${preview}` : `${label} · ${user.name}: ${preview}`,
        `/chat?channel=${channel}`,
        channel.startsWith("dm-") ? "dm" : "group");
    }

    saveDb();
    const orig = msg.replyToId ? db.messages.find((x) => x.id === msg.replyToId) : null;
    return Response.json({ ok: true, message: {
      ...msg, senderName: user.name, mine: true,
      replyTo: orig ? { id: orig.id, senderName: db.users.find((u) => u.id === orig.senderId)?.name ?? "?", preview: orig.kind === "text" ? orig.body.slice(0, 80) : orig.kind } : null,
    } });
  } catch (e) {
    return errResponse(e);
  }
}

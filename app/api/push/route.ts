import { getDb, saveDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { publicKey } from "@/lib/push";
import { nowIso } from "@/lib/compute";

export async function GET() {
  try {
    requireUser();
    return Response.json({ publicKey: publicKey() });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { sub } — store this browser's push subscription for the signed-in user.
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const { sub } = await req.json();
    if (!sub?.endpoint) return Response.json({ error: "Bad subscription" }, { status: 400 });
    db.pushSubs = db.pushSubs.filter((s) => s.sub?.endpoint !== sub.endpoint);
    db.pushSubs.push({ userId: user.id, sub, ts: nowIso() });
    saveDb();
    return Response.json({ ok: true });
  } catch (e) {
    return errResponse(e);
  }
}

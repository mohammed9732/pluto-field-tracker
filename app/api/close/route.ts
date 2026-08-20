import { getDb, saveDb, nextId, snapshot } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { currentPeriod, recordChange } from "@/lib/compute";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireUser();
    const db = getDb();
    return Response.json({
      closedThrough: db.settings.closedThrough,
      currentPeriod: currentPeriod(),
    });
  } catch (e) {
    return errResponse(e);
  }
}

// Closing a month freezes everything dated in it or before. Reopening is
// possible but recorded, because a reopened month is how paid payroll silently
// changes underneath you.
export async function POST(req: Request) {
  try {
    const user = requireUser(["admin"]);
    const db = getDb();
    const b = await req.json();
    const period = String(b.period ?? "");

    if (b.action === "reopen") {
      const was = db.settings.closedThrough;
      if (!was) return Response.json({ error: "Nothing is closed." }, { status: 400 });
      snapshot("before-reopen");
      db.settings.closedThrough = b.period ? String(b.period) : null;
      recordChange(db, () => nextId(db), user.id, "settings", 0, "months reopened",
        `was closed through ${was}, now ${db.settings.closedThrough ?? "nothing closed"}`);
      saveDb();
      return Response.json({ ok: true, closedThrough: db.settings.closedThrough });
    }

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return Response.json({ error: "Pick a month to close." }, { status: 400 });
    }
    if (period >= currentPeriod()) {
      return Response.json(
        { error: "You can only close a month that has finished." },
        { status: 400 },
      );
    }
    const was = db.settings.closedThrough;
    if (was && period <= was) {
      return Response.json({ error: `Already closed through ${was}.` }, { status: 400 });
    }
    snapshot("before-close");
    db.settings.closedThrough = period;
    recordChange(db, () => nextId(db), user.id, "settings", 0, "month closed",
      `closed through ${period}`);
    saveDb();
    return Response.json({ ok: true, closedThrough: period });
  } catch (e) {
    return errResponse(e);
  }
}

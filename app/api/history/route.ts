import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { doctorsFor } from "@/lib/compute";

export const dynamic = "force-dynamic";

// GET /api/history?entity=doctor&id=11 — the story of one record.
export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    const entity = String(url.searchParams.get("entity") ?? "");
    const id = Number(url.searchParams.get("id") ?? NaN);
    // 0 is a real id: company-wide settings changes are filed under it.
    if (!entity || !Number.isFinite(id)) {
      return Response.json({ error: "Nothing to look up" }, { status: 400 });
    }

    // A rep may only read the history of a record they can already see.
    if (user.role === "rep") {
      if (entity === "doctor" && !doctorsFor(db, user).some((d) => d.id === id)) {
        return Response.json({ entries: [] });
      }
      if (entity === "user" || entity === "settings" || entity === "target") {
        return Response.json({ entries: [] });
      }
    }

    const entries = (db.history ?? [])
      .filter((h) => h.entity === entity && h.entityId === id)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 60)
      .map((h) => ({ ...h, byName: db.users.find((u) => u.id === h.byId)?.name ?? "?" }));

    return Response.json({ entries });
  } catch (e) {
    return errResponse(e);
  }
}

import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { logActivity, nowIso } from "@/lib/compute";

// Shared marketing library — price lists, campaign sheets, anything not tied to one product.
export async function GET() {
  try {
    requireUser();
    const db = getDb();
    return Response.json({
      brochures: (db.brochures ?? [])
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts))
        .map((x) => ({ ...x, byName: db.users.find((u) => u.id === x.uploadedBy)?.name ?? "?" })),
    });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(["admin"]);
    const db = getDb();
    const b = await req.json();
    db.brochures = db.brochures ?? [];

    if (b.action === "delete") {
      const i = db.brochures.findIndex((x) => x.id === Number(b.id));
      if (i < 0) return Response.json({ error: "Not found" }, { status: 404 });
      db.brochures.splice(i, 1);
      saveDb();
      return Response.json({ ok: true });
    }

    if (!b.fileId) return Response.json({ error: "Upload a file first" }, { status: 400 });
    const item = {
      id: nextId(db),
      title: String(b.title ?? b.fileName ?? "Brochure").trim(),
      fileId: String(b.fileId),
      fileName: String(b.fileName ?? ""),
      mime: String(b.mime ?? ""),
      uploadedBy: user.id,
      ts: nowIso(),
    };
    db.brochures.push(item);
    logActivity(db, () => nextId(db), user.id, `uploaded brochure "${item.title}"`);
    saveDb();
    return Response.json({ ok: true, brochure: item });
  } catch (e) {
    return errResponse(e);
  }
}

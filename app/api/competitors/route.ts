import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityName, doctorsFor, nowIso } from "@/lib/compute";

// Market intel: what competitors are doing, per doctor or general.
export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    if (!db.settings.competitorTracking) return Response.json({ enabled: false, notes: [] });
    const url = new URL(req.url);
    const doctorId = url.searchParams.get("doctorId");
    const visible = new Set(doctorsFor(db, user).map((d) => d.id));
    let notes = db.competitorNotes.slice();
    // Reps see general intel plus notes about doctors in their own city.
    if (user.role === "rep") notes = notes.filter((c) => c.doctorId == null || visible.has(c.doctorId));
    if (doctorId) notes = notes.filter((c) => c.doctorId === Number(doctorId));
    notes.sort((a, b) => b.ts.localeCompare(a.ts));
    return Response.json({
      enabled: true,
      notes: notes.slice(0, 100).map((c) => {
        const doc = c.doctorId ? db.doctors.find((d) => d.id === c.doctorId) : null;
        return {
          ...c,
          doctorName: doc?.name ?? null,
          city: doc ? cityName(db, doc.city) : null,
          byName: db.users.find((u) => u.id === c.userId)?.name ?? "?",
        };
      }),
    });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    if (!db.settings.competitorTracking) return Response.json({ error: "Competitor tracking is switched off" }, { status: 403 });
    const b = await req.json();
    if (!String(b.competitor ?? "").trim()) return Response.json({ error: "Which competitor?" }, { status: 400 });
    const doctorId = b.doctorId ? Number(b.doctorId) : null;
    if (doctorId && !doctorsFor(db, user).some((d) => d.id === doctorId)) {
      return Response.json({ error: "That doctor is not in your city" }, { status: 403 });
    }
    const note = {
      id: nextId(db), doctorId, userId: user.id,
      competitor: String(b.competitor).trim(), product: String(b.product ?? "").trim(),
      price: Math.max(0, Math.round(Number(b.price) || 0)), note: String(b.note ?? "").trim(),
      visitId: null, ts: nowIso(),
    };
    db.competitorNotes.push(note);
    saveDb();
    return Response.json({ ok: true, note });
  } catch (e) {
    return errResponse(e);
  }
}

import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { closedError, isClosed, logActivity, nowIso, todayStr, visitsOn } from "@/lib/compute";

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? todayStr();
    let userId = Number(url.searchParams.get("userId") ?? user.id);
    if (user.role === "rep" && userId !== user.id) userId = user.id;
    const visits = visitsOn(db, userId, date).map((v) => ({
      ...v,
      doctor: db.doctors.find((d) => d.id === v.doctorId) ?? null,
    }));
    return Response.json({ visits, editWindowMinutes: db.settings.editWindowMinutes });
  } catch (e) {
    return errResponse(e);
  }
}

function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// PATCH { id, ...changes } / DELETE-style — a rep fixing his own recent visit.
export async function PATCH(req: Request) {
  try {
    const user = requireUser(["rep", "supervisor"]);
    const db = getDb();
    const b = await req.json();
    const visit = db.visits.find((v) => v.id === Number(b.id));
    if (!visit) return Response.json({ error: "Visit not found" }, { status: 404 });
    if (visit.userId !== user.id) return Response.json({ error: "Not your visit" }, { status: 403 });
    // A closed month cannot be corrected any more.
    if (isClosed(db, visit.date)) {
      return Response.json({ error: closedError(db) }, { status: 400 });
    }
    const ageMin = (Date.now() - new Date(`${visit.date}T${visit.time}:00`).getTime()) / 60000;
    const win = db.settings.editWindowMinutes || 60;
    if (ageMin > win) return Response.json({ error: `The ${win}-minute correction window has passed — ask your supervisor` }, { status: 400 });

    if (b.remove) {
      db.visits.splice(db.visits.indexOf(visit), 1);
      logActivity(db, () => nextId(db), user.id, `deleted his own visit #${visit.id} within the correction window`);
      saveDb();
      return Response.json({ ok: true, deleted: true });
    }
    if (b.outcome && ["order", "follow_up", "payment"].includes(b.outcome)) visit.outcome = b.outcome;
    if (b.notes != null) visit.notes = String(b.notes);
    if (b.followUpDate !== undefined) visit.followUpDate = b.followUpDate || null;
    logActivity(db, () => nextId(db), user.id, `corrected his own visit #${visit.id}`);
    saveDb();
    return Response.json({ ok: true, visit });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(["rep", "supervisor"]);
    const db = getDb();
    const b = await req.json();
    if (!b.doctorId) return Response.json({ error: "Pick a doctor" }, { status: 400 });
    if (!["order", "follow_up", "payment"].includes(b.outcome)) return Response.json({ error: "Pick an outcome" }, { status: 400 });
    if (b.outcome === "follow_up" && !b.followUpDate) return Response.json({ error: "Follow-up needs a date" }, { status: 400 });
    const now = nowIso();

    // GPS enforcement: within visitRadiusM of the clinic pin, or flagged.
    const targetDoc = db.doctors.find((d) => d.id === Number(b.doctorId));
    if (!targetDoc) return Response.json({ error: "Doctor not found" }, { status: 400 });
    let outOfLocation = false;
    let distance: number | null = null;
    if (targetDoc?.lat != null && b.lat != null && b.lng != null) {
      distance = Math.round(distM(b.lat, b.lng, targetDoc.lat, targetDoc.lng!));
      outOfLocation = distance > (db.settings.visitRadiusM || 500);
    } else if (targetDoc?.lat != null && (b.lat == null || b.lng == null)) {
      outOfLocation = true; // pin exists but rep has no GPS
    }
    // First-time pin capture keeps the visit clean.
    if (targetDoc?.lat == null && b.lat != null) outOfLocation = false;
    if (outOfLocation && !b.acceptOutOfLocation) {
      return Response.json({ needsConfirm: true, distance, radius: db.settings.visitRadiusM || 500 });
    }
    const visit = {
      id: nextId(db),
      userId: user.id,
      doctorId: Number(b.doctorId),
      date: todayStr(),
      time: now.slice(11, 16),
      jointVisit: !!b.jointVisit,
      jointWith: b.jointWith ? Number(b.jointWith) : null,
      outcome: b.outcome,
      notes: String(b.notes ?? ""),
      followUpDate: b.followUpDate ?? null,
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      photo: db.settings.visitPhotos ? b.photo ?? null : null,
      outOfLocation,
      clientRef: b.clientRef ? String(b.clientRef) : null,
    };
    // A retry of a visit that already landed must not create a second one.
    if (b.clientRef) {
      const already = db.visits.find((v) => v.clientRef === String(b.clientRef));
      if (already) return Response.json({ ok: true, visit: already, duplicate: true });
    }
    if (isClosed(db, todayStr())) {
      return Response.json({ error: closedError(db) }, { status: 400 });
    }
    db.visits.push(visit);
    // Competitor intel captured while the rep is still with the doctor.
    if (db.settings.competitorTracking && b.competitor?.competitor) {
      db.competitorNotes.push({
        id: nextId(db), doctorId: visit.doctorId, userId: user.id,
        competitor: String(b.competitor.competitor), product: String(b.competitor.product ?? ""),
        price: Math.round(Number(b.competitor.price) || 0), note: String(b.competitor.note ?? ""),
        visitId: visit.id, ts: now,
      });
    }
    if (outOfLocation) {
      const { notify } = await import("@/lib/compute");
      const { nextId: nid } = await import("@/lib/db");
      for (const w of db.users.filter((u) => u.active && (u.role === "admin" || (u.role === "supervisor" && user.role === "rep")))) {
        notify(db, () => nid(db), w.id, `⚠ Out-of-location visit: ${user.name} logged ${targetDoc?.name ?? "a visit"}${distance != null ? ` from ${distance} m away` : " without GPS"}.`, "/team");
      }
    }
    // First-visit clinic pin capture.
    if (b.setDoctorLocation && b.lat != null && b.lng != null) {
      const doc = db.doctors.find((d) => d.id === visit.doctorId);
      if (doc && doc.lat == null) {
        doc.lat = b.lat; doc.lng = b.lng;
        doc.locationSetBy = user.id; doc.locationSetAt = now;
      }
    }
    saveDb();
    const count = visitsOn(db, user.id, todayStr()).length;
    return Response.json({ ok: true, visit, todayCount: count });
  } catch (e) {
    return errResponse(e);
  }
}

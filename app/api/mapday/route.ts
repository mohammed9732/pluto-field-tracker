import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { doctorsFor, fieldTimeMinutes, todayStr, visitsOn } from "@/lib/compute";

function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Radius/interval come from admin settings at request time.

export async function GET(req: Request) {
  try {
    const user = requireUser(["supervisor", "admin", "rep", "collector"]);
    const db = getDb();
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? todayStr();
    let userId = Number(url.searchParams.get("userId") ?? user.id);
    if (user.role === "rep") userId = user.id;
    const target = db.users.find((u) => u.id === userId);
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    const checkins = db.checkins.filter((c) => c.userId === userId && c.ts.startsWith(date)).sort((a, b) => a.ts.localeCompare(b.ts));
    const pings = db.pings.filter((p) => p.userId === userId && p.ts.startsWith(date)).sort((a, b) => a.ts.localeCompare(b.ts));
    const visits = visitsOn(db, userId, date).map((v) => ({ ...v, doctor: db.doctors.find((d) => d.id === v.doctorId) ?? null }));
    const pinned = db.doctors.filter((d) => d.lat != null && d.lng != null);

    // Dwell: attribute each ping to the nearest clinic pin within the configured radius.
    const RADIUS = db.settings.dwellRadiusM || 150;
    const PING_MINUTES = db.settings.pingMinutes || 5;
    const dwell = new Map<number, number>();
    let travelPings = 0;
    for (const p of pings) {
      let best: { id: number; d: number } | null = null;
      for (const doc of pinned) {
        const d = distM(p.lat, p.lng, doc.lat!, doc.lng!);
        if (d <= RADIUS && (!best || d < best.d)) best = { id: doc.id, d };
      }
      if (best) dwell.set(best.id, (dwell.get(best.id) ?? 0) + PING_MINUTES);
      else travelPings++;
    }
    const ft = fieldTimeMinutes(db, userId, date);
    const hasStarted = db.checkins.some((c) => c.userId === userId && c.type === "in" && c.ts.startsWith(date));
    const atClinics = Array.from(dwell.values()).reduce((s, m) => s + m, 0);
    const dwellRows = Array.from(dwell.entries()).map(([docId, minutes]) => ({
      doctorId: docId,
      doctorName: db.doctors.find((d) => d.id === docId)?.name ?? "?",
      minutes,
    }));

    return Response.json({
      date, userName: target.name, city: target.city,
      fieldTime: ft,
      hasStarted,
      checkins, pings, visits,
      // Every clinic pin the viewer is entitled to, so a rep can see which
      // doctors are near them rather than only the ones already visited today.
      // Scoped through doctorsFor for the same reason the profile bundle is:
      // this is the customer book, and a rep should not see another city's.
      doctorPins: doctorsFor(db, user)
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => ({ id: d.id, name: d.name, clinic: d.clinic, lat: d.lat, lng: d.lng, class: d.class })),
      dwell: dwellRows,
      atClinicsMinutes: atClinics,
      travelMinutes: travelPings * PING_MINUTES,
      outsideMinutes: Math.max(0, ft.minutes - atClinics - travelPings * PING_MINUTES),
    });
  } catch (e) {
    return errResponse(e);
  }
}

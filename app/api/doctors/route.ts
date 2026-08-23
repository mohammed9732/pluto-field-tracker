import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityIds, currentPeriod, doctorsFor, nowIso, recordChange } from "@/lib/compute";

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const idParam = new URL(req.url).searchParams.get("id");
    if (!idParam) {
      return Response.json({
        doctors: doctorsFor(db, user),
        cities: db.settings.cities,
        scopedToCity: user.role === "rep" && user.city !== "all" ? user.city : null,
        canAdd:
          user.role === "admin" ||
          (user.role === "supervisor" && db.settings.supervisorCanAddDoctors) ||
          (user.role === "rep" && db.settings.repsCanAddDoctors),
      });
    }
    // Profile bundle. The territory rule has to be enforced here too, not only in
    // the list above: this bundle carries prices, payment amounts and receipt photo
    // ids, so without the check any rep could walk the id range and copy the whole
    // customer book, including cities that are not theirs.
    const doctor = doctorsFor(db, user).find((d) => d.id === Number(idParam));
    if (!doctor) return Response.json({ error: "Doctor not found" }, { status: 404 });
    const orderTotal = (o: any) => o.items.reduce((s: number, it: any) => s + it.qty * it.price, 0);
    const visits = db.visits
      .filter((v) => v.doctorId === doctor.id)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .map((v) => ({ ...v, byName: db.users.find((u) => u.id === v.userId)?.name ?? "?" }));
    const orders = db.orders
      .filter((o) => o.doctorId === doctor.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({
        id: o.id, createdAt: o.createdAt, status: o.status,
        invoicePdfId: o.invoicePdfId, invoicePdfName: o.invoicePdfName,
        total: orderTotal(o),
        byName: db.users.find((u) => u.id === o.createdBy)?.name ?? "?",
        items: o.items.map((it) => ({ qty: it.qty, name: db.products.find((p) => p.id === it.productId)?.name ?? "?" })),
      }));
    const payments = db.payments
      .filter((p) => p.doctorId === doctor.id)
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .map((p) => ({ ...p, byName: db.users.find((u) => u.id === p.collectedBy)?.name ?? "?" }));
    const visitCounts: Record<string, number> = {};
    for (const v of db.visits.filter((v) => v.doctorId === doctor.id)) {
      const name = db.users.find((u) => u.id === v.userId)?.name ?? "?";
      visitCounts[name] = (visitCounts[name] ?? 0) + 1;
    }
    const lastOrder = db.orders.filter((o) => o.doctorId === doctor.id && o.status !== "rejected").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
    const period = currentPeriod();
    const monthValue = db.orders
      .filter((o) => o.doctorId === doctor.id && !o.isSample && (o.status === "approved" || o.status === "invoiced") && o.createdAt.slice(0, 7) === period)
      .reduce((s, o) => s + o.items.reduce((x, it) => x + it.qty * it.price, 0), 0);
    const competitors = db.competitorNotes
      .filter((c) => c.doctorId === doctor.id)
      .sort((a, b2) => b2.ts.localeCompare(a.ts))
      .map((c) => ({ ...c, byName: db.users.find((u) => u.id === c.userId)?.name ?? "?" }));
    const privateNote = db.privateNotes.find(
      (n) => n.doctorId === doctor.id && n.userId === user.id) ?? null;
    return Response.json({
      doctor, visits, orders, payments, competitors,
      // Only ever this person's own note. It is deliberately not keyed by role:
      // a supervisor reading their rep's private notes would defeat the point.
      privateNote: privateNote ? { body: privateNote.body, ts: privateNote.ts } : null,
      monthValue, potentialMonthly: doctor.potentialMonthly ?? 0,
      totalCollected: payments.reduce((s, p) => s + p.amount, 0),
      lifetimeValue: orders.filter((o) => o.status === "approved" || o.status === "invoiced").reduce((s, o) => s + o.total, 0),
      visitCounts,
      lastOrderItems: lastOrder ? lastOrder.items.map((it) => ({ productId: it.productId, qty: it.qty })) : null,
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "add" | "update" | "setLocation" | "import", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const b = await req.json();

    if (b.action === "setLocation") {
      requireUser(["rep", "supervisor", "admin"]);
      const doc = db.doctors.find((d) => d.id === Number(b.id));
      if (!doc) return Response.json({ error: "Doctor not found" }, { status: 404 });
      // Reps may only set a missing pin; supervisor/admin can correct it.
      if (user.role === "rep" && doc.lat != null) return Response.json({ error: "Pin already set — ask your supervisor to correct it" }, { status: 403 });
      doc.lat = b.lat; doc.lng = b.lng;
      doc.locationSetBy = user.id; doc.locationSetAt = nowIso();
      saveDb();
      return Response.json({ ok: true, doctor: doc });
    }

    if (b.action === "add" || b.action === "update") {
      requireUser(["supervisor", "admin", "rep"]);
      if (b.action === "add") {
        if (user.role === "supervisor" && !db.settings.supervisorCanAddDoctors) return Response.json({ error: "Adding doctors is switched off for supervisors" }, { status: 403 });
        if (user.role === "rep" && !db.settings.repsCanAddDoctors) return Response.json({ error: "Adding doctors is switched off for reps — ask your supervisor" }, { status: 403 });
      }
      if (b.action === "update") {
        requireUser(["supervisor", "admin"]);
        const doc = db.doctors.find((d) => d.id === Number(b.id));
        if (!doc) return Response.json({ error: "Doctor not found" }, { status: 404 });
        const next = {
          name: b.name ?? doc.name, clinic: b.clinic ?? doc.clinic, city: b.city ?? doc.city,
          area: b.area ?? doc.area, address: b.address ?? doc.address, class: b.class ?? doc.class,
          specialty: b.specialty ?? doc.specialty, phone: b.phone ?? doc.phone,
          secretaryPhone: b.secretaryPhone ?? doc.secretaryPhone ?? "",
          potentialMonthly: b.potentialMonthly != null ? Math.max(0, Math.round(Number(b.potentialMonthly))) : doc.potentialMonthly,
        };
        // Record each field that actually moved, in words the owner can read.
        const labels: Record<string, string> = {
          name: "Name", clinic: "Clinic", city: "City", area: "Area", address: "Address",
          class: "Class", specialty: "Specialty", phone: "Phone",
          secretaryPhone: "Secretary phone", potentialMonthly: "Monthly potential",
        };
        for (const [k, v] of Object.entries(next)) {
          const before = (doc as any)[k];
          if (String(before ?? "") === String(v ?? "")) continue;
          recordChange(db, () => nextId(db), user.id, "doctor", doc.id, `${labels[k] ?? k} changed`,
            `${before || "(empty)"} → ${v || "(empty)"}`);
        }
        Object.assign(doc, next);
        saveDb();
        return Response.json({ ok: true, doctor: doc });
      }
      if (!b.name) return Response.json({ error: "Name required" }, { status: 400 });
      const wantCity = String(b.city ?? user.city ?? "").toLowerCase();
      if (!cityIds(db).includes(wantCity)) return Response.json({ error: "Pick a valid city" }, { status: 400 });
      // Reps may only add doctors in their own city.
      if (user.role === "rep" && user.city !== "all" && wantCity !== user.city) {
        return Response.json({ error: "You can only add doctors in your own city" }, { status: 403 });
      }
      const doc = {
        id: nextId(db), name: b.name, clinic: b.clinic ?? "", city: wantCity,
        area: b.area ?? "", address: b.address ?? "", class: (b.class ?? "B") as "A" | "B" | "C", specialty: b.specialty ?? "Dermatologist",
        phone: b.phone ?? "", secretaryPhone: b.secretaryPhone ?? "",
        potentialMonthly: Math.max(0, Math.round(Number(b.potentialMonthly) || 0)),
        lat: b.lat ?? null, lng: b.lng ?? null,
        locationSetBy: b.lat != null ? user.id : null, locationSetAt: b.lat != null ? new Date().toISOString().slice(0, 19) : null, createdBy: user.id,
      };
      db.doctors.push(doc);
      saveDb();
      return Response.json({ ok: true, doctor: doc });
    }

    if (b.action === "privateNote") {
      // One note per person per doctor, overwritten in place. Reps asked for a
      // scratchpad ("prefers mornings", "haggles on price"), not a thread.
      const doc = doctorsFor(db, user).find((d) => d.id === Number(b.doctorId));
      if (!doc) return Response.json({ error: "Doctor not found" }, { status: 404 });
      const body = String(b.body ?? "").slice(0, 2000);
      const existing = db.privateNotes.find((n) => n.doctorId === doc.id && n.userId === user.id);
      if (!body.trim()) {
        // Clearing the box deletes the note rather than storing an empty one.
        db.privateNotes = db.privateNotes.filter((n) => !(n.doctorId === doc.id && n.userId === user.id));
      } else if (existing) {
        existing.body = body; existing.ts = nowIso();
      } else {
        db.privateNotes.push({ id: nextId(db), userId: user.id, doctorId: doc.id, body, ts: nowIso() });
      }
      saveDb();
      return Response.json({ ok: true });
    }

    if (b.action === "import") {
      requireUser(["supervisor", "admin"]);
      // rows: [{name, clinic, city, area, specialty, class, phone}]
      const errors: string[] = [];
      let added = 0;
      for (let i = 0; i < (b.rows ?? []).length; i++) {
        const r = b.rows[i];
        if (!r.name || !String(r.name).trim()) { errors.push(`Row ${i + 2}: missing doctor name — skipped`); continue; }
        const cls = String(r.class ?? "B").toUpperCase();
        if (!["A", "B", "C"].includes(cls)) { errors.push(`Row ${i + 2}: class "${r.class}" not A/B/C — skipped`); continue; }
        db.doctors.push({
          id: nextId(db), name: String(r.name).trim(), clinic: String(r.clinic ?? "").trim(),
          city: String(r.city ?? "erbil").trim().toLowerCase(), area: String(r.area ?? "").trim(),
          address: String(r.address ?? "").trim(), potentialMonthly: Math.max(0, Math.round(Number(r.potential) || 0)),
          class: cls as "A" | "B" | "C", specialty: String(r.specialty ?? "").trim() || "Dermatologist",
          phone: String(r.phone ?? "").trim(), secretaryPhone: String(r.secretaryPhone ?? r.secretary ?? "").trim(),
          lat: null, lng: null,
          locationSetBy: null, locationSetAt: null, createdBy: user.id,
        });
        added++;
      }
      saveDb();
      return Response.json({ ok: true, added, errors });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

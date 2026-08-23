import { getDb, saveDb, nextId, snapshot, UPLOAD_DIR } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { buildEmpty, buildSeed } from "@/lib/seed";
import { recordChange } from "@/lib/compute";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Wiping is irreversible, so a labelled backup is written first, every time,
// whether or not anyone asked for one.
export async function POST(req: Request) {
  try {
    const user = requireUser(["admin"]);
    const b = await req.json();

    const mode = b.mode === "everything" ? "everything" : "records";

    const db = getDb();

    // Fill an empty company with the demo world so it can be shown in training.
    // Branding is kept — the sample data is there to demonstrate YOUR app, not a
    // generic one — but the cities and people come from the demo, because the
    // sample doctors and orders refer to them.
    if (b.action === "loadDemo") {
      snapshot("before-sample-data");
      const demo = buildSeed();
      const keep = db.settings;
      const owner = db.users.find((u) => u.id === user.id);

      // The branding survives below, so the files behind it have to survive
      // too — settings holds ids, and an id whose StoredFile is gone is a 404.
      const brandingIds = [keep.logoId, keep.mascotIdleId, keep.mascotHelloId,
                           keep.mascotCheerId, keep.mascotSadId].filter(Boolean) as string[];
      const brandingFiles = db.files.filter((f) => brandingIds.includes(f.id));

      Object.assign(db, demo);
      db.files = [...brandingFiles, ...db.files.filter((f) => !brandingIds.includes(f.id))];
      db.settings = {
        ...demo.settings,
        companyName: keep.companyName,
        companySub: keep.companySub,
        loginFooter: keep.loginFooter,
        logoId: keep.logoId,
        brandColor: keep.brandColor,
        terms: keep.terms,
        mascotIdleId: keep.mascotIdleId,
        mascotHelloId: keep.mascotHelloId,
        mascotCheerId: keep.mascotCheerId,
        mascotSadId: keep.mascotSadId,
        closedThrough: null,
      };
      // The real owner takes over the demo owner's seat, so their phone and
      // password still work and every sample record still points at someone.
      const demoAdmin = db.users.find((u) => u.role === "admin");
      let signOut = false;
      if (demoAdmin && owner) {
        demoAdmin.name = owner.name;
        demoAdmin.phone = owner.phone;
        demoAdmin.password = owner.password;
        signOut = demoAdmin.id !== owner.id;
      }
      recordChange(db, () => nextId(db), user.id, "settings", 0, "sample data loaded", null);
      saveDb();
      return Response.json({
        ok: true, signOut,
        counts: {
          users: db.users.length, doctors: db.doctors.length,
          orders: db.orders.length, visits: db.visits.length,
        },
      });
    }

    if (String(b.confirm ?? "").trim().toUpperCase() !== "DELETE") {
      return Response.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
    }
    const backup = snapshot(mode === "everything" ? "before-full-wipe" : "before-record-wipe");

    const cleared = {
      doctors: db.doctors.length,
      orders: db.orders.length,
      visits: db.visits.length,
      payments: db.payments.length,
      messages: db.messages.length,
      users: 0,
      products: 0,
    };

    // Records everyone wants gone after a training run.
    db.doctors = [];
    db.orders = [];
    db.visits = [];
    db.payments = [];
    db.checkins = [];
    db.pings = [];
    db.messages = [];
    db.plans = [];
    db.tasks = [];
    db.spendings = [];
    db.leaves = [];
    db.notifications = [];
    db.announcements = [];
    db.deductions = [];
    db.activity = [];
    db.competitorNotes = [];
    db.stockChecks = [];
    db.stockTransfers = [];
    db.stockUploads = [];
    db.targets = [];
    db.payoutsPaid = [];
    db.payrollPaid = [];
    db.stock = [];

    if (mode === "everything") {
      cleared.users = Math.max(0, db.users.length - 1);
      cleared.products = db.products.length;
      // Keep the signed-in owner, or nobody could get back in.
      db.users = db.users.filter((u) => u.id === user.id);
      db.products = [];
      db.brochures = [];
      const fresh = buildEmpty();
      db.chatGroups = fresh.chatGroups.map((g) => ({ ...g, memberIds: [user.id] }));
    } else {
      // Keep staff and the catalogue; just empty their group chats.
      db.chatGroups = db.chatGroups.map((g) => ({ ...g, memberIds: g.memberIds }));
    }

    // Uploaded files are only referenced by the records we just deleted.
    const keep = new Set<string>();
    for (const p of db.products) {
      if (p.imageId) keep.add(p.imageId);
      if (p.brochureId) keep.add(p.brochureId);
    }
    for (const br of db.brochures) if (br.fileId) keep.add(br.fileId);
    // Branding survives a wipe, so its files must too. Missing the mascot slots
    // here deleted the artwork off disk while leaving the ids in settings —
    // the mascot silently reverted to the built-in drawing.
    for (const id of [db.settings.logoId, db.settings.mascotIdleId,
                      db.settings.mascotHelloId, db.settings.mascotCheerId,
                      db.settings.mascotSadId]) {
      if (id) keep.add(id);
    }

    let filesRemoved = 0;
    for (const f of db.files) {
      if (keep.has(f.id)) continue;
      try {
        const p = path.join(UPLOAD_DIR, f.id);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        filesRemoved++;
      } catch {}
    }
    db.files = db.files.filter((f) => keep.has(f.id));

    db.pushSubs = [];
    saveDb();

    return Response.json({ ok: true, mode, backup, cleared, filesRemoved });
  } catch (e) {
    return errResponse(e);
  }
}

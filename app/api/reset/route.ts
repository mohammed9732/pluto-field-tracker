import { getDb, saveDb, snapshot, UPLOAD_DIR } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { buildEmpty } from "@/lib/seed";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Wiping is irreversible, so a labelled backup is written first, every time,
// whether or not anyone asked for one.
export async function POST(req: Request) {
  try {
    const user = requireUser(["admin"]);
    const b = await req.json();

    if (String(b.confirm ?? "").trim().toUpperCase() !== "DELETE") {
      return Response.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
    }
    const mode = b.mode === "everything" ? "everything" : "records";

    const db = getDb();
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
    if (db.settings.logoId) keep.add(db.settings.logoId);

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

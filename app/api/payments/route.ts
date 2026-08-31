import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { closedError, doctorsFor, isClosed, logActivity, notify, nowIso, recordChange, todayStr } from "@/lib/compute";

// Payments are standalone records: doctor + amount + method + photo of the signed
// physical receipt. Deliberately NOT linked to invoices — the ERP owns balances.
export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    const doctorId = url.searchParams.get("doctorId");
    let payments = db.payments.slice().sort((a, b) => b.ts.localeCompare(a.ts));
    if (user.role === "rep") payments = payments.filter((p) => p.collectedBy === user.id);
    if (doctorId) payments = payments.filter((p) => p.doctorId === Number(doctorId));
    return Response.json({
      payments: payments.map((p) => ({
        ...p,
        doctorName: db.doctors.find((d) => d.id === p.doctorId)?.name ?? "?",
        clinic: db.doctors.find((d) => d.id === p.doctorId)?.clinic ?? "",
        collectedByName: db.users.find((u) => u.id === p.collectedBy)?.name ?? "?",
        isToday: p.ts.startsWith(todayStr()),
      })),
    });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(["rep", "supervisor", "accountant", "admin"]);
    const db = getDb();
    const b = await req.json();

    /* The accountant's correction path. Wrong amount or wrong method typed
     * in the field happens; the fix is an edit that leaves a trail, not a
     * delete. The reason is mandatory and goes on the record, the collector
     * is told, and any scheduled collection this payment closed is
     * recalculated so its shortfall flag stays honest. */
    if (b.action === "edit") {
      requireUser(["accountant", "admin"]);
      const p = db.payments.find((x) => x.id === Number(b.id));
      if (!p) return Response.json({ error: "Payment not found" }, { status: 404 });
      if (isClosed(db, p.ts)) return Response.json({ error: closedError(db) }, { status: 400 });
      const reason = String(b.reason ?? "").trim();
      if (!reason) return Response.json({ error: "Say why it is being corrected — it goes on the record" }, { status: 400 });
      const amount = Math.round(Number(String(b.amount ?? "").replace(/,/g, "")));
      if (!(amount > 0)) return Response.json({ error: "Enter the corrected amount" }, { status: 400 });
      const method = (b.method === "transfer" ? "transfer" : "cash") as "cash" | "transfer";
      const changes: string[] = [];
      if (amount !== p.amount) changes.push(`amount ${p.amount.toLocaleString()} → ${amount.toLocaleString()}`);
      if (method !== p.method) changes.push(`method ${p.method} → ${method}`);
      if (!changes.length) return Response.json({ ok: true, unchanged: true });
      p.amount = amount;
      p.method = method;
      const linked = db.collections.find((c) => c.paymentId === p.id);
      if (linked) {
        linked.collectedAmount = amount;
        linked.shortfall = amount < linked.amount;
      }
      recordChange(db, () => nextId(db), user.id, "payment", p.id, "corrected",
        `${changes.join(", ")} — ${reason}`);
      logActivity(db, () => nextId(db), user.id, `corrected payment ${p.ref}: ${changes.join(", ")}`);
      if (p.collectedBy !== user.id) {
        notify(db, () => nextId(db), p.collectedBy,
          `Your payment ${p.ref} was corrected by ${user.name}: ${changes.join(", ")} (${reason}).`, "/orders?tab=payments", "payment");
      }
      saveDb();
      return Response.json({ ok: true });
    }

    const doctor = db.doctors.find((d) => d.id === Number(b.doctorId));
    if (!doctor) return Response.json({ error: "Pick a doctor" }, { status: 400 });
    // Reps may only record payments for doctors in their own city.
    if (!doctorsFor(db, user).some((d) => d.id === doctor.id)) {
      return Response.json({ error: "That doctor is not in your city" }, { status: 403 });
    }
    const amount = Math.round(Number(b.amount));
    if (!(amount > 0)) return Response.json({ error: "Enter the amount collected" }, { status: 400 });
    if (db.settings.paymentReceiptRequired && !b.photo) {
      return Response.json({ error: "Photo of the signed receipt is required" }, { status: 400 });
    }

    if (b.clientRef) {
      const already = db.payments.find((p) => p.clientRef === String(b.clientRef));
      if (already) {
        return Response.json({
          ok: true, duplicate: true,
          payment: { ...already, doctorName: doctor.name, clinic: doctor.clinic, collectedByName: user.name },
        });
      }
    }
    const year = todayStr().slice(0, 4);
    const seqNo = db.payments.filter((p) => p.ts.startsWith(year)).length + 148;
    const payment = {
      id: nextId(db),
      ref: `PAY-${String(seqNo).padStart(4, "0")}`,
      doctorId: doctor.id,
      amount,
      method: (b.method === "transfer" ? "transfer" : "cash") as "cash" | "transfer",
      note: String(b.note ?? ""),
      collectedBy: user.id,
      ts: nowIso(),
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      photo: b.photo ?? null,
      clientRef: b.clientRef ? String(b.clientRef) : null,
    };
    if (isClosed(db, payment.ts)) {
      return Response.json({ error: closedError(db) }, { status: 400 });
    }
    db.payments.push(payment);

    /* Close the matching scheduled collection, if one is open.
     *
     * Match = same customer, same collector, due today or overdue; oldest
     * first, so a backlog clears in order. Per the owner's rule the item
     * closes whatever the amount — a partial closes it with a shortfall flag,
     * and the accountant decides about the remainder by looking at the flag,
     * not by the app rescheduling on its own. */
    const open = db.collections
      .filter((c) => c.status === "due" && c.doctorId === doctor.id && c.repId === user.id && c.date <= todayStr())
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (open) {
      open.status = "done";
      open.collectedAmount = amount;
      open.paymentId = payment.id;
      open.shortfall = amount < open.amount;
      if (open.shortfall) {
        for (const a of db.users.filter((u) => u.active && (u.role === "accountant" || u.role === "admin"))) {
          notify(db, () => nextId(db), a.id,
            `Shortfall: ${user.name} collected ${amount.toLocaleString()} of ${open.amount.toLocaleString()} IQD scheduled from ${doctor.name}${open.invoiceNo ? ` (invoice ${open.invoiceNo})` : ""}.`,
            "/acct/collections", "payment");
        }
      }
    }

    recordChange(db, () => nextId(db), user.id, "payment", payment.id, "recorded",
      `${amount.toLocaleString()} IQD from ${doctor.name}`);
    logActivity(db, () => nextId(db), user.id, `recorded ${amount.toLocaleString()} IQD from ${doctor.name}`);
    // Money coming in is the accountant's business, and the owner's.
    for (const a of db.users.filter((u) => u.active && (u.role === "accountant" || u.role === "admin") && u.id !== user.id)) {
      notify(db, () => nextId(db), a.id,
        `${user.name} collected ${amount.toLocaleString()} IQD from ${doctor.name}.`, "/acct", "payment");
    }
    saveDb();
    return Response.json({
      ok: true,
      payment: { ...payment, doctorName: doctor.name, clinic: doctor.clinic, collectedByName: user.name },
    });
  } catch (e) {
    return errResponse(e);
  }
}

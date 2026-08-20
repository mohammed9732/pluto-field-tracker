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
    recordChange(db, () => nextId(db), user.id, "payment", payment.id, "recorded",
      `${amount.toLocaleString()} IQD from ${doctor.name}`);
    logActivity(db, () => nextId(db), user.id, `recorded ${amount.toLocaleString()} IQD from ${doctor.name}`);
    // Money coming in is the accountant's business, and the owner's.
    for (const a of db.users.filter((u) => u.active && (u.role === "accountant" || u.role === "admin") && u.id !== user.id)) {
      notify(db, () => nextId(db), a.id,
        `${user.name} collected ${amount.toLocaleString()} IQD from ${doctor.name}.`, "/acct");
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

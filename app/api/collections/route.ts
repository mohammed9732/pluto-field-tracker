import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { doctorsFor, notify, nowIso, todayStr } from "@/lib/compute";

export const dynamic = "force-dynamic";

/* The collection schedule — point 4 of the owner's list.
 *
 * The accountant tells a rep to collect a specific amount from a specific
 * customer on a specific day, against an invoice number typed off the paper
 * invoice. The rep sees their list; recording a payment closes the item
 * whatever the amount came to — a partial closes it with a shortfall flag,
 * and whether to chase the remainder is the accountant's decision, made
 * looking at the flag, not something the app schedules on its own.
 *
 * An item whose date passes uncollected is flagged missed to the accountant.
 * Nothing rolls forward automatically: an automatic roll-over would quietly
 * bury a missed collection inside tomorrow's list, which is exactly where
 * the accountant does not want it hiding.
 */

function enrich(db: ReturnType<typeof getDb>, c: any) {
  const doc = db.doctors.find((d) => d.id === c.doctorId);
  return {
    ...c,
    doctorName: doc?.name ?? "?",
    clinic: doc?.clinic ?? "",
    city: doc?.city ?? "",
    repName: db.users.find((u) => u.id === c.repId)?.name ?? "?",
  };
}

// Marks overdue items missed, once, and tells the accountant. Runs on every
// read rather than on a timer — a JSON-file app has no cron, and the moment
// somebody looks is the moment the flag matters.
function flagMissed(db: ReturnType<typeof getDb>) {
  const today = todayStr();
  let changed = false;
  for (const c of db.collections) {
    if (c.status === "due" && c.date < today && !c.missedFlagged) {
      c.missedFlagged = true;
      changed = true;
      const doc = db.doctors.find((d) => d.id === c.doctorId);
      const rep = db.users.find((u) => u.id === c.repId);
      for (const a of db.users.filter((u) => u.active && (u.role === "accountant" || u.role === "admin"))) {
        notify(db, () => nextId(db), a.id,
          `⚠ Collection missed: ${rep?.name ?? "?"} did not collect ${c.amount.toLocaleString()} IQD from ${doc?.name ?? "?"} (due ${c.date}).`,
          "/acct/collections", "collection");
      }
    }
  }
  if (changed) saveDb();
}

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    flagMissed(db);
    const url = new URL(req.url);
    const isMgmt = user.role === "accountant" || user.role === "admin";

    if (isMgmt || user.role === "supervisor") {
      // Management sees everything; supervisors see it read-only for their team.
      const from = url.searchParams.get("from") ?? "";
      const to = url.searchParams.get("to") ?? "";
      const rows = db.collections
        .filter((c) => (!from || c.date >= from) && (!to || c.date <= to))
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
        .map((c) => enrich(db, c));
      return Response.json({
        rows,
        canEdit: isMgmt,
        reps: db.users.filter((u) => u.active && (u.role === "rep" || u.role === "supervisor"))
          .map((u) => ({ id: u.id, name: u.name, city: u.city })),
      });
    }

    // A rep: their own items — today's and upcoming prominent, recent history under.
    const today = todayStr();
    const mine = db.collections.filter((c) => c.repId === user.id);
    return Response.json({
      today: mine.filter((c) => c.status === "due" && c.date <= today).map((c) => enrich(db, c)),
      upcoming: mine.filter((c) => c.status === "due" && c.date > today)
        .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map((c) => enrich(db, c)),
      done: mine.filter((c) => c.status === "done")
        .sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 10).map((c) => enrich(db, c)),
      canEdit: false,
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "create" | "delete", ... } — accountant and owner only.
export async function POST(req: Request) {
  try {
    const user = requireUser(["accountant", "admin"]);
    const db = getDb();
    const b = await req.json();

    if (b.action === "create") {
      const doctor = db.doctors.find((d) => d.id === Number(b.doctorId));
      if (!doctor) return Response.json({ error: "Pick a customer" }, { status: 400 });
      const rep = db.users.find((u) => u.id === Number(b.repId) && u.active);
      if (!rep) return Response.json({ error: "Pick who collects it" }, { status: 400 });
      // The rep must actually be able to reach this customer.
      if (!doctorsFor(db, rep).some((d) => d.id === doctor.id)) {
        return Response.json({ error: `${doctor.name} is not in ${rep.name}'s city` }, { status: 400 });
      }
      const amount = Math.round(Number(String(b.amount ?? "").replace(/,/g, "")) || 0);
      if (!(amount > 0)) return Response.json({ error: "Enter the amount to collect" }, { status: 400 });
      const date = String(b.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Pick a date" }, { status: 400 });
      if (date < todayStr()) return Response.json({ error: "That date has already passed" }, { status: 400 });

      const item = {
        id: nextId(db), doctorId: doctor.id, repId: rep.id, date, amount,
        invoiceNo: String(b.invoiceNo ?? "").trim(),
        note: String(b.note ?? "").slice(0, 300),
        status: "due" as const,
        collectedAmount: null, paymentId: null,
        shortfall: false, missedFlagged: false,
        createdBy: user.id, ts: nowIso(),
      };
      db.collections.push(item);
      // A reschedule carries the id of the item it replaces: scheduling the
      // remainder is what "dealing with" a shortfall means, so the old flag
      // stands down by itself.
      if (b.afterId) {
        const prev = db.collections.find((c) => c.id === Number(b.afterId));
        if (prev) prev.attended = true;
      }
      notify(db, () => nextId(db), rep.id,
        `Collection scheduled: ${amount.toLocaleString()} IQD from ${doctor.name} on ${date}${item.invoiceNo ? ` (invoice ${item.invoiceNo})` : ""}.`,
        "/collections", "collection");
      saveDb();
      return Response.json({ ok: true, item: enrich(db, item) });
    }

    /* Take an item off the needs-attention list without touching the record.
     * Used directly ("I have decided to let this go") and by reschedule
     * ("the remainder now has its own new item"). */
    if (b.action === "dismiss") {
      const item = db.collections.find((c) => c.id === Number(b.id));
      if (!item) return Response.json({ error: "Not found" }, { status: 404 });
      item.attended = true;
      saveDb();
      return Response.json({ ok: true });
    }

    if (b.action === "delete") {
      const item = db.collections.find((c) => c.id === Number(b.id));
      if (!item) return Response.json({ error: "Not found" }, { status: 404 });
      // Only an item still open — a done item is a record of money received.
      if (item.status !== "due") return Response.json({ error: "Already collected — it stays on the record" }, { status: 400 });
      db.collections = db.collections.filter((c) => c.id !== item.id);
      saveDb();
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

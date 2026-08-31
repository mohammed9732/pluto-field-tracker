import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { doctorsFor } from "@/lib/compute";

export const dynamic = "force-dynamic";

/* The documents library — point 6 of the owner's list.
 *
 * Every invoice PDF and every receipt photo, in one searchable place.
 * Always open to the accountant and the owner; a control-panel switch opens
 * it to supervisors and reps — reps scoped to their own customers, because
 * receipts carry amounts and the customer book is city-scoped everywhere
 * else in the app.
 *
 * Documents older than two years are archived: hidden from the everyday
 * list, retrievable the moment someone searches with "include archive" —
 * storage is cheap, and the tax office does not phone ahead.
 */
export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();

    const isMgmt = user.role === "accountant" || user.role === "admin";
    if (!isMgmt && !db.settings.docLibraryForField) {
      return Response.json({ error: "The documents library is switched off for field staff" }, { status: 403 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const kind = url.searchParams.get("kind") ?? "all"; // invoices | receipts | deliveries | all
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const includeArchive = url.searchParams.get("archive") === "1";

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);
    const archiveBefore = cutoff.toISOString().slice(0, 10);

    // Reps and supervisors see their own territory's customers only.
    const visible = new Set(doctorsFor(db, user).map((d) => d.id));
    const docName = (id: number) => db.doctors.find((d) => d.id === id)?.name ?? "?";
    const userName = (id: number) => db.users.find((u) => u.id === id)?.name ?? "?";

    type Row = {
      kind: "invoice" | "receipt" | "delivery";
      date: string; fileId: string; fileName: string;
      doctorId: number; doctorName: string; byName: string;
      amount: number; refNo: string; archived: boolean;
    };
    const rows: Row[] = [];

    if (kind === "all" || kind === "invoices") {
      for (const o of db.orders) {
        if (!o.invoicePdfId) continue;
        if (!isMgmt && !visible.has(o.doctorId)) continue;
        const date = o.createdAt.slice(0, 10);
        rows.push({
          kind: "invoice", date,
          fileId: o.invoicePdfId, fileName: o.invoicePdfName ?? "invoice.pdf",
          doctorId: o.doctorId, doctorName: docName(o.doctorId), byName: userName(o.createdBy),
          amount: o.items.reduce((s, it) => s + it.qty * it.price, 0),
          refNo: `#${o.id}`, archived: date < archiveBefore,
        });
      }
    }
    if (kind === "all" || kind === "deliveries") {
      // Stamped, signed invoices photographed at the door — proof of delivery.
      for (const o of db.orders) {
        if (!o.deliveryPhotoId || !o.deliveredAt) continue;
        if (!isMgmt && !visible.has(o.doctorId)) continue;
        const date = o.deliveredAt.slice(0, 10);
        rows.push({
          kind: "delivery", date,
          fileId: o.deliveryPhotoId, fileName: `order-${o.id}-delivered.jpg`,
          doctorId: o.doctorId, doctorName: docName(o.doctorId), byName: userName(o.deliveredBy ?? o.createdBy),
          amount: o.items.reduce((s, it) => s + it.qty * it.price, 0),
          refNo: `#${o.id}`, archived: date < archiveBefore,
        });
      }
    }
    if (kind === "all" || kind === "receipts") {
      for (const p of db.payments) {
        if (!p.photo) continue;
        if (!isMgmt && !visible.has(p.doctorId)) continue;
        const date = p.ts.slice(0, 10);
        rows.push({
          kind: "receipt", date,
          fileId: p.photo, fileName: `${p.ref}.jpg`,
          doctorId: p.doctorId, doctorName: docName(p.doctorId), byName: userName(p.collectedBy),
          amount: p.amount, refNo: p.ref, archived: date < archiveBefore,
        });
      }
    }

    const filtered = rows
      .filter((r) => includeArchive || !r.archived)
      .filter((r) => !from || r.date >= from)
      .filter((r) => !to || r.date <= to)
      .filter((r) => !q
        || r.doctorName.toLowerCase().includes(q)
        || r.refNo.toLowerCase().includes(q)
        || r.byName.toLowerCase().includes(q)
        || String(r.amount).includes(q.replace(/,/g, "")))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 300);

    const archivedCount = rows.filter((r) => r.archived).length;
    return Response.json({ rows: filtered, archivedCount, includeArchive });
  } catch (e) {
    return errResponse(e);
  }
}

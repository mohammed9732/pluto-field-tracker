import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { availableStock, ceilingStatus, cityName, closedError, doctorsFor, isClosed, logActivity, notify, nowIso, orderTotal, priceForQty, productsFor, recordChange, sellerLocation } from "@/lib/compute";
import { OrderItem } from "@/lib/types";

function enrich(db: ReturnType<typeof getDb>, o: any) {
  return {
    ...o,
    total: orderTotal(o),
    isSample: !!o.isSample,
    doctor: db.doctors.find((d) => d.id === o.doctorId) ?? null,
    createdByName: db.users.find((u) => u.id === o.createdBy)?.name ?? "?",
    createdByCity: db.users.find((u) => u.id === o.createdBy)?.city ?? "erbil",
    approvedByName: o.approvedBy ? db.users.find((u) => u.id === o.approvedBy)?.name ?? "?" : null,
    deliveredByName: o.deliveredBy ? db.users.find((u) => u.id === o.deliveredBy)?.name ?? "?" : null,
    items: o.items.map((it: OrderItem) => ({
      ...it,
      productName: db.products.find((p) => p.id === it.productId)?.name ?? "?",
      listPrice: db.products.find((p) => p.id === it.productId)?.unitPrice ?? it.price,
    })),
  };
}

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "mine";
    let orders = db.orders.slice();
    if (user.role === "collector") {
      // A collector's order list IS the delivery round: invoiced orders for
      // customers they can reach — undelivered first.
      const visible = new Set(doctorsFor(db, user).map((d) => d.id));
      orders = orders.filter((o) => o.status === "invoiced" && visible.has(o.doctorId));
    } else if (scope === "mine" || user.role === "rep") {
      orders = orders.filter((o) => o.createdBy === user.id);
    } else if (scope === "pending") {
      requireUser(["supervisor", "admin"]);
      orders = orders.filter((o) => o.status === "pending");
    } else if (scope === "queue") {
      requireUser(["accountant", "admin"]);
      orders = orders.filter((o) => o.status === "approved");
    } else if (scope === "all") {
      requireUser(["supervisor", "admin", "accountant"]);
    }
    orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Response.json({ orders: orders.map((o) => enrich(db, o)) });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "create"|"approve"|"reject"|"invoice"|"attachPdf", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const b = await req.json();

    if (b.action === "create") {
      requireUser(["rep", "supervisor"]);
      // A retry of something that already landed: hand back what we stored
      // rather than billing the doctor twice.
      if (b.clientRef) {
        const already = db.orders.find((o) => o.clientRef === String(b.clientRef));
        if (already) return Response.json({ ok: true, order: enrich(db, already), duplicate: true });
      }
      const isSample = !!b.isSample && db.settings.samplesEnabled;

      /* The ceiling. Checked before anything is built: a rep at a red
       * customer is refused outright; supervisor and owner may pass — the
       * override is a decision someone senior takes knowingly, and it is
       * theirs to take, so it is role-gated rather than confirm-gated. */
      if (!isSample && b.doctorId) {
        const cs = ceilingStatus(db, Number(b.doctorId));
        if (cs.level === "red" && user.role === "rep") {
          return Response.json({
            error: `This customer has reached their sales ceiling (${cs.used.toLocaleString()} of ${cs.ceiling.toLocaleString()} IQD outstanding). It reopens when they pay down the balance — or ask your supervisor.`,
          }, { status: 400 });
        }
      }

      /* The order screen already filters by product line, so an item from
       * another line means either a stale screen or a hand-made request. The
       * line is a commercial boundary — commission is paid on it — so it is
       * checked here rather than trusted to the client.
       *
       * Checked before the items are built, not inside the loop: a throw in
       * there is caught as a generic 500 and the rep is told "Server error"
       * instead of which product is the problem.
       */
      const allowed = new Set(productsFor(db, user).map((p) => p.id));
      const offLine = (b.items ?? [])
        .filter((it: any) => Number(it.qty) > 0 && !allowed.has(Number(it.productId)))
        .map((it: any) => db.products.find((p) => p.id === Number(it.productId))?.name ?? `#${it.productId}`);
      if (offLine.length) {
        return Response.json(
          { error: `${offLine.join(", ")} ${offLine.length === 1 ? "is" : "are"} not on your product line` },
          { status: 400 },
        );
      }
      const items: OrderItem[] = (b.items ?? [])
        .filter((it: any) => Number(it.qty) > 0)
        .map((it: any) => {
          const product = db.products.find((p) => p.id === Number(it.productId));
          if (!product) throw new Error("Unknown product");
          const qty = Number(it.qty);
          const tierPrice = priceForQty(product, qty);
          // Samples are always free; otherwise reps may only override when allowed.
          const price = isSample
            ? 0
            : db.settings.repPriceEdit && it.price != null && Number(it.price) > 0 ? Number(it.price) : tierPrice;
          return { productId: product.id, qty, price };
        });
      if (!items.length) return Response.json({ error: "Add at least one product" }, { status: 400 });
      if (!b.doctorId) return Response.json({ error: "Pick a doctor" }, { status: 400 });
      /* No selling what the warehouse cannot deliver. Available = on hand in
       * the seller's city minus what other not-yet-invoiced orders already
       * claim, so two orders cannot race for the same boxes. Applies to reps
       * AND supervisors — the block protects the warehouse, not the rank. */
      if (!isSample) {
        const loc = sellerLocation(db, user.id);
        for (const it of items) {
          const a = availableStock(db, it.productId, loc);
          if (it.qty > a.available) {
            const pname = db.products.find((pp) => pp.id === it.productId)?.name ?? "?";
            return Response.json({
              error: `Only ${Math.max(0, a.available)} × ${pname} available in ${cityName(db, loc)} (${a.onHand} on hand, ${a.reserved} promised to other orders). Ask for a stock transfer first.`,
            }, { status: 400 });
          }
        }
      }
      /* The owner's rule: a supervisor's own order needs no second
       * signature. It is born approved and goes straight to the accountant's
       * queue — the old separation-of-duties block meant Dr. Alan could not
       * move his own orders at all. Reps still need supervisor approval, and
       * sample requests still go through approval whoever raises them. */
      const auto = user.role === "supervisor" && !isSample;
      const order = {
        id: nextId(db), doctorId: Number(b.doctorId), createdBy: user.id, createdAt: nowIso(),
        status: auto ? ("approved" as const) : ("pending" as const), isSample, items,
        clientRef: b.clientRef ? String(b.clientRef) : null,
        approvedBy: auto ? user.id : null, approvedAt: auto ? nowIso() : null, rejectNote: null,
        invoicePdfName: null, invoicePdfId: null, invoicedBy: null, invoicedAt: null,
      };
      if (isClosed(db, order.createdAt)) {
        return Response.json({ error: closedError(db) }, { status: 400 });
      }
      db.orders.push(order);
      if (auto) {
        const docName = db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?";
        for (const a of db.users.filter((u) => u.active && (u.role === "accountant" || u.role === "admin")))
          notify(db, () => nextId(db), a.id, `Order from ${user.name} for ${docName} is ready to invoice.`, "/acct/queue", "orderNew");
      } else {
        const approvers = db.users.filter((u) => u.active && (u.role === "supervisor" || u.role === "admin") && u.id !== user.id);
        for (const a of approvers) notify(db, () => nextId(db), a.id, `New ${isSample ? "SAMPLE request" : "order"} from ${user.name} awaits approval.`, "/approvals", "orderNew");
      }
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    const order = db.orders.find((o) => o.id === Number(b.id));
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    if (b.action === "approve" || b.action === "reject") {
      requireUser(["supervisor", "admin"]);
      // Separation of duties. A supervisor may raise orders, so without this they
      // could approve their own and — since approval is what books revenue — write
      // their own sales figures and their own commission.
      if (order.createdBy === user.id) {
        return Response.json(
          { error: "You cannot approve your own order. Ask the owner to review it." },
          { status: 403 },
        );
      }
      if (order.status !== "pending") return Response.json({ error: "Order is not pending" }, { status: 400 });
      // Approving is what books revenue, so it must respect a closed month even
      // though the order itself was raised earlier.
      if (isClosed(db, order.createdAt)) {
        return Response.json({ error: closedError(db) }, { status: 400 });
      }
      if (b.action === "reject") {
        if (!b.note) return Response.json({ error: "Rejection needs a note" }, { status: 400 });
        order.status = "rejected";
        order.rejectNote = String(b.note);
        order.approvedBy = user.id;
        order.approvedAt = nowIso();
      } else {
        // Approver may adjust prices before approving. Record what was changed so
        // the edit is reviewable later — the screen promises a snapshot, so keep one.
        if (Array.isArray(b.prices) && !order.isSample) {
          for (const p of b.prices) {
            const it = order.items.find((x) => x.productId === Number(p.productId));
            const next = Number(p.price);
            if (it && next > 0 && next !== it.price) {
              recordChange(db, () => nextId(db), user.id, "order", order.id, "price changed",
                `${db.products.find((p) => p.id === it.productId)?.name ?? "item"}: ${it.price.toLocaleString()} → ${next.toLocaleString()}`);
              (order.priceEdits ??= []).push({
                productId: it.productId, from: it.price, to: next,
                by: user.id, at: nowIso(),
              });
              it.price = next;
            }
          }
        }
        order.status = "approved";
        order.approvedBy = user.id;
        order.approvedAt = nowIso();
      }
      recordChange(db, () => nextId(db), user.id, "order", order.id,
        order.status === "approved" ? "approved" : "returned",
        order.rejectNote ? `Note: ${order.rejectNote}` : null);
      notify(db, () => nextId(db), order.createdBy, `Your order for ${db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?"} was ${order.status} by ${user.name}.`, "/orders", "orderStatus");
      logActivity(db, () => nextId(db), user.id, `${order.status} order #${order.id}`);
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    /* The accountant bounces a wrong APPROVED order back to pending.
     * Distinct from "reject" (supervisor-only, pending-only): this is the
     * person about to raise a real invoice noticing a wrong price or absent
     * stock. A note is required — an order returning with no reason teaches
     * the rep nothing. */
    if (b.action === "return") {
      requireUser(["accountant", "admin"]);
      if (order.status !== "approved") return Response.json({ error: "Only an approved order can be returned" }, { status: 400 });
      const note = String(b.note ?? "").trim();
      if (!note) return Response.json({ error: "Say why it is coming back" }, { status: 400 });
      order.status = "pending";
      order.rejectNote = note;
      recordChange(db, () => nextId(db), user.id, "order", order.id, "returned from invoicing", note);
      const doctorName = db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?";
      for (const s of db.users.filter((u) => u.active && (u.role === "supervisor" || u.role === "admin"))) {
        notify(db, () => nextId(db), s.id, `${user.name} returned the order for ${doctorName} from invoicing: ${note}`, "/approvals", "orderStatus");
      }
      notify(db, () => nextId(db), order.createdBy, `Order for ${doctorName} was returned before invoicing: ${note}`, "/orders", "orderStatus");
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    if (b.action === "invoice") {
      requireUser(["accountant", "admin"]);
      if (order.status !== "approved") return Response.json({ error: "Order must be approved first" }, { status: 400 });
      // The signed invoice PDF is the document of record — no PDF, no invoice.
      if (!order.invoicePdfId && !b.pdfId) {
        return Response.json({ error: "Attach the invoice PDF first — invoicing without the document is closed." }, { status: 400 });
      }
      // Decrement the SELLER'S city stock — and never below zero. Stock that
      // would go negative means the paper and the shelf disagree; that gets
      // fixed with a transfer or a count, not by invoicing through it.
      const loc = sellerLocation(db, order.createdBy);
      const short: string[] = [];
      for (const it of order.items) {
        const have = db.stock.find((x) => x.productId === it.productId && x.location === loc)?.qty ?? 0;
        if (have < it.qty) short.push(`${db.products.find((p) => p.id === it.productId)?.name ?? "?"}: ${have} in ${cityName(db, loc)}, order needs ${it.qty}`);
      }
      if (short.length) {
        return Response.json({ error: `Not enough stock — ${short.join("; ")}. Move stock first.` }, { status: 400 });
      }
      for (const it of order.items) {
        const s = db.stock.find((x) => x.productId === it.productId && x.location === loc)!;
        s.qty -= it.qty;
        s.updatedAt = nowIso();
        s.updatedBy = user.id;
      }
      order.status = "invoiced";
      order.invoicedBy = user.id;
      order.invoicedAt = nowIso();
      if (b.pdfName) order.invoicePdfName = String(b.pdfName);
      if (b.pdfId) order.invoicePdfId = String(b.pdfId);
      notify(db, () => nextId(db), order.createdBy, `Order for ${db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?"} is invoiced${order.invoicePdfName ? " — invoice attached." : "."}`, "/orders", "orderStatus");
      logActivity(db, () => nextId(db), user.id, `invoiced order #${order.id}`);
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    /* Delivery. The rep (or a collector on delivery duty) hands the boxes
     * over, the doctor stamps and signs the paper invoice, and the photo of
     * that stamped invoice is the proof: required, filed in the documents
     * library, and announced to the accountant. */
    if (b.action === "delivered") {
      requireUser(["rep", "collector", "supervisor", "admin"]);
      if (order.status !== "invoiced") return Response.json({ error: "Only an invoiced order can be delivered" }, { status: 400 });
      if (order.deliveredAt) return Response.json({ error: "Already marked delivered" }, { status: 400 });
      if (!b.photoId) return Response.json({ error: "Photo of the stamped invoice is required" }, { status: 400 });
      if (order.createdBy !== user.id && user.role !== "admin"
        && !doctorsFor(db, user).some((d) => d.id === order.doctorId)) {
        return Response.json({ error: "Not your customer" }, { status: 403 });
      }
      order.deliveredAt = nowIso();
      order.deliveredBy = user.id;
      order.deliveryPhotoId = String(b.photoId);
      const docName2 = db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?";
      for (const a of db.users.filter((u) => u.active && (u.role === "accountant" || u.role === "admin") && u.id !== user.id)) {
        notify(db, () => nextId(db), a.id, `${user.name} delivered order #${order.id} to ${docName2} — stamped invoice photo attached.`, "/docs", "orderStatus");
      }
      logActivity(db, () => nextId(db), user.id, `delivered order #${order.id} to ${docName2}`);
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    /* The accountant's undo. An order invoiced by mistake goes back to the
     * queue: the stock returns to the seller's warehouse, the PDF stays
     * attached (re-invoicing should not need a re-upload), and the change
     * is written to the record — an undo is never an eraser. Once the order
     * is delivered, or the month is closed, the door is shut. */
    if (b.action === "uninvoice") {
      requireUser(["accountant", "admin"]);
      if (order.status !== "invoiced") return Response.json({ error: "Order is not invoiced" }, { status: 400 });
      if (order.deliveredAt) return Response.json({ error: "Already delivered — use Return instead, the goods are out" }, { status: 400 });
      if (isClosed(db, order.invoicedAt ?? order.createdAt)) {
        return Response.json({ error: closedError(db) }, { status: 400 });
      }
      const loc = sellerLocation(db, order.createdBy);
      for (const it of order.items) {
        let s = db.stock.find((x) => x.productId === it.productId && x.location === loc);
        if (!s) {
          s = { productId: it.productId, location: loc, qty: 0, batch: null, expiry: null, updatedAt: nowIso(), updatedBy: user.id };
          db.stock.push(s);
        }
        s.qty += it.qty;
        s.updatedAt = nowIso();
        s.updatedBy = user.id;
      }
      order.status = "approved";
      order.invoicedBy = null;
      order.invoicedAt = null;
      recordChange(db, () => nextId(db), user.id, "order", order.id, "invoice undone",
        `stock returned to ${cityName(db, loc)}`);
      notify(db, () => nextId(db), order.createdBy,
        `The invoice on order #${order.id} was undone by ${user.name} — it is back in the queue.`, "/orders", "orderStatus");
      logActivity(db, () => nextId(db), user.id, `undid the invoice on order #${order.id}`);
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    if (b.action === "attachPdf") {
      requireUser(["accountant", "admin"]);
      order.invoicePdfName = String(b.pdfName ?? "invoice.pdf");
      if (b.pdfId) order.invoicePdfId = String(b.pdfId);
      if (order.status === "invoiced") {
        notify(db, () => nextId(db), order.createdBy, `Invoice attached for ${db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?"}.`, "/orders", "orderStatus");
      }
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    if (b.action === "editMine" || b.action === "deleteMine") {
      if (order.createdBy !== user.id) return Response.json({ error: "Not your order" }, { status: 403 });
      if (order.status !== "pending") return Response.json({ error: "Already decided — ask your supervisor" }, { status: 400 });
      const ageMin = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
      const win = db.settings.editWindowMinutes || 60;
      if (ageMin > win) return Response.json({ error: `The ${win}-minute correction window has passed — ask your supervisor` }, { status: 400 });
      if (b.action === "deleteMine") {
        db.orders.splice(db.orders.indexOf(order), 1);
        logActivity(db, () => nextId(db), user.id, `deleted his own order #${order.id} within the correction window`);
        saveDb();
        return Response.json({ ok: true, deleted: true });
      }
      // The same boundaries the create path enforces. Without them the
      // correction window was a way round every one of them: place a valid
      // order, then edit it into another line's products.
      if (isClosed(db, order.createdAt.slice(0, 10))) {
        return Response.json({ error: closedError(db) }, { status: 400 });
      }
      const editable = new Set(productsFor(db, user).filter((p) => p.active).map((p) => p.id));
      const rejected = (b.items ?? [])
        .filter((it: any) => Number(it.qty) > 0 && !editable.has(Number(it.productId)))
        .map((it: any) => db.products.find((p) => p.id === Number(it.productId))?.name ?? `#${it.productId}`);
      if (rejected.length) {
        return Response.json(
          { error: `${rejected.join(", ")} ${rejected.length === 1 ? "is" : "are"} not on your product line` },
          { status: 400 },
        );
      }
      const items: OrderItem[] = (b.items ?? [])
        .filter((it: any) => Number(it.qty) > 0)
        .map((it: any) => {
          const product = db.products.find((p) => p.id === Number(it.productId));
          if (!product) throw new Error("Unknown product");
          const qty = Number(it.qty);
          return { productId: product.id, qty, price: order.isSample ? 0 : priceForQty(product, qty) };
        });
      if (!items.length) return Response.json({ error: "Add at least one product" }, { status: 400 });
      if (!order.isSample) {
        const loc2 = sellerLocation(db, user.id);
        for (const it of items) {
          const a = availableStock(db, it.productId, loc2, order.id);
          if (it.qty > a.available) {
            return Response.json({ error: `Only ${Math.max(0, a.available)} × ${db.products.find((pp) => pp.id === it.productId)?.name ?? "?"} available in ${cityName(db, loc2)}` }, { status: 400 });
          }
        }
      }
      order.items = items;
      logActivity(db, () => nextId(db), user.id, `corrected his own order #${order.id}`);
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}

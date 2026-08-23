import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { closedError, isClosed, logActivity, notify, nowIso, orderTotal, priceForQty, productsFor, recordChange, stockCityIds } from "@/lib/compute";
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
    if (scope === "mine" || user.role === "rep") {
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
      const order = {
        id: nextId(db), doctorId: Number(b.doctorId), createdBy: user.id, createdAt: nowIso(),
        status: "pending" as const, isSample, items,
        clientRef: b.clientRef ? String(b.clientRef) : null,
        approvedBy: null, approvedAt: null, rejectNote: null,
        invoicePdfName: null, invoicePdfId: null, invoicedBy: null, invoicedAt: null,
      };
      if (isClosed(db, order.createdAt)) {
        return Response.json({ error: closedError(db) }, { status: 400 });
      }
      db.orders.push(order);
      const approvers = db.users.filter((u) => u.active && (u.role === "supervisor" || u.role === "admin") && u.id !== user.id);
      for (const a of approvers) notify(db, () => nextId(db), a.id, `New ${isSample ? "SAMPLE request" : "order"} from ${user.name} awaits approval.`, "/approvals");
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
      notify(db, () => nextId(db), order.createdBy, `Your order for ${db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?"} was ${order.status} by ${user.name}.`, "/orders");
      logActivity(db, () => nextId(db), user.id, `${order.status} order #${order.id}`);
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order) });
    }

    if (b.action === "invoice") {
      requireUser(["accountant", "admin"]);
      if (order.status !== "approved") return Response.json({ error: "Order must be approved first" }, { status: 400 });
      // Decrement the SELLER'S stock: Duhok/Kirkuk reps sell from their city stock, everyone else from the main warehouse.
      const seller = db.users.find((u) => u.id === order.createdBy);
      const loc = seller && stockCityIds(db).includes(seller.city) ? seller.city : "main";
      const warnings: string[] = [];
      for (const it of order.items) {
        const product = db.products.find((p) => p.id === it.productId);
        let s = db.stock.find((x) => x.productId === it.productId && x.location === loc);
        if (!s) {
          s = { productId: it.productId, location: loc as any, qty: 0, batch: null, expiry: null, updatedAt: nowIso(), updatedBy: user.id };
          db.stock.push(s);
        }
        s.qty -= it.qty;
        s.updatedAt = nowIso();
        s.updatedBy = user.id;
        if (s.qty < 0) warnings.push(`${product?.name ?? "?"} ${loc} stock is now ${s.qty}`);
      }
      order.status = "invoiced";
      order.invoicedBy = user.id;
      order.invoicedAt = nowIso();
      if (b.pdfName) order.invoicePdfName = String(b.pdfName);
      if (b.pdfId) order.invoicePdfId = String(b.pdfId);
      notify(db, () => nextId(db), order.createdBy, `Order for ${db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?"} is invoiced${order.invoicePdfName ? " — invoice attached." : "."}`, "/orders");
      logActivity(db, () => nextId(db), user.id, `invoiced order #${order.id}`);
      saveDb();
      return Response.json({ ok: true, order: enrich(db, order), warnings });
    }

    if (b.action === "attachPdf") {
      requireUser(["accountant", "admin"]);
      order.invoicePdfName = String(b.pdfName ?? "invoice.pdf");
      if (b.pdfId) order.invoicePdfId = String(b.pdfId);
      if (order.status === "invoiced") {
        notify(db, () => nextId(db), order.createdBy, `Invoice attached for ${db.doctors.find((d) => d.id === order.doctorId)?.name ?? "?"}.`, "/orders");
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
      const items: OrderItem[] = (b.items ?? [])
        .filter((it: any) => Number(it.qty) > 0)
        .map((it: any) => {
          const product = db.products.find((p) => p.id === Number(it.productId));
          if (!product) throw new Error("Unknown product");
          const qty = Number(it.qty);
          return { productId: product.id, qty, price: order.isSample ? 0 : priceForQty(product, qty) };
        });
      if (!items.length) return Response.json({ error: "Add at least one product" }, { status: 400 });
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

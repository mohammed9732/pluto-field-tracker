"use client";
import { openImage } from "@/components/Lightbox";
import { MascotNote } from "@/components/MascotNote";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, hm, money } from "@/lib/fmt";
import { compressImage } from "@/lib/image";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

/* Print = load the invoice PDF into an invisible iframe and hand it to the
 * print dialog. Browsers that refuse (iOS is fussy about printing another
 * document) get the PDF opened instead — the share sheet there has Print. */
function printInvoice(fileId: string) {
  const url = `/api/files?id=${fileId}`;
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  f.src = url;
  f.onload = () => {
    try { f.contentWindow?.focus(); f.contentWindow?.print(); }
    catch { window.open(url, "_blank"); }
  };
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 120000);
}

const STATUS_TAG: Record<string, [string, string]> = {
  pending: ["Awaiting approval", "tag-warn"],
  approved: ["Approved", "tag-ok"],
  invoiced: ["Invoiced", "tag-chat"],
  rejected: ["Rejected", "tag-hot"],
};

function OrdersInner() {
  const tx = useT();
  const me = useMe();
  const params = useSearchParams();
  const [tab, setTab] = useState<"orders" | "payments">(params.get("tab") === "payments" ? "payments" : "orders");
  const [orders, setOrders] = useState<any[] | null>(null);
  const [payments, setPayments] = useState<any[] | null>(null);
  // Which order the stamped-invoice photo being picked belongs to.
  const [deliverFor, setDeliverFor] = useState<number | null>(null);
  const [delivering, setDelivering] = useState(false);
  const deliverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ orders: any[] }>("/api/orders?scope=mine").then((r) => setOrders(r.orders)).catch(() => {});
    api<{ payments: any[] }>("/api/payments").then((r) => setPayments(r.payments)).catch(() => {});
  }, []);
  if (!me || !orders) return <Spinner />;
  // A rep whose collection duty is off has no payments tab at all.
  const collects = !(me.role === "rep" && (me as any).canCollect === false);
  const isCollector = me.role === "collector";

  /* Delivery: pick (or shoot) the stamped invoice, compress it, upload it,
   * and only then does the order flip to Delivered — the photo IS the proof,
   * so there is no photo-less path. */
  async function onDeliverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || deliverFor == null) return;
    setDelivering(true);
    try {
      const file = await compressImage(f);
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
      if (!up.id) throw new Error("The photo did not upload. Try again.");
      await api("/api/orders", { json: { action: "delivered", id: deliverFor, photoId: up.id } });
      api<{ orders: any[] }>("/api/orders?scope=mine").then((r) => setOrders(r.orders)).catch(() => {});
    } catch (err: any) {
      alert(err?.message || "Could not mark it delivered");
    } finally {
      setDelivering(false);
      setDeliverFor(null);
    }
  }

  const today = payments?.filter((p) => p.isToday) ?? [];
  const todayTotal = today.reduce((s, p) => s + p.amount, 0);

  return (
    <Screen me={me}>
      <div className="row">
        <h4 className="m0 f1">{tab === "orders" ? (isCollector ? tx("orders.deliveries", "Deliveries") : tx("orders.myOrders", "My orders")) : tx("orders.payments", "Payments")}</h4>
        {tab === "orders"
          ? (isCollector ? null : <Link href="/order" className="btn btn-ghost fs-small">＋ New order</Link>)
          : <Link href="/pay" className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>＋ Record</Link>}
      </div>
      <input ref={deliverRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onDeliverFile} />
      {collects ? (
      <div className="seg" style={{ width: "100%" }}>
        <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
          <input type="radio" name="otab" checked={tab === "orders"} onChange={() => setTab("orders")} />{tx("orders.orders", "Orders")}
        </label>
        <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
          <input type="radio" name="otab" checked={tab === "payments"} onChange={() => setTab("payments")} />{tx("orders.payments", "Payments")}
        </label>
      </div>
      ) : null}

      {tab === "orders" ? (
        <>
          {orders.length === 0 ? (
            <MascotNote title={tx("orders.noOrdersYetPh", "No orders yet")}
              body="Log a visit first, then turn it into an order. Rafi will let you know the moment it is approved."
              action={{ href: "/order", label: "Start an order" }} />
          ) : null}
          {orders.some((o: any) => o.status === "rejected") ? (
            <MascotNote mood="sad" tone="sorry" size={58}
              title={`${orders.filter((o: any) => o.status === "rejected").length} order came back`}
              body="Open it and read the note underneath — fix what was flagged and send it again. It happens to everyone." />
          ) : null}
          {orders.some((o) => o.status === "approved" || o.status === "invoiced") ? (
            <MascotNote mood="cheer" tone="win" size={58}
              title={`${orders.filter((o: any) => o.status === "approved" || o.status === "invoiced").length} approved`}
              body="Nice work. Approved orders count toward your target and your commission." />
          ) : null}
          {orders.map((o) => (
            <div key={o.id} className="card" style={{ gap: 6, padding: 12 }}>
              <div className="row gap-3">
                <div className="f1min">
                  <div className="fs-small w-500"><DoctorLink id={o.doctor?.id} name={o.doctor?.name ?? "?"} /></div>
                  <div className="small muted">
                    {dmy(o.createdAt)} · {o.items.length} product{o.items.length === 1 ? "" : "s"}
                    {o.invoicePdfName ? " · invoice attached" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                  {o.isSample
                    ? <span className="tag" style={{ background: "var(--c-violet-soft)", color: "var(--c-violet-deep)" }}>FREE SAMPLE</span>
                    : <span className="hnum" style={{ fontSize: 16 }}>{money(o.total)}</span>}
                  <span className={`tag ${STATUS_TAG[o.status][1]}`}>{STATUS_TAG[o.status][0]}</span>
                </div>
              </div>
              <div className="small muted">
                {o.items.map((it: any) => `${it.qty} × ${it.productName}`).join(" · ")}
              </div>
              {o.status === "rejected" && o.rejectNote ? (
                <div className="small muted" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 6 }}>
                  {o.approvedByName ?? "Supervisor"}: &quot;{o.rejectNote}&quot;
                </div>
              ) : null}
              {o.status === "invoiced" && o.invoicePdfId ? (
                <div className="row" style={{ gap: 14, borderTop: "1px solid var(--color-divider)", paddingTop: 6 }}>
                  <a className="small" href={"/api/files?id=" + o.invoicePdfId} target="_blank">
                    {tx("orders.invoiceAttachedOpen", "Invoice attached — open")}
                  </a>
                  <a className="small w-500" href="#" onClick={(e) => { e.preventDefault(); printInvoice(o.invoicePdfId); }}>
                    🖨 {tx("orders.printInvoice", "Print")}
                  </a>
                </div>
              ) : null}
              {/* Delivery. The doctor stamps and signs the paper invoice; the
                  photo of it is the proof — no photo, no Delivered. */}
              {o.status === "invoiced" ? (
                o.deliveredAt ? (
                  <div className="row" style={{ gap: 10, alignItems: "center", borderTop: "1px solid var(--color-divider)", paddingTop: 6 }}>
                    <span className="tag tag-ok">✓ {tx("orders.delivered", "Delivered")} {dmy(o.deliveredAt)}</span>
                    {o.deliveredByName && o.deliveredBy !== me.id ? <span className="small muted">{o.deliveredByName}</span> : null}
                    {o.deliveryPhotoId ? (
                      <a className="small" href="#" onClick={(e) => { e.preventDefault(); openImage(`/api/files?id=${o.deliveryPhotoId}`); }}>
                        {tx("orders.stampedInvoice", "stamped invoice")}
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <button className="btn btn-secondary" disabled={delivering}
                    style={{ fontSize: 12.5, padding: "8px 12px", borderColor: "var(--c-green)", color: "var(--c-green-deep)" }}
                    onClick={() => { setDeliverFor(o.id); deliverRef.current?.click(); }}>
                    📷 {delivering && deliverFor === o.id ? tx("orders.uploading", "Uploading…") : tx("orders.markDelivered", "Delivered — photo the stamped invoice")}
                  </button>
                )
              ) : null}
            </div>
          ))}
          <div className="hint" style={{ textAlign: "center", marginTop: "auto" }}>
            Approval by supervisor or owner · invoicing by the accountant — statuses update instantly.
          </div>
        </>
      ) : (
        <>
          {today.length ? (
            <div className="blueprint" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--c-green-deep)" }}>{tx("orders.collectedToday", "Collected today")}</div>
              <span className="hnum fs-figure">{money(todayTotal)}</span>
              <span className="small muted">{today.length} receipt{today.length === 1 ? "" : "s"}</span>
            </div>
          ) : null}
          {(payments ?? []).length === 0 ? (
            <MascotNote title={tx("orders.nothingCollectedYetPh", "Nothing collected yet")}
              body="Record a payment while you are still with the doctor — photograph the signed receipt and it is done."
              action={{ href: "/pay", label: "Record a payment" }} />
          ) : null}
          {(payments ?? []).map((p) => (
            <div key={p.id} className="listrow">
              <div className="f1min">
                <div className="fs-small w-500"><DoctorLink id={p.doctorId} name={p.doctorName} /></div>
                <div className="small muted">
                  {me.role === "rep" ? "" : `by ${p.collectedByName} · `}{dmy(p.ts)} {hm(p.ts)} · {p.method}{p.note ? ` · ${p.note}` : ""}
                </div>
              </div>
              {p.photo ? <a className="small" href="#" onClick={(e) => { e.preventDefault(); openImage(`/api/files?id=${p.photo}`); }}>receipt</a> : null}
              <span className="hnum fs-body">{money(p.amount)}</span>
            </div>
          ))}
          <div className="hint" style={{ textAlign: "center", marginTop: "auto" }}>
            Every payment is logged with GPS, time and the signed receipt photo. The accountant enters it in the accounting system.
          </div>
        </>
      )}
    </Screen>
  );
}

export default function Orders() {
  return (
    <Suspense fallback={<Spinner />}>
      <OrdersInner />
    </Suspense>
  );
}

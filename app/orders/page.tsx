"use client";
import { MascotNote } from "@/components/MascotNote";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, hm, money } from "@/lib/fmt";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

const STATUS_TAG: Record<string, [string, string]> = {
  pending: ["Awaiting approval", "tag-warn"],
  approved: ["Approved", "tag-ok"],
  invoiced: ["Invoiced", "tag-chat"],
  rejected: ["Rejected", "tag-hot"],
};

function OrdersInner() {
  const me = useMe();
  const params = useSearchParams();
  const [tab, setTab] = useState<"orders" | "payments">(params.get("tab") === "payments" ? "payments" : "orders");
  const [orders, setOrders] = useState<any[] | null>(null);
  const [payments, setPayments] = useState<any[] | null>(null);

  useEffect(() => {
    api<{ orders: any[] }>("/api/orders?scope=mine").then((r) => setOrders(r.orders)).catch(() => {});
    api<{ payments: any[] }>("/api/payments").then((r) => setPayments(r.payments)).catch(() => {});
  }, []);
  if (!me || !orders) return <Spinner />;

  const today = payments?.filter((p) => p.isToday) ?? [];
  const todayTotal = today.reduce((s, p) => s + p.amount, 0);

  return (
    <Screen me={me}>
      <div className="row">
        <h4 className="m0 f1">{tab === "orders" ? "My orders" : "Payments"}</h4>
        {tab === "orders"
          ? <Link href="/order" className="btn btn-ghost fs-small">＋ New order</Link>
          : <Link href="/pay" className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>＋ Record</Link>}
      </div>
      <div className="seg" style={{ width: "100%" }}>
        <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
          <input type="radio" name="otab" checked={tab === "orders"} onChange={() => setTab("orders")} />Orders
        </label>
        <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
          <input type="radio" name="otab" checked={tab === "payments"} onChange={() => setTab("payments")} />Payments
        </label>
      </div>

      {tab === "orders" ? (
        <>
          {orders.length === 0 ? (
            <MascotNote title="No orders yet"
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
                <a className="small" href={"/api/files?id=" + o.invoicePdfId} target="_blank"
                   style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 6 }}>
                  Invoice attached — open
                </a>
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
              <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--c-green-deep)" }}>Collected today</div>
              <span className="hnum fs-figure">{money(todayTotal)}</span>
              <span className="small muted">{today.length} receipt{today.length === 1 ? "" : "s"}</span>
            </div>
          ) : null}
          {(payments ?? []).length === 0 ? (
            <MascotNote title="Nothing collected yet"
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
              {p.photo ? <a className="small" href={`/api/files?id=${p.photo}`} target="_blank">receipt</a> : null}
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

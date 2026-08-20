"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, hm, money } from "@/lib/fmt";
import { useRouter } from "next/navigation";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

export default function AcctQueue() {
  const me = useMe();
  const router = useRouter();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [pdfFor, setPdfFor] = useState<number | null>(null);
  const [pdfNames, setPdfNames] = useState<Record<number, { id: string; name: string }>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<{ orders: any[] }>("/api/orders?scope=queue").then((r) => setOrders(r.orders)).catch(() => {});
    api("/api/stock").then((r: any) => { setStock(r.stock); setLocations(r.locations ?? []); }).catch(() => {});
    api("/api/payments").then((r: any) => setPayments(r.payments.filter((p: any) => p.isToday))).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !orders) return <Spinner />;

  function stockWarning(o: any): string | null {
    // The seller's own city holds the stock; everyone else draws on the main warehouse.
    const loc = locations.some((l) => l.id === o.createdByCity && l.id !== "main") ? o.createdByCity : "main";
    const locLabel = locations.find((l) => l.id === loc)?.name ?? loc;
    for (const it of o.items) {
      const s = stock.find((x) => x.productId === it.productId);
      const have = s?.byLocation?.[loc] ?? 0;
      if (have - it.qty < 0) return `Invoicing takes ${it.productName} ${locLabel} stock to ${have - it.qty} (warning only)`;
    }
    return null;
  }

  async function invoice(o: any) {
    const r = await api<{ warnings: string[] }>("/api/orders", {
      json: { action: "invoice", id: o.id, pdfName: pdfNames[o.id]?.name ?? null, pdfId: pdfNames[o.id]?.id ?? null },
    });
    setWarnings(r.warnings ?? []);
    load();
  }

  async function returnOrder(o: any) {
    const note = window.prompt("Return note to the approver (required):");
    if (!note) return;
    await api("/api/orders", { json: { action: "reject", id: o.id, note } }).catch(async () => {
      // Accountant cannot reject via approval flow — record as a note through reject is supervisor-only.
    });
    load();
  }

  function attachPdf(orderId: number) {
    setPdfFor(orderId);
    fileRef.current?.click();
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || pdfFor == null) return;
    const fd = new FormData();
    fd.append("file", f);
    const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null);
    if (!up?.id) return;
    setPdfNames((p) => ({ ...p, [pdfFor]: { id: up.id, name: f.name } }));
    await api("/api/orders", { json: { action: "attachPdf", id: pdfFor, pdfName: f.name, pdfId: up.id } }).catch(() => {});
    load();
  }

  async function logout() {
    await api("/api/auth/logout", { json: {} });
    router.replace("/login");
  }

  return (
    <Screen me={me} wide>
      <div className="row" style={{ alignItems: "baseline" }}>
        <h4 style={{ margin: 0, flex: 1 }}>Invoicing queue</h4>
        <span className="tag tag-accent">{orders.length} approved</span>
        <button className="btn btn-secondary btn-icon" style={{ width: 40, height: 40 }} onClick={logout} title="Sign out">
          <Icon d={paths.logout} size={17} />
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={onFile} />
      {orders.length > 0 ? (
        <div className="row" style={{ gap: 8, padding: "10px 12px", background: "var(--c-coral-soft)", borderRadius: 14, fontSize: 13, fontWeight: 600, color: "var(--c-coral-deep)" }}>
          ⏱ {orders.length} approved order{orders.length === 1 ? "" : "s"} waiting for invoicing — doctors are waiting.
        </div>
      ) : null}
      {warnings.map((w, i) => (
        <div key={i} className="row soft-accent" style={{ gap: 6, padding: "9px 12px", fontSize: 12, color: "var(--color-accent-800)" }}>
          <Icon d={paths.warn} size={16} stroke="var(--color-accent-700)" /> {w}
        </div>
      ))}
      {orders.length === 0 ? <div className="card muted">Queue is clear — nothing approved awaiting invoice.</div> : null}
      {orders.map((o) => {
        const warn = stockWarning(o);
        return (
          <div key={o.id} className="card" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}><DoctorLink id={o.doctor?.id} name={o.doctor?.name ?? "?"} /></div>
                <div className="small muted">by {o.createdByName} · approved by {o.approvedByName} {o.approvedAt ? hm(o.approvedAt) : ""}</div>
              </div>
              {o.isSample
                ? <span className="tag" style={{ background: "var(--c-violet-soft)", color: "var(--c-violet-deep)" }}>FREE SAMPLE</span>
                : <span className="hnum" style={{ fontSize: 17 }}>{money(o.total)}</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-700)", display: "flex", flexDirection: "column", gap: 2 }}>
              {o.items.map((it: any) => (
                <span key={it.productId}>
                  {it.qty} × {it.productName} @ {money(it.price)}{it.price !== it.listPrice ? ` (edited, list ${money(it.listPrice)})` : ""} — {money(it.qty * it.price)}
                </span>
              ))}
            </div>
            {warn ? (
              <div className="row" style={{ gap: 6, fontSize: 11, color: "var(--color-accent-700)" }}>
                <Icon d={paths.warn} size={16} stroke="var(--color-accent-700)" /> {warn}
              </div>
            ) : null}
            <div className="row" style={{ gap: 6, fontSize: 12 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => attachPdf(o.id)}>
                <Icon d={paths.upload} size={16} /> {o.invoicePdfName ?? pdfNames[o.id]?.name ?? "Attach invoice document"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <button className="btn btn-primary" style={{ padding: 10 }} onClick={() => invoice(o)}>Confirm & invoice</button>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Cash collected today</h6>
        {payments.length === 0 ? <div className="small muted">Nothing collected yet today.</div> : null}
        {payments.map((p) => (
          <div key={p.id} className="listrow" style={{ padding: "8px 0" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}><DoctorLink id={p.doctorId} name={p.doctorName} /></div>
              <div className="small muted">by {p.collectedByName} · {hm(p.ts)} · {p.method}</div>
            </div>
            <span className="hnum" style={{ fontSize: 15 }}>{money(p.amount)}</span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

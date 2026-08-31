"use client";
import { MascotNote } from "@/components/MascotNote";
import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, hm, money, money0 } from "@/lib/fmt";
import { useRouter } from "next/navigation";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

export default function AcctQueue() {
  const tx = useT();
  const me = useMe();
  const router = useRouter();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [pdfFor, setPdfFor] = useState<number | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [pdfNames, setPdfNames] = useState<Record<number, { id: string; name: string }>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<{ orders: any[] }>("/api/orders?scope=queue").then((r) => setOrders(r.orders)).catch(() => {});
    // The undo shelf: what was invoiced in the last 24 hours and not yet
    // delivered can come back to the queue if it was a mistake.
    api<{ orders: any[] }>("/api/orders?scope=all").then((r) => setRecent(
      (r.orders ?? []).filter((o: any) => o.status === "invoiced" && !o.deliveredAt
        && o.invoicedAt && Date.now() - new Date(o.invoicedAt).getTime() < 24 * 3600 * 1000)
    )).catch(() => {});
    api("/api/stock").then((r: any) => { setStock(r.stock); setLocations(r.locations ?? []); }).catch(() => {});
    api("/api/payments").then((r: any) => setPayments(r.payments.filter((p: any) => p.isToday))).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !orders) return <Spinner />;

  function stockWarning(o: any): string | null {
    // The seller's own city holds the stock; "all"-city sellers draw on HQ.
    const loc = locations.some((l) => l.id === o.createdByCity) ? o.createdByCity : (locations[0]?.id ?? "");
    const locLabel = locations.find((l) => l.id === loc)?.name ?? loc;
    for (const it of o.items) {
      const s = stock.find((x) => x.productId === it.productId);
      const have = s?.byLocation?.[loc] ?? 0;
      if (have - it.qty < 0) return `Not enough ${it.productName} in ${locLabel} (${have} on hand) — invoicing will be refused until stock is moved`;
    }
    return null;
  }

  async function invoice(o: any) {
    // The PDF is mandatory — say so here rather than letting the server say it.
    if (!o.invoicePdfName && !pdfNames[o.id]) {
      alert(tx("queue.pdfFirst", "Attach the invoice PDF first — the button next to Confirm."));
      return;
    }
    try {
      await api("/api/orders", {
        json: { action: "invoice", id: o.id, pdfName: pdfNames[o.id]?.name ?? null, pdfId: pdfNames[o.id]?.id ?? null },
      });
      setWarnings([]);
    } catch (e: any) {
      alert(e?.message || "Could not invoice it");
    }
    load();
  }

  async function returnOrder(o: any) {
    const note = window.prompt(tx("queue.returnWhy", "Why is it coming back? The approver and the rep will read this:"));
    if (!note) return;
    // A dedicated action: "reject" is supervisor-only and pending-only, and
    // the old code swallowed that failure — she thought she had returned the
    // order and nothing had happened at all.
    try {
      await api("/api/orders", { json: { action: "return", id: o.id, note } });
    } catch (e: any) {
      alert(e?.message || "Could not return it");
    }
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
      <div className="row items-base">
        <h4 className="m0 f1">{tx("queue.invoicingQueue", "Invoicing queue")}</h4>
        {/* Not just how many — how much. "How much is stuck in the queue?" is
            the owner's question, and she was adding card totals by hand. */}
        <span className="tag tag-accent hnum">
          {orders.length} · {money0(orders.filter((o: any) => !o.isSample).reduce((s: number, o: any) => s + o.total, 0))}
        </span>
        <button className="btn btn-secondary btn-icon" style={{ }} onClick={logout} title={tx("queue.signOutPh", "Sign out")}>
          <Icon d={paths.logout} size={17} />
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={onFile} />
      {orders.length > 0 ? (
        <div className="row" style={{ gap: 8, padding: "10px 12px", background: "var(--c-coral-soft)", borderRadius: 14, fontSize: 13, fontWeight: 600, color: "var(--c-coral-deep)" }}>
          {/* Arabic has no "add an s" plural, so the whole sentence is one
              string with the number dropped into it rather than assembled
              from fragments. */}
          ⏱ {tx("queue.waitingLine", "{n} approved orders waiting for invoicing — doctors are waiting.").replace("{n}", String(orders.length))}
        </div>
      ) : null}
      {warnings.map((w, i) => (
        <div key={i} className="row soft-accent" style={{ gap: 6, padding: "9px 12px", fontSize: 12, color: "var(--color-accent-800)" }}>
          <Icon d={paths.warn} size={16} stroke="var(--color-accent-700)" /> {w}
        </div>
      ))}
      {orders.length === 0 ? (
        <MascotNote mood="cheer" tone="win" size={62} title={tx("queue.queueIsClearPh", "Queue is clear")}
          body="Nothing approved is waiting for an invoice." />
      ) : null}
      {orders.map((o) => {
        const warn = stockWarning(o);
        return (
          <div key={o.id} className="card gap-3">
            <div className="row gap-3">
              <div className="f1">
                <div className="fs-small w-500"><DoctorLink id={o.doctor?.id} name={o.doctor?.name ?? "?"} /></div>
                <div className="small muted">by {o.createdByName} · approved by {o.approvedByName} {o.approvedAt ? hm(o.approvedAt) : ""}</div>
              </div>
              {o.isSample
                ? <span className="tag" style={{ background: "var(--c-violet-soft)", color: "var(--c-violet-deep)" }}>FREE SAMPLE</span>
                : <span className="hnum fs-lead">{money(o.total)}</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-700)", display: "flex", flexDirection: "column", gap: 2 }}>
              {o.items.map((it: any) => (
                <span key={it.productId}>
                  {it.qty} × {it.productName} @ {money(it.price)}{it.price !== it.listPrice ? ` (edited, list ${money(it.listPrice)})` : ""} — {money(it.qty * it.price)}
                </span>
              ))}
            </div>
            {warn ? (
              <div className="row" style={{ gap: 6, fontSize: 12, color: "var(--color-accent-700)" }}>
                <Icon d={paths.warn} size={16} stroke="var(--color-accent-700)" /> {warn}
              </div>
            ) : null}
            <div className="row" style={{ gap: 6, fontSize: 12 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => attachPdf(o.id)}>
                <Icon d={paths.upload} size={16} /> {o.invoicePdfName ?? pdfNames[o.id]?.name ?? "Attach invoice document"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <div className="row gap-2">
                <button className="btn btn-primary p-3 f1" onClick={() => invoice(o)}>{tx("queue.confirmInvoice", "Confirm & invoice")}</button>
                {/* The way out for a wrong order — previously her only options
                    were invoice it anyway or leave it in the queue forever. */}
                <button className="btn btn-secondary p-3" style={{ flex: "none" }} onClick={() => returnOrder(o)}>
                  {tx("queue.returnBtn", "Return…")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {/* The undo shelf. What was invoiced in the last 24 hours and not yet
          delivered can come back to the queue if it was a mistake — the
          stock returns to the warehouse and the change goes on the record. */}
      {recent.length ? (
        <div className="card" style={{ gap: 6 }}>
          <h6 className="m0">{tx("queue.invoicedRecently", "Invoiced in the last 24 hours — undo if it was a mistake")}</h6>
          {recent.map((o: any) => (
            <div key={o.id} className="listrow" style={{ alignItems: "center", gap: 10 }}>
              <div className="f1min">
                <div className="fs-small w-500">#{o.id} · {o.doctor?.name ?? "?"}</div>
                <div className="small muted">{o.createdByName} · {(o.invoicedAt ?? "").slice(11, 16)}</div>
              </div>
              <span className="hnum fs-small w-700">{money0(o.total)}</span>
              <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                onClick={async () => {
                  if (!window.confirm(tx("queue.undoConfirm", "Undo this invoice? Stock goes back to the warehouse and the order returns to the queue."))) return;
                  try { await api("/api/orders", { json: { action: "uninvoice", id: o.id } }); }
                  catch (e: any) { alert(e?.message || "Could not undo it"); }
                  load();
                }}>↩ {tx("queue.undo", "Undo")}</button>
            </div>
          ))}
        </div>
      ) : null}

      {/* One line, not a second copy of the payments list — the full list
          with filters and totals lives on Money in. This page is for
          invoicing; the line is just the end-of-day glance. */}
      <a href="/acct/collections" className="card mt-auto" style={{ flexDirection: "row", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
        <div className="f1min">
          <div className="fs-small w-500">{tx("queue.cashCollectedToday", "Cash collected today")} →</div>
          <div className="small muted">
            {payments.length === 0
              ? tx("queue.nothingCollectedYetToday", "Nothing collected yet today.")
              : `${tx("acct.cash", "Cash")} ${money0(payments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0))} · ${tx("acct.transfer", "Transfer")} ${money0(payments.filter((p) => p.method === "transfer").reduce((s, p) => s + p.amount, 0))} · ${payments.length} ${tx("acct.receipts", "Receipts")}`}
          </div>
        </div>
        <span className="hnum fs-lead">{money0(payments.reduce((s, p) => s + p.amount, 0))}</span>
      </a>
    </Screen>
  );
}

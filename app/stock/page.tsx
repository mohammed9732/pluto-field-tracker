"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, hm } from "@/lib/fmt";
import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = ["SKU", "Product Name", "Quantity", "Batch (optional)", "Expiry (optional, YYYY-MM-DD)"];

/* Red once it is past, amber inside the warning window the owner set, and
 * otherwise the ordinary text colour. Months are added properly rather than by
 * multiplying days, so a six-month window from 31 August lands in February. */
function expiryTone(expiry: string | null, warnMonths: number): string | undefined {
  if (!expiry) return undefined;
  const today = new Date();
  const when = new Date(expiry + "T00:00:00");
  if (Number.isNaN(when.getTime())) return undefined;
  if (when <= today) return "var(--c-coral-deep)";
  const limit = new Date(today);
  limit.setMonth(limit.getMonth() + (warnMonths || 6));
  return when <= limit ? "var(--c-amber-deep)" : undefined;
}

const TRANSFER_TAG: Record<string, [string, string]> = {
  pending: ["Waiting for supervisor", "tag-warn"],
  supervisor_ok: ["Waiting for accountant", "tag-chat"],
  done: ["Moved", "tag-ok"],
  rejected: ["Declined", "tag-hot"],
};

export default function StockPage() {
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [checkNote, setCheckNote] = useState("");
  const [ask, setAsk] = useState<{ productId: string; qty: string; fromCity: string; toCity: string; note: string } | null>(null);
  const [askErr, setAskErr] = useState("");
  const [checkMsg, setCheckMsg] = useState("");
  const [transfer, setTransfer] = useState({ productId: "", qty: "", to: "", note: "" });
  const [preview, setPreview] = useState<{ filename: string; rows: any[] } | null>(null);
  const [result, setResult] = useState<{ processed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api("/api/stock").then((r: any) => {
      setData(r);
      setTransfer((t) => (t.to ? t : { ...t, to: (r.locations ?? []).find((l: any) => l.id !== "main")?.id ?? "" }));
    }).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const isMgmt = me.role !== "rep";
  const isAcct = me.role === "accountant" || me.role === "admin";
  const myCity = data.myCity as string;
  const low = data.lowThreshold ?? 10;
  const locations: { id: string; name: string }[] = data.locations ?? [];
  const label = (id: string) => locations.find((l) => l.id === id)?.name ?? id;

  async function decideTransfer(id: number, decision: "approve" | "reject" | "fulfil") {
    setAskErr("");
    try {
      await api("/api/stock", { json: { action: "decideTransferRequest", id, decision } });
      load();
    } catch (e: any) {
      // The commonest failure here is real and worth reading: the source city
      // ran out between the approval and the accountant getting to it.
      setAskErr(e?.message || "Could not update that request");
    }
  }

  async function submitCheck() {
    setCheckMsg("");
    // Only products the rep actually typed a figure for. Sending 0 for the
    // rest looked like "we have none of these", and accepting the count wrote
    // those zeroes into stock — wiping the city's holding of anything the rep
    // simply had not got to yet.
    const rows = data.stock
      .filter((s: any) => String(counts[s.productId] ?? "").trim() !== "")
      .map((s: any) => ({ productId: s.productId, counted: Number(counts[s.productId]) }));
    if (rows.length !== data.stock.length) {
      const missing = data.stock.length - rows.length;
      if (!window.confirm(
        `${missing} product${missing === 1 ? " has" : "s have"} no count. ` +
        `${missing === 1 ? "It" : "They"} will be left as ${missing === 1 ? "it is" : "they are"}, not set to zero.\n\nSubmit anyway?`
      )) return;
    }
    if (!rows.length) { setCheckMsg("Type at least one count first."); return; }
    try {
      const r = await api<{ diffs: number }>("/api/stock", { json: { action: "submitCheck", rows, note: checkNote } });
      setCheckMsg(r.diffs ? `Submitted — ${r.diffs} difference(s) sent to the accountant.` : "Submitted — everything matches.");
      setCounts({});
      setCheckNote("");
      load();
    } catch (e: any) { setCheckMsg(e.message); }
  }

  async function doTransfer() {
    await api("/api/stock", { json: { action: "transfer", productId: Number(transfer.productId), qty: Number(transfer.qty), from: "main", to: transfer.to, note: transfer.note } });
    setTransfer({ productId: "", qty: "", to: transfer.to, note: "" });
    load();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...data.stock.map((s: any) => [s.sku, s.name, "", "", ""])]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "stock-count-template.xlsx");
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const rows = raw.slice(1).filter((r) => r.some((c) => String(c).trim() !== "")).map((r) => {
        let expiry = r[4];
        if (expiry instanceof Date) expiry = expiry.toISOString().slice(0, 10);
        return { sku: String(r[0]).trim(), name: r[1], qty: r[2], batch: r[3], expiry: expiry ? String(expiry) : "" };
      });
      setPreview({ filename: f.name, rows });
      setResult(null);
    };
    reader.readAsArrayBuffer(f);
    e.target.value = "";
  }
  async function confirmUpload() {
    if (!preview) return;
    const r = await api<{ processed: number; errors: string[] }>("/api/stock", { json: { action: "upload", filename: preview.filename, rows: preview.rows } });
    setResult(r);
    setPreview(null);
    load();
  }

  return (
    <Screen me={me} wide>
      <div className="row items-base">
        <h4 className="m0 f1">Stock</h4>
        {isAcct ? <a href="#" className="fs-caption" onClick={(e) => { e.preventDefault(); downloadTemplate(); }}>Blank template</a> : null}
      </div>

      {data.mustCheck ? (
        <div className="row" style={{ gap: 8, padding: "9px 12px", background: "var(--c-amber-soft)", borderRadius: 14, fontSize: 12, color: "var(--c-amber-deep)", fontWeight: 600 }}>
          <Icon d={paths.warn} size={14} stroke="var(--c-amber-deep)" />
          Weekly stock check due by Thursday — count your {data.myCityLabel} stock below.
        </div>
      ) : null}

      {/* When each column was last reconciled with the accountant. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {locations.map((l) => {
          const lm = data.lastMatched?.[l.id];
          const mine = myCity === l.id;
          return (
            <div key={l.id} className="small" style={{ color: mine ? "var(--color-accent-800)" : "var(--color-neutral-600)", fontWeight: mine ? 600 : 400 }}>
              {l.name}: {lm?.ts
                ? `${lm.kind === "count" ? "counted" : "checked"} ${dmy(lm.ts)} at ${hm(lm.ts)}${lm.by ? ` by ${lm.by}` : ""}`
                : "never matched with the accountant yet"}
            </div>
          );
        })}
      </div>

      {/* Phone: one card per product. Six columns at 375px forced everything
          down to 9-11px and made the expiry cell a 26px target. The desktop
          keeps the table below — same data, two presentations. */}
      <div className="stock-cards">
        {data.stock.map((s: any) => (
          <div key={s.productId} className="card" style={{ gap: "var(--sp-2)", padding: "var(--sp-3)" }}>
            <div className="row" style={{ alignItems: "baseline", gap: "var(--sp-2)" }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{s.name}</span>
              <span className="hnum" style={{ fontSize: 22, fontWeight: 800 }}>{s.total}</span>
              <span className="small muted">{s.unit}</span>
            </div>
            <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
              {locations.map((l) => {
                const qty = s.byLocation?.[l.id] ?? 0;
                return (
                  <span key={l.id} className="small" style={{
                    color: myCity === l.id ? "var(--color-accent-800)" : "var(--color-neutral-600)",
                    fontWeight: myCity === l.id ? 700 : 400,
                  }}>
                    {l.name} <b className="hnum" style={{ color: qty <= low ? "var(--c-coral-deep)" : "var(--color-text)" }}>{qty}</b>
                  </span>
                );
              })}
            </div>
            {(s.expiry || data.canSetExpiry) ? (
              <div className="row" style={{ gap: "var(--sp-2)", alignItems: "center", borderTop: "1px solid var(--color-divider)", paddingTop: "var(--sp-2)" }}>
                <span className="small muted f1">
                  {s.batch ? `Batch ${s.batch}` : "Expiry"}
                </span>
                {data.canSetExpiry ? (
                  <input
                    type="date"
                    className="input"
                    style={{ width: 150, fontSize: 13, color: expiryTone(s.expiry, data.expiryWarnMonths) }}
                    value={s.expiry ?? ""}
                    onChange={async (e) => {
                      await api("/api/stock", { json: { action: "setBatch", productId: s.productId, location: "main", expiry: e.target.value || null } });
                      load();
                    }}
                  />
                ) : s.expiry ? (
                  <span className="tag" style={{
                    background: expiryTone(s.expiry, data.expiryWarnMonths) ? "var(--c-coral-soft)" : "var(--color-neutral-200)",
                    color: expiryTone(s.expiry, data.expiryWarnMonths) ?? "var(--color-neutral-700)",
                  }}>{dmy(s.expiry)}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="stock-table" style={{ overflowX: "auto" }}>
        <table className="table" style={{ fontSize: 12, minWidth: 380 }}>
          <thead>
            <tr>
              <th>Product</th>
              {locations.map((l) => (
                <th key={l.id} style={{ textAlign: "right", background: myCity === l.id ? "var(--color-accent-100)" : undefined }}>{l.name}</th>
              ))}
              <th className="ta-r">Total</th>
              <th style={{ whiteSpace: "nowrap" }}>Expires</th>
            </tr>
          </thead>
          <tbody>
            {data.stock.map((s: any) => (
              <tr key={s.productId}>
                <td>{s.name}</td>
                {locations.map((l) => {
                  const qty = s.byLocation?.[l.id] ?? 0;
                  return (
                    <td key={l.id} style={{
                      textAlign: "right",
                      fontWeight: l.id === "main" || myCity === l.id ? 700 : 400,
                      background: myCity === l.id ? "var(--color-accent-100)" : undefined,
                      color: qty <= low ? "var(--c-coral-deep)" : undefined,
                    }}>{qty}</td>
                  );
                })}
                <td style={{ textAlign: "right", fontWeight: 700 }}>{s.total}</td>
                {/* Expiry of the batch in the main warehouse. Stock here is
                    dermatology product with real shelf lives, and a carton found
                    expired is a write-off — so it is worth a column of its own. */}
                <td style={{ whiteSpace: "nowrap" }}>
                  {data.canSetExpiry ? (
                    <input
                      type="date"
                      className="input"
                      style={{ minHeight: 30, fontSize: 12, padding: "3px 6px", width: 140,
                               color: expiryTone(s.expiry, data.expiryWarnMonths) }}
                      value={s.expiry ?? ""}
                      onChange={async (e) => {
                        await api("/api/stock", { json: { action: "setBatch", productId: s.productId, location: "main", expiry: e.target.value || null } });
                        load();
                      }}
                    />
                  ) : (
                    <span style={{ color: expiryTone(s.expiry, data.expiryWarnMonths) }}>
                      {s.expiry ? dmy(s.expiry) : "—"}
                    </span>
                  )}
                  {s.batch ? <div className="small muted">batch {s.batch}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Asking for stock from another city ----------------------------
          Reps and supervisors ask; a supervisor agrees; the accountant is the
          only one who can actually move the quantities. Each person below sees
          only the step that is theirs to take. */}
      <div className="card gap-3">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <h6 className="m0 f1">Stock transfer requests</h6>
          {(me.role === "supervisor" || me.role === "admin" || (me.role === "rep" && myCity !== "main")) ? (
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={() => {
                setAskErr("");
                if (ask) { setAsk(null); return; }
                // Seed both ends from what is actually on offer, so neither
                // <select> can show one city while state holds another.
                const to = myCity !== "main" ? myCity : (locations.find((l) => l.id !== "main")?.id ?? "");
                const from = locations.find((l) => l.id !== to)?.id ?? "main";
                setAsk({ productId: "", qty: "", fromCity: from, toCity: to, note: "" });
              }}>
              {ask ? "Cancel" : "Ask for stock"}
            </button>
          ) : null}
        </div>

        {ask ? (
          <div className="stack-2">
            <div className="two-col gap-2">
              <div className="field m0">
                <label>Product</label>
                <select className="input" value={ask.productId} onChange={(e) => setAsk({ ...ask, productId: e.target.value })}>
                  <option value="">Choose…</option>
                  {data.stock.map((x: any) => <option key={x.productId} value={x.productId}>{x.name}</option>)}
                </select>
              </div>
              <div className="field m0">
                <label>Quantity</label>
                <input className="input" inputMode="numeric" value={ask.qty}
                  onChange={(e) => setAsk({ ...ask, qty: e.target.value.replace(/[^0-9]/g, "") })} />
              </div>
            </div>
            <div className="field m0">
              <label>Take it from</label>
              <select className="input" value={ask.fromCity}
                onChange={(e) => {
                  const fromCity = e.target.value;
                  // Never leave the two pointing at the same place.
                  const toCity = fromCity === ask.toCity
                    ? (locations.find((l) => l.id !== fromCity)?.id ?? ask.toCity)
                    : ask.toCity;
                  setAsk({ ...ask, fromCity, toCity });
                }}>
                {locations.filter((l) => l.id !== ask.toCity).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            {me.role !== "rep" ? (
              <div className="field m0">
                <label>Send it to</label>
                <select className="input" value={ask.toCity}
                  onChange={(e) => setAsk({ ...ask, toCity: e.target.value })}>
                  {locations.filter((l) => l.id !== ask.fromCity).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            ) : null}
            <input className="input" placeholder="Why do you need it? (optional)" value={ask.note}
              onChange={(e) => setAsk({ ...ask, note: e.target.value })} />
            {askErr ? <div className="tag tag-hot self-start">{askErr}</div> : null}
            <button className="btn btn-primary btn-block p-3"
              onClick={async () => {
                setAskErr("");
                try {
                  await api("/api/stock", { json: {
                    action: "requestTransfer",
                    productId: Number(ask.productId), qty: Number(ask.qty),
                    fromCity: ask.fromCity, toCity: ask.toCity, note: ask.note,
                  } });
                  setAsk(null);
                  load();
                } catch (e: any) { setAskErr(e?.message || "Could not send the request"); }
              }}>
              Send request
            </button>
          </div>
        ) : null}

        {(data.transferRequests ?? []).length === 0 ? (
          <div className="small muted">Nothing requested.</div>
        ) : (
          (data.transferRequests ?? []).map((r: any) => (
            <div key={r.id} className="listrow" style={{ alignItems: "flex-start", gap: 8 }}>
              <div className="f1min">
                <div className="fs-small">
                  <span className="hnum">{r.qty}</span> × {r.productName}
                  <span className="muted"> · {r.fromName} → {r.toName}</span>
                </div>
                <div className="small muted">
                  {r.requestedByName} · {dmy(r.ts)}
                  {r.note ? ` — ${r.note}` : ""}
                  {r.decidedByName ? ` · ${r.decidedByName}` : ""}
                  {r.decidedNote ? `: ${r.decidedNote}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span className={`tag ${TRANSFER_TAG[r.status]?.[1] ?? "tag-neutral"}`}>
                  {TRANSFER_TAG[r.status]?.[0] ?? r.status}
                </span>
                {/* Not on your own request — the server refuses that, so the
                    button could only ever return an error. The owner is the
                    exception: there is nobody above them to ask. */}
                {r.status === "pending" && data.canApproveTransfer
                  && (r.requestedBy !== me.id || me.role === "admin") ? (
                  <div className="row gap-2">
                    <button className="btn btn-ghost fs-caption"
                      onClick={() => decideTransfer(r.id, "approve")}>Approve</button>
                    <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                      onClick={() => decideTransfer(r.id, "reject")}>Decline</button>
                  </div>
                ) : null}
                {r.status === "supervisor_ok" && data.canFulfilTransfer ? (
                  <div className="row gap-2">
                    <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-green-deep)" }}
                      onClick={() => decideTransfer(r.id, "fulfil")}>Mark moved</button>
                    <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                      onClick={() => decideTransfer(r.id, "reject")}>Decline</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {me.role === "rep" && myCity !== "main" && data.weeklyStockCheck ? (
        <div className="card gap-3">
          <h6 className="m0">Weekly stock check — {data.myCityLabel}</h6>
          {data.mustCheck ? (
            <>
              <div className="hint">Count what you physically have. Don&apos;t look at the system numbers — count first.</div>
              {data.stock.map((s: any) => (
                <div key={s.productId} className="row" style={{ gap: 8, fontSize: 13 }}>
                  <span className="f1">{s.name}</span>
                  <input className="input" style={{ width: 80, minHeight: 32, textAlign: "right" }} inputMode="numeric"
                    placeholder="0" value={counts[s.productId] ?? ""}
                    onChange={(e) => setCounts((c) => ({ ...c, [s.productId]: e.target.value }))} />
                  <span className="small muted" style={{ width: 34 }}>{s.unit}</span>
                </div>
              ))}
              <input className="input" placeholder="Note (damage, missing, etc.)" value={checkNote} onChange={(e) => setCheckNote(e.target.value)} />
              <button className="btn btn-primary btn-block" style={{ padding: 11 }} onClick={submitCheck}>Submit count to accountant</button>
            </>
          ) : (
            <div className="tag tag-ok self-start">This week&apos;s check is submitted ✓</div>
          )}
          {checkMsg ? <div className="small" style={{ color: "var(--c-green-deep)" }}>{checkMsg}</div> : null}
        </div>
      ) : null}

      {isAcct ? (
        <>
          <div className="card gap-3">
            <h6 className="m0">Transfer to a city</h6>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
              <select className="input" value={transfer.productId} onChange={(e) => setTransfer({ ...transfer, productId: e.target.value })}>
                <option value="">Product…</option>
                {data.stock.map((s: any) => <option key={s.productId} value={s.productId}>{s.name} ({s.byLocation?.main ?? 0} in main)</option>)}
              </select>
              <input className="input" placeholder="Qty" inputMode="numeric" value={transfer.qty} onChange={(e) => setTransfer({ ...transfer, qty: e.target.value })} />
              <select className="input" value={transfer.to} onChange={(e) => setTransfer({ ...transfer, to: e.target.value })}>
                {locations.filter((l) => l.id !== "main").map((l) => (
                  <option key={l.id} value={l.id}>→ {l.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" style={{ padding: 9 }} onClick={doTransfer} disabled={!transfer.productId || !transfer.qty}>Record transfer</button>
          </div>

          {data.checks?.length ? (
            <div className="stack-2">
              <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Weekly checks from reps</h6>
              {data.checks.map((c: any) => (
                <div key={c.id} className="card" style={{ gap: 8, padding: 12, borderColor: c.hasDiff && !c.reviewedBy ? "var(--c-amber)" : undefined }}>
                  <div className="row gap-2">
                    <div className="f1">
                      <div className="fs-small w-500">{c.userName} · {label(c.city)}</div>
                      <div className="small muted">week of {dmy(c.weekStart)} · submitted {dmy(c.ts)}</div>
                    </div>
                    {c.reviewedBy ? <span className="tag tag-ok">Reviewed</span> : c.hasDiff ? <span className="tag tag-warn">Differences</span> : <span className="tag tag-ok">Matches</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
                    {c.rows.map((r: any) => (
                      <div key={r.productId} className="row" style={{ gap: 8, color: r.counted !== r.system ? "var(--c-coral-deep)" : "var(--color-neutral-600)" }}>
                        <span className="f1">{r.productName}</span>
                        <span>counted <b>{r.counted}</b> · system <b>{r.system}</b></span>
                      </div>
                    ))}
                  </div>
                  {c.note ? <div className="small muted">&quot;{c.note}&quot;</div> : null}
                  {!c.reviewedBy ? (
                    <div className="two">
                      <button className="btn btn-primary" style={{ padding: 8, fontSize: 12 }}
                        onClick={async () => { await api("/api/stock", { json: { action: "reviewCheck", id: c.id, applyCounts: true } }); load(); }}>
                        Accept counts (fix system)
                      </button>
                      <button className="btn btn-secondary" style={{ padding: 8, fontSize: 12 }}
                        onClick={async () => { await api("/api/stock", { json: { action: "reviewCheck", id: c.id } }); load(); }}>
                        Mark reviewed
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <button className="btn btn-secondary p-3" onClick={() => fileRef.current?.click()}>
            <Icon d={paths.upload} size={14} /> Upload main-warehouse count (.xlsx)
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          {preview ? (
            <div className="soft-accent" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="row gap-2">
                <Icon d={paths.file} size={16} stroke="var(--color-accent-700)" />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-accent-800)" }}>{preview.filename}</div>
                <span className="small" style={{ color: "var(--color-accent-700)" }}>replaces main-warehouse counts</span>
              </div>
              <div className="small" style={{ color: "var(--color-accent-800)" }}>{preview.rows.length} rows — confirm to apply.</div>
              <div className="two">
                <button className="btn btn-primary" style={{ padding: 9 }} onClick={confirmUpload}>Confirm</button>
                <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setPreview(null)}>Cancel</button>
              </div>
            </div>
          ) : null}
          {result ? (
            <div className="card" style={{ gap: 4 }}>
              <span className="tag tag-ok self-start">{result.processed} rows applied</span>
              {result.errors.map((e, i) => <div key={i} className="small" style={{ color: "var(--c-amber-deep)" }}>{e}</div>)}
            </div>
          ) : null}

          {data.transfers?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Recent transfers</h6>
              {data.transfers.map((t: any) => (
                <div key={t.id} className="small muted" style={{ display: "flex", gap: 8 }}>
                  <span className="f1">{t.qty} × {t.productName} · {label(t.from)} → {label(t.to)}</span>
                  <span>{dmy(t.ts)} · {t.byName}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="hint mt-auto">
        {isMgmt
          ? "Invoices deduct from the seller's city stock automatically. Highlighted column = low at or below " + low + "."
          : `Your city column is highlighted. Invoiced orders deduct from ${data.myCityLabel} stock automatically.`}
      </div>
    </Screen>
  );
}

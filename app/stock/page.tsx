"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, hm } from "@/lib/fmt";
import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = ["SKU", "Product Name", "Quantity", "Batch (optional)", "Expiry (optional, YYYY-MM-DD)"];

export default function StockPage() {
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [checkNote, setCheckNote] = useState("");
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

  async function submitCheck() {
    setCheckMsg("");
    const rows = data.stock.map((s: any) => ({ productId: s.productId, counted: Number(counts[s.productId] ?? 0) }));
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
      <div className="row" style={{ alignItems: "baseline" }}>
        <h4 style={{ margin: 0, flex: 1 }}>Stock</h4>
        {isAcct ? <a href="#" style={{ fontSize: 12 }} onClick={(e) => { e.preventDefault(); downloadTemplate(); }}>Blank template</a> : null}
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

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ fontSize: 12, minWidth: 380 }}>
          <thead>
            <tr>
              <th>Product</th>
              {locations.map((l) => (
                <th key={l.id} style={{ textAlign: "right", background: myCity === l.id ? "var(--color-accent-100)" : undefined }}>{l.name}</th>
              ))}
              <th style={{ textAlign: "right" }}>Total</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {me.role === "rep" && myCity !== "main" && data.weeklyStockCheck ? (
        <div className="card" style={{ gap: 10 }}>
          <h6 style={{ margin: 0 }}>Weekly stock check — {data.myCityLabel}</h6>
          {data.mustCheck ? (
            <>
              <div className="hint">Count what you physically have. Don&apos;t look at the system numbers — count first.</div>
              {data.stock.map((s: any) => (
                <div key={s.productId} className="row" style={{ gap: 8, fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{s.name}</span>
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
            <div className="tag tag-ok" style={{ alignSelf: "flex-start" }}>This week&apos;s check is submitted ✓</div>
          )}
          {checkMsg ? <div className="small" style={{ color: "var(--c-green-deep)" }}>{checkMsg}</div> : null}
        </div>
      ) : null}

      {isAcct ? (
        <>
          <div className="card" style={{ gap: 10 }}>
            <h6 style={{ margin: 0 }}>Transfer to a city</h6>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Weekly checks from reps</h6>
              {data.checks.map((c: any) => (
                <div key={c.id} className="card" style={{ gap: 8, padding: 12, borderColor: c.hasDiff && !c.reviewedBy ? "var(--c-amber)" : undefined }}>
                  <div className="row" style={{ gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.userName} · {label(c.city)}</div>
                      <div className="small muted">week of {dmy(c.weekStart)} · submitted {dmy(c.ts)}</div>
                    </div>
                    {c.reviewedBy ? <span className="tag tag-ok">Reviewed</span> : c.hasDiff ? <span className="tag tag-warn">Differences</span> : <span className="tag tag-ok">Matches</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
                    {c.rows.map((r: any) => (
                      <div key={r.productId} className="row" style={{ gap: 8, color: r.counted !== r.system ? "var(--c-coral-deep)" : "var(--color-neutral-600)" }}>
                        <span style={{ flex: 1 }}>{r.productName}</span>
                        <span>counted <b>{r.counted}</b> · system <b>{r.system}</b></span>
                      </div>
                    ))}
                  </div>
                  {c.note ? <div className="small muted">&quot;{c.note}&quot;</div> : null}
                  {!c.reviewedBy ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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

          <button className="btn btn-secondary" style={{ padding: 10 }} onClick={() => fileRef.current?.click()}>
            <Icon d={paths.upload} size={14} /> Upload main-warehouse count (.xlsx)
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onFile} />
          {preview ? (
            <div className="soft-accent" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Icon d={paths.file} size={16} stroke="var(--color-accent-700)" />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-accent-800)" }}>{preview.filename}</div>
                <span className="small" style={{ color: "var(--color-accent-700)" }}>replaces main-warehouse counts</span>
              </div>
              <div className="small" style={{ color: "var(--color-accent-800)" }}>{preview.rows.length} rows — confirm to apply.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="btn btn-primary" style={{ padding: 9 }} onClick={confirmUpload}>Confirm</button>
                <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setPreview(null)}>Cancel</button>
              </div>
            </div>
          ) : null}
          {result ? (
            <div className="card" style={{ gap: 4 }}>
              <span className="tag tag-ok" style={{ alignSelf: "flex-start" }}>{result.processed} rows applied</span>
              {result.errors.map((e, i) => <div key={i} className="small" style={{ color: "var(--c-amber-deep)" }}>{e}</div>)}
            </div>
          ) : null}

          {data.transfers?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Recent transfers</h6>
              {data.transfers.map((t: any) => (
                <div key={t.id} className="small muted" style={{ display: "flex", gap: 8 }}>
                  <span style={{ flex: 1 }}>{t.qty} × {t.productName} · {label(t.from)} → {label(t.to)}</span>
                  <span>{dmy(t.ts)} · {t.byName}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="hint" style={{ marginTop: "auto" }}>
        {isMgmt
          ? "Invoices deduct from the seller's city stock automatically. Highlighted column = low at or below " + low + "."
          : `Your city column is highlighted. Invoiced orders deduct from ${data.myCityLabel} stock automatically.`}
      </div>
    </Screen>
  );
}

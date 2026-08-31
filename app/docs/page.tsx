"use client";
import { openImage } from "@/components/Lightbox";
import { useEffect, useState } from "react";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { api, dmy, money } from "@/lib/fmt";
import { useT } from "@/lib/i18n";

/* The documents library: every invoice and receipt, searchable.
 *
 * One search box that matches customer, reference and amount, because the
 * accountant looking for a document knows ONE of those things — which one
 * varies by the phone call that prompted the search.
 */
export default function DocsPage() {
  const me = useMe();
  const tx = useT();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "invoices" | "receipts" | "deliveries">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [archive, setArchive] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      p.set("kind", kind);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      if (archive) p.set("archive", "1");
      api("/api/docs?" + p.toString()).then(setData).catch((e: any) => {
        if (/switched off/.test(e?.message ?? "")) setDenied(true);
      });
    }, 250); // debounce so typing does not fire a request per keystroke
    return () => clearTimeout(t);
  }, [q, kind, from, to, archive]);

  if (!me) return <Spinner />;
  if (denied) {
    return (
      <Screen me={me}>
        <PageHead title={tx("dlib.title", "Documents")} back="back" />
        <div className="card"><div className="small muted">{tx("dlib.off", "The documents library is switched off for field staff — ask the owner.")}</div></div>
      </Screen>
    );
  }
  if (!data) return <Spinner />;

  return (
    <Screen me={me}>
      <PageHead title={tx("dlib.title", "Documents")} back="back" />

      <div className="card" style={{ gap: 8 }}>
        <input className="input" placeholder={tx("dlib.searchPh", "Search customer, reference, or amount…")}
          value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row gap-2" style={{ flexWrap: "wrap" }}>
          <div className="seg">
            {([["all", tx("common.all", "All")], ["invoices", tx("dlib.invoices", "Invoices")], ["receipts", tx("dlib.receipts", "Receipts")], ["deliveries", tx("dlib.deliveries", "Deliveries")]] as const).map(([k, label]) => (
              <label key={k} className="seg-opt">
                <input type="radio" name="dockind" checked={kind === k} onChange={() => setKind(k)} />{label}
              </label>
            ))}
          </div>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} />
        </div>
        {data.archivedCount > 0 ? (
          <label className="radio fs-small" style={{ alignSelf: "flex-start" }}>
            <input type="checkbox" checked={archive} onChange={(e) => setArchive(e.target.checked)} />
            <span className="dot" />
            {tx("dlib.showArchive", "Include archive ({n} older than 2 years)").replace("{n}", String(data.archivedCount))}
          </label>
        ) : null}
      </div>

      <div className="card" style={{ gap: 4 }}>
        {data.rows.length === 0 ? (
          <div className="small muted">{tx("dlib.none", "Nothing matches.")}</div>
        ) : data.rows.map((r: any) => (
          <a key={`${r.kind}-${r.fileId}`} className="listrow" style={{ alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
            href={`/api/files?id=${r.fileId}`} target="_blank" rel="noreferrer"
            onClick={(e) => {
              // Photos open in the in-app viewer; PDFs keep the browser tab.
              if (r.kind !== "invoice") { e.preventDefault(); openImage(`/api/files?id=${r.fileId}`); }
            }}>
            <span className={`tag ${r.kind === "invoice" ? "tag-chat" : r.kind === "delivery" ? "tag-warn" : "tag-ok"}`}>
              {r.kind === "invoice" ? tx("dlib.invoice", "Invoice") : r.kind === "delivery" ? tx("dlib.delivery", "Delivered") : tx("dlib.receipt", "Receipt")}
            </span>
            <div className="f1min">
              <div className="fs-small w-500">{r.doctorName}</div>
              <div className="small muted">
                {dmy(r.date)} · {r.refNo} · {r.byName}
                {r.archived ? ` · ${tx("dlib.archived", "archived")}` : ""}
              </div>
            </div>
            <span className="hnum fs-small" style={{ fontWeight: 700 }}>{money(r.amount)}</span>
          </a>
        ))}
      </div>
      {data.rows.length >= 300 ? (
        <div className="hint">{tx("dlib.capped", "Showing the first 300 — narrow the search or the dates for the rest.")}</div>
      ) : null}
    </Screen>
  );
}

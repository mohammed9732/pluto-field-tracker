"use client";
import { useTerms } from "@/lib/terms";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, hm, money, money0, monthName } from "@/lib/fmt";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

export default function AcctDashboard() {
  const me = useMe();
  const t = useTerms();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"collections" | "recon" | "people">("collections");

  const load = useCallback(() => {
    api("/api/acctdash").then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const k = data.kpis;

  function exportCollections() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.collections.map((c: any) => ({
      Ref: c.ref, Date: c.ts.slice(0, 10), Time: c.ts.slice(11, 16), Doctor: c.doctor, Rep: c.rep,
      Method: c.method, Note: c.note ?? "", "Amount IQD": c.amount,
    }))), "Collections");
    XLSX.writeFile(wb, `collections-${data.period}.xlsx`);
  }

  async function logout() {
    await api("/api/auth/logout", { json: {} });
    router.replace("/login");
  }

  return (
    <Screen me={me} wide>
      <div className="row">
        <h4 style={{ margin: 0, flex: 1 }}>Money — {monthName(data.period)}</h4>
        <button className="btn btn-secondary btn-icon" style={{ }} onClick={logout} title="Sign out">
          <Icon d={paths.logout} size={17} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Sales MTD</div>
          <div className="hnum" style={{ fontSize: 18 }}>{money0(k.salesMTD)}</div>
        </div>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-green-deep)" }}>Collected MTD</div>
          <div className="hnum" style={{ fontSize: 18 }}>{money0(k.collectedMTD)}</div>
          <div className="small muted">today {money0(k.collectedToday)}</div>
        </div>
        <Link href="/acct/queue" className="blueprint" style={{ padding: 12, textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-coral-deep)" }}>Invoice queue</div>
          <div className="hnum" style={{ fontSize: 18 }}>{k.queueCount} waiting →</div>
        </Link>
      </div>

      <div className="seg" style={{ width: "100%", overflowX: "auto" }}>
        {([["collections", "Collections"], ["recon", "Cash check"], ["people", "People"]] as const).map(([t, label]) => (
          <label key={t} className="seg-opt" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}>
            <input type="radio" name="adtab" checked={tab === t} onChange={() => setTab(t)} />{label}
          </label>
        ))}
      </div>

      {tab === "collections" ? (
        <>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px", alignSelf: "flex-start" }} onClick={exportCollections}>Export to Excel</button>
          {data.collections.length === 0 ? <div className="card muted">Nothing collected this month yet.</div> : null}
          {data.collections.map((c: any) => (
            <div key={c.ref} className="listrow">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}><DoctorLink id={c.doctorId} name={c.doctor} /></div>
                <div className="small muted">{c.rep} · {dmy(c.ts)} {hm(c.ts)} · {c.method}{c.note ? ` · ${c.note}` : ""}</div>
              </div>
              {c.photo ? <a className="small" href={`/api/files?id=${c.photo}`} target="_blank">receipt</a> : <span className="small" style={{ color: "var(--c-amber-deep)" }}>no photo</span>}
              <span className="hnum" style={{ fontSize: 15 }}>{money(c.amount)}</span>
            </div>
          ))}
        </>
      ) : null}

      {tab === "recon" ? (
        <>
          <div className="hint">Per rep per day — match the cash column against what was physically handed in, then enter it in the accounting system.</div>
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Rep</th><th>Date</th><th style={{ textAlign: "right" }}>Cash</th><th style={{ textAlign: "right" }}>Transfer</th><th style={{ textAlign: "right" }}>Receipts</th></tr></thead>
            <tbody>
              {data.reconciliation.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.rep}</td><td>{dmy(r.date)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{r.cash ? money0(r.cash) : "—"}</td>
                  <td style={{ textAlign: "right" }}>{r.transfer ? money0(r.transfer) : "—"}</td>
                  <td style={{ textAlign: "right" }}>{r.receipts}</td>
                </tr>
              ))}
              {data.reconciliation.length === 0 ? <tr><td colSpan={5} className="muted">No payments this month.</td></tr> : null}
            </tbody>
          </table>
        </>
      ) : null}

      {tab === "people" ? (
        <>
          <div className="hint">This month per person — full detail on the <Link href="/acct/payroll">Payroll</Link> and <Link href="/spendings">Spendings</Link> pages.</div>
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Person</th><th style={{ textAlign: "right" }}>Base</th><th style={{ textAlign: "right" }}>Commission</th><th style={{ textAlign: "right" }}>Spendings</th><th style={{ textAlign: "right" }}>Deducted</th><th></th></tr></thead>
            <tbody>
              {data.people.map((p: any) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td style={{ textAlign: "right" }}>{money0(p.base)}</td>
                  <td style={{ textAlign: "right", color: "var(--c-green-deep)" }}>{p.commission ? money0(p.commission) : "—"}</td>
                  <td style={{ textAlign: "right" }}>{p.spendings ? money0(p.spendings) : "—"}</td>
                  <td style={{ textAlign: "right", color: p.deducted ? "var(--c-coral-deep)" : undefined }}>{p.deducted ? money0(p.deducted) : "—"}</td>
                  <td style={{ textAlign: "right" }}>{p.paid ? <span className="tag tag-ok">Paid</span> : <span className="tag tag-warn">Due</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
        <Link href="/acct/payouts" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>Quarterly payouts</Link>
        <Link href="/tasks" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>Tasks</Link>
        <Link href="/doctors" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{t.doctorPlural}</Link>
        <Link href="/catalog" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>Products</Link>
      </div>
    </Screen>
  );
}

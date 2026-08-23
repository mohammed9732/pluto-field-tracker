"use client";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, money, money0, monthName } from "@/lib/fmt";
import { PieChart, BarChart } from "@/components/Charts";
import * as XLSX from "xlsx";

export default function MonthlyReport() {
  const me = useMe();
  const [period, setPeriod] = useState("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const d = new Date();
    setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }, []);
  const load = useCallback(() => {
    if (!period) return;
    api(`/api/report?period=${period}`).then(setData).catch(() => {});
  }, [period]);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;

  // Built from year/month arithmetic, not by stepping a Date. setMonth keeps
  // the day-of-month, so on the 31st a step into a 30-day month overflowed
  // into the next one and skipped a month entirely.
  const monthOptions: string[] = [];
  {
    const now = new Date();
    for (let back = 3; back >= 0; back--) {
      const m = now.getMonth() - back;
      const year = now.getFullYear() + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      monthOptions.push(`${year}-${String(month + 1).padStart(2, "0")}`);
    }
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.visitRows.map((r: any) => ({
      Person: r.name, Role: r.role, City: r.city, Visits: r.visits, Plan: r.plan, "Joint visits": r.joint,
    }))), "a Visits vs plan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.salesRows.map((r: any) => ({
      Product: r.product, City: r.city, Rep: r.rep, Quantity: r.qty, Value: r.value,
    }))), "b Sales");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.achievementRows.map((r: any) => ({
      Person: r.name, Product: r.productName, Target: r.targetQty, Achieved: r.achievedQty,
      "Achievement %": Math.round(r.achievementPct), "Min %": r.minPct, Qualified: r.qualified ? "Yes" : "No",
      "Incentive $": Number(r.incentiveAmount.toFixed(2)),
    }))), "c-d Targets & incentives");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([data.funnel]), "e Orders funnel");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.stock.map((s: any) => ({
      Product: s.product, Quantity: s.qty, Expiry: s.expiry ?? "", Low: s.low ? "LOW" : "", "Near expiry": s.nearExpiry ? "NEAR" : "",
    }))), "f Stock");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.leaves.map((l: any) => ({
      Person: l.name, From: l.start, To: l.end, Type: l.type,
    }))), "g Leaves");
    XLSX.writeFile(wb, `pluto-report-${period}.xlsx`);
  }

  const S = ({ letter, title, children }: { letter: string; title: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="hnum" style={{ fontSize: 15, color: "var(--color-accent-700)" }}>{letter}</span>
        <h6 style={{ margin: 0 }}>{title}</h6>
      </div>
      {children}
    </div>
  );

  return (
    <Screen me={me} wide>
        <div className="row no-print" style={{ flexWrap: "wrap", gap: 10 }}>
          <h4 style={{ margin: 0 }}>Monthly report</h4>
          <select className="input" style={{ width: "auto" }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {monthOptions.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ padding: "9px 16px" }} onClick={() => window.print()}>Export PDF</button>
            <button className="btn btn-secondary" style={{ padding: "9px 16px" }} onClick={exportExcel}>Export Excel</button>
          </div>
        </div>
        <div style={{ display: "none" }} className="print-title">
          <h3>Pluto Field Tracker — {monthName(period)}</h3>
        </div>

        <S letter="a" title="Visits vs plan (incl. joint visits)">
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Person</th><th style={{ textAlign: "right" }}>Visits</th><th style={{ textAlign: "right" }}>Plan</th><th style={{ textAlign: "right" }}>Joint</th><th style={{ textAlign: "right" }}>Samples</th></tr></thead>
            <tbody>
              {data.visitRows.map((r: any) => (
                <tr key={r.name}><td>{r.name}</td><td style={{ textAlign: "right", fontWeight: 700 }}>{r.visits}</td><td style={{ textAlign: "right" }}>{r.plan}</td><td style={{ textAlign: "right" }}>{r.joint}</td><td style={{ textAlign: "right", color: "var(--c-violet-deep)" }}>{r.samples || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </S>

        <S letter="b" title="Sales — qty & value per product × rep">
          <div className="two-col" style={{ gap: 20, marginBottom: 6 }}>
            <div>
              <div className="small muted" style={{ marginBottom: 4 }}>Sales value by product</div>
              <PieChart data={Object.values(
                data.salesRows.reduce((acc: any, r: any) => {
                  acc[r.product] = acc[r.product] ?? { label: r.product, value: 0 };
                  acc[r.product].value += r.value;
                  return acc;
                }, {})
              )} />
            </div>
            <div>
              <div className="small muted" style={{ marginBottom: 4 }}>Sales value by rep</div>
              <BarChart format={(v) => money0(v).replace(" IQD", "")} data={Object.values(
                data.salesRows.reduce((acc: any, r: any) => {
                  acc[r.rep] = acc[r.rep] ?? { label: r.rep.split(" ")[0], value: 0 };
                  acc[r.rep].value += r.value;
                  return acc;
                }, {})
              )} />
            </div>
          </div>
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Product</th><th>City</th><th>Rep</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Value</th></tr></thead>
            <tbody>
              {data.salesRows.map((r: any, i: number) => (
                <tr key={i}><td>{r.product}</td><td>{r.city}</td><td>{r.rep}</td><td style={{ textAlign: "right" }}>{r.qty}</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(r.value)}</td></tr>
              ))}
              {data.salesRows.length === 0 ? <tr><td colSpan={5} className="muted">No approved sales this month.</td></tr> : null}
            </tbody>
          </table>
        </S>

        <S letter="c" title="Target achievement %">
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Person</th><th>Product</th><th style={{ textAlign: "right" }}>Achieved</th><th style={{ textAlign: "right" }}>%</th><th style={{ textAlign: "right" }}>Min</th></tr></thead>
            <tbody>
              {data.achievementRows.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.name}</td><td>{r.productName}</td>
                  <td style={{ textAlign: "right" }}>{r.achievedQty}/{r.targetQty}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: r.qualified ? "var(--c-green-deep)" : "var(--c-amber-deep)" }}>{Math.round(r.achievementPct)}%</td>
                  <td style={{ textAlign: "right", color: "var(--color-neutral-600)" }}>{r.minPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </S>

        <S letter="d" title="Incentives accrued">
          <div className="row" style={{ alignItems: "baseline" }}>
            <span className="hnum" style={{ fontSize: 28 }}>{money(data.incentivesTotal)}</span>
            <span className="small muted">across {new Set(data.achievementRows.filter((r: any) => r.incentiveAmount > 0).map((r: any) => r.name)).size} people · collected in month: {money(data.collected)}</span>
          </div>
        </S>

        <S letter="e" title="Orders funnel">
          <div className="two-col" style={{ gap: 20, marginBottom: 6 }}>
            <PieChart data={[
              { label: "Invoiced", value: data.funnel.invoiced },
              { label: "Approved", value: data.funnel.approved },
              { label: "Pending", value: data.funnel.pending },
              { label: "Rejected", value: data.funnel.rejected },
            ]} />
            <BarChart data={data.visitRows.map((r: any) => ({ label: r.name.split(" ")[0], value: r.visits }))} />
          </div>
          <div className="row" style={{ gap: 14, fontSize: 13, flexWrap: "wrap" }}>
            <span><b>{data.funnel.total}</b> total</span>
            <span className="tag tag-warn">{data.funnel.pending} pending</span>
            <span className="tag tag-ok">{data.funnel.approved} approved</span>
            <span className="tag tag-hot">{data.funnel.rejected} rejected</span>
            <span className="tag tag-chat">{data.funnel.invoiced} invoiced</span>
            <span style={{ marginLeft: "auto" }}>value {money(data.funnel.value)}</span>
          </div>
        </S>

        <S letter="f" title="Stock position & expiry alerts">
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Product</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Expiry</th></tr></thead>
            <tbody>
              {data.stock.map((s: any) => (
                <tr key={s.product}>
                  <td>{s.product}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: s.low ? "var(--c-coral-deep)" : undefined }}>{s.qty}{s.low ? " · low" : ""}</td>
                  <td style={{ textAlign: "right", color: s.nearExpiry ? "var(--c-amber-deep)" : "var(--color-neutral-600)" }}>{s.expiry ? s.expiry.slice(0, 7) : "—"}{s.nearExpiry ? " · near" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </S>

        {data.competitors?.length ? (
          <S letter="h" title="Competitor activity seen in the field">
            <table className="table" style={{ fontSize: 12 }}>
              <thead><tr><th>Competitor</th><th>Product</th><th>Doctor</th><th style={{ textAlign: "right" }}>Their price</th><th>Seen by</th></tr></thead>
              <tbody>
                {data.competitors.map((c: any, i: number) => (
                  <tr key={i}>
                    <td>{c.competitor}</td><td>{c.product || "—"}</td><td>{c.doctor}</td>
                    <td style={{ textAlign: "right" }}>{c.price ? money(c.price) : "—"}</td>
                    <td>{c.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </S>
        ) : null}

        <S letter="g" title="Leaves taken">
          {data.leaves.length === 0 ? <div className="small muted">No approved leave this month.</div> : (
            <table className="table" style={{ fontSize: 12 }}>
              <thead><tr><th>Person</th><th>From</th><th>To</th><th>Type</th></tr></thead>
              <tbody>
                {data.leaves.map((l: any, i: number) => (
                  <tr key={i}><td>{l.name}</td><td>{dmy(l.start)}</td><td>{dmy(l.end)}</td><td>{l.type}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </S>

        <div className="hint">Generated {dmy(data.generatedAt)} {data.generatedAt.slice(11, 16)} · Asia/Baghdad · Export PDF uses your browser&apos;s print dialog.</div>
    </Screen>
  );
}

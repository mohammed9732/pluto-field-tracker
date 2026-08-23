"use client";
import { MascotNote } from "@/components/MascotNote";
import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner, Meter } from "@/components/Shell";
import { PerformanceView } from "@/components/PerformanceView";
import { api, money, monthName } from "@/lib/fmt";

export default function Progress() {
  const tx = useT();
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [perf, setPerf] = useState<any>(null);
  const [tab, setTab] = useState<"targets" | "performance">("targets");

  const load = useCallback(() => {
    api("/api/field").then(setData).catch(() => {});
    api("/api/performance").then(setPerf).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const period = data.today.slice(0, 7);
  const perfOn = perf?.enabled;

  return (
    <Screen me={me}>
      <div>
        <h4 style={{ margin: "0 0 2px" }}>{tx("prog.progress", "Progress")}</h4>
        <div className="small muted fs-caption">{monthName(period)} · approved + invoiced orders count</div>
      </div>

      {perfOn ? (
        <div className="seg" style={{ width: "100%" }}>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="ptab" checked={tab === "targets"} onChange={() => setTab("targets")} />Targets &amp; pay
          </label>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="ptab" checked={tab === "performance"} onChange={() => setTab("performance")} />{tx("prog.performance", "Performance")}
          </label>
        </div>
      ) : null}

      {tab === "performance" && perfOn ? (
        <PerformanceView data={perf} />
      ) : (
        <>
          {data.accrual.length === 0 ? (
            <MascotNote title={tx("prog.noTargetsThisMonthPh", "No targets this month")}
              body="Your manager has not set targets yet. Keep visiting — the numbers still count once they do." />
          ) : null}

          {data.accrual.length > 0 && data.accrual.some((r: any) => !r.qualified) ? (
            <MascotNote mood="sad" tone="sorry" size={58}
              title={`${data.accrual.filter((r: any) => !r.qualified).length} still under the minimum`}
              body="There is time left this month. Look at which doctors you have not reached yet — that is usually where the gap is." />
          ) : null}
          {data.accrual.map((r: any) => {
            const pct = Math.round(r.achievementPct);
            return (
              <div key={r.productId} className="card gap-2">
                <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{r.productName}</span>
                  <span className={`tag ${r.qualified ? "tag-ok" : "tag-warn"}`}>{r.qualified ? "Qualified" : "Below min"}</span>
                </div>
                <div className="row" style={{ alignItems: "baseline", gap: 6, fontSize: 12, color: "var(--color-neutral-600)" }}>
                  <span className="hnum" style={{ fontSize: 22, color: "var(--color-text)" }}>{r.achievedQty}</span>
                  <span>/ {r.targetQty} boxes · {pct}%</span>
                  <span style={{ marginLeft: "auto" }}>min {r.minPct}%</span>
                </div>
                <Meter pct={pct} min={r.minPct} gray={!r.qualified} />
                <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                  Incentive this month:{" "}
                  <span style={{ fontWeight: 700, color: r.qualified ? "var(--color-accent-700)" : undefined }}>{money(r.incentiveAmount)}</span>{" "}
                  {r.qualified ? null : (
                    <span style={{ color: "var(--color-neutral-500)" }}>— {Math.max(0, r.minPct - pct)}% short of minimum</span>
                  )}
                </div>
              </div>
            );
          })}

          <div className="blueprint" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 2, marginTop: "auto" }}>
            <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              {data.quarter.name.replace("-", " ")} {tx("prog.incentiveAccrued", "incentive accrued")}
            </div>
            <div className="row items-base">
              <span className="hnum fs-figure">{money(data.quarter.total)}</span>
              <span className="tag tag-outline">{tx("prog.accrued", "Accrued")}</span>
            </div>
            <div className="small muted">
              {data.quarter.months.map((m: any) => `${monthName(m.period).split(" ")[0].slice(0, 3)} ${money(m.amount + (m.commission ?? 0))}`).join(" · ")}
            </div>
            {data.quarter.commission > 0 ? (
              <div className="small muted">
                {tx("prog.targetIncentives", "Target incentives")} {money(data.quarter.incentives)} + {tx("prog.salesCommission", "sales commission")} {money(data.quarter.commission)} — {tx("prog.paidQuarterly", "paid quarterly, read-only")}
              </div>
            ) : (
              <div className="small muted">{tx("prog.paidQuarterlyReadOnly", "Paid quarterly, read-only")}</div>
            )}
          </div>
        </>
      )}
    </Screen>
  );
}

"use client";
import { CountUp } from "@/components/CountUp";
import { term, useTerms } from "@/lib/terms";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen, useMe, Spinner, Meter } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, money0, weekdayShort } from "@/lib/fmt";
import { MoneyLine } from "@/components/Charts";

const monthLbl = (p: string) => new Date(p + "-15T12:00:00").toLocaleDateString("en", { month: "short" });

export default function AdminDashboard() {
  const tx = useT();
  const terms = useTerms();
  const me = useMe();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api("/api/dashboard").then(setData).catch(() => {});
  }, []);
  if (!me || !data) return <Spinner />;
  const k = data.kpis;

  async function logout() {
    await api("/api/auth/logout", { json: {} });
    router.replace("/login");
  }

  return (
    <Screen me={me} wide>
        <div className="row">
          <div className="f1">
            <div className="hnum fs-lead">{tx("owner.companyToday", "Company today")}</div>
            <div className="small muted">{me.name} · Owner · {weekdayShort(data.today)} {dmy(data.today)}</div>
          </div>
          <button className="btn btn-secondary btn-icon" style={{ }} onClick={logout} title={tx("owner.signOutPh", "Sign out")}>
            <Icon d={paths.logout} size={17} />
          </button>
        </div>

        <div className="kpi-grid">
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">{tx("owner.visitsToday", "Visits today")}</span>
            <span className="hnum fs-h2"><CountUp value={k.visitsToday} /><span style={{ fontSize: 15, color: "var(--color-neutral-600)" }}> / {k.minToday} min</span></span>
            <span className="small muted fs-caption">{[
              k.onLeaveCount ? tx("owner.onLeave", "{n} on leave").replace("{n}", String(k.onLeaveCount)) : "",
              k.outOfLocationToday ? `⚠ ${tx("owner.outOfLocation", "{n} out-of-location").replace("{n}", String(k.outOfLocationToday))}` : "",
            ].filter(Boolean).join(" · ") || tx("owner.fullTeamIn", "full team in")}</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">{tx("owner.salesMtd", "Sales MTD")}</span>
            <span className="hnum fs-h2"><CountUp value={k.salesValue} format={money0} /></span>
            <span className="small muted fs-caption">{k.salesBoxes} {tx("owner.boxes", "boxes")}</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">{tx("owner.pendingOrders", "Pending orders")}</span>
            <span className="hnum fs-h2"><CountUp value={k.pendingCount} /><span style={{ fontSize: 15, color: "var(--color-neutral-600)" }}> · {money0(k.pendingValue)}</span></span>
            <span className="small muted fs-caption">{tx("owner.awaitingApproval", "awaiting approval")}</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">{tx("owner.stockAlerts", "Stock alerts")}</span>
            <span className="hnum" style={{ fontSize: 28, color: k.stockAlerts.length ? "var(--c-coral-deep)" : undefined }}><CountUp value={k.stockAlerts.length} /></span>
            <span className="small muted fs-caption">{k.stockAlerts.slice(0, 2).join(" · ") || "all healthy"}</span>
          </div>
        </div>

        {/* The growth line the owner asked for: is the company getting
            bigger, month on month — and is the cash keeping up with sales? */}
        <div className="card" style={{ gap: 6 }}>
          <h6 className="m0">{tx("chart.salesGrowth", "Sales & money in — last 12 months")}</h6>
          <MoneyLine
            rows={(data.monthly ?? []).map((r: any) => ({ label: monthLbl(r.period), sales: r.sales, collected: r.collected }))}
            series={[
              { key: "sales", name: tx("chart.sales", "Sales"), color: "var(--color-accent)" },
              { key: "collected", name: tx("chart.collected", "Collected"), color: "var(--c-green-deep)" },
            ]} />
        </div>

        <div className="two-col">
          <div className="stack-2">
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("owner.visitsVsMinimumThis", "Visits vs minimum — this week")}</h6>
            <table className="table fs-caption">
              <thead><tr><th>{tx("owner.person", "Person")}</th><th className="ta-r">{tx("owner.visits", "Visits")}</th><th className="ta-r">{tx("owner.plan", "Plan")}</th><th className="ta-r">{tx("owner.joint", "Joint")}</th></tr></thead>
              <tbody>
                {data.weekRows.map((r: any) => (
                  <tr key={r.name}>
                    <td>{r.name}{r.city && r.city !== "All cities" ? ` · ${r.city}` : ""}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{r.visits}</td>
                    <td style={{ textAlign: "right", color: "var(--color-neutral-600)" }}>{r.plan}</td>
                    <td className="ta-r">{r.joint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="stack-2">
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("owner.salesByProductCity", "Sales by product × city — this month (boxes)")}</h6>
            <table className="table fs-caption">
              <thead><tr><th>{tx("owner.product", "Product")}</th>{(data.cities ?? []).map((c: any) => (<th key={c.id} className="ta-r">{c.name}</th>))}<th className="ta-r">{tx("owner.value", "Value")}</th></tr></thead>
              <tbody>
                {data.salesMatrix.map((r: any) => (
                  <tr key={r.product}>
                    <td>{r.product}</td>
                    {(data.cities ?? []).map((c: any) => (
                      <td key={c.id} className="ta-r">{r.byCity?.[c.id] ?? 0}</td>
                    ))}
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{money0(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack-2">
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("owner.targetHeatThisMonth", "Target heat — this month")}</h6>
          {data.heat.map((h: any) => (
            <div key={h.city} className="row fs-caption">
              <span style={{ width: 60 }}>{h.label}</span>
              <div className="f1"><Meter pct={h.pct} gray={h.pct < 60} /></div>
              <b style={{ width: 34, textAlign: "right", color: h.pct < 60 ? "var(--c-coral-deep)" : undefined }}>{h.pct}%</b>
            </div>
          ))}
        </div>

        <div className="stack-2">
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("owner.goTo", "Go to")}</h6>
          {[
            ["/admin/map", `${tx("owner.liveTeamMap", "Live team map")} · ${tx("owner.inField", "{n} in field").replace("{n}", String(k.inField))}`],
            ["/approvals", `${tx("nav.approvals", "Approvals")} · ${tx("owner.nOrders", "{n} orders").replace("{n}", String(k.pendingCount))}${data.pendingPlans ? ` · ${tx("owner.nPlans", "{n} plans").replace("{n}", String(data.pendingPlans))}` : ""}`],
            ["/summary", tx("nav.daySummary", "Day summary")],
            ["/admin/report", tx("nav.monthlyReport", "Monthly report")],
            ["/competitors", tx("nav.marketIntel", "Market intel")],
            ["/catalog", tx("owner.productsBrochures", "Products & brochures")],
            ["/performance", tx("owner.teamPerformance", "Team performance")],
            ["/tasks", tx("nav.tasks", "Tasks")],
            ["/spendings", tx("nav.spendings", "Spendings")],
            ["/admin/manage", tx("nav.usersProducts", "Users · Products")],
            ["/doctors", term(terms, "doctorPlural", "nav.doctors")],
            ["/acct", "Money dashboard (accountant view)"],
            ["/acct/queue", tx("queue.invoicingQueue", "Invoicing queue")],
            ["/acct/payroll", tx("owner.payrollPayouts", "Payroll & payouts")],
            ["/admin/settings", tx("owner.controlPanelLine", "Control panel — switches & metrics")],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="listrow" style={{ fontSize: 13, textDecoration: "none", color: "inherit" }}>
              <span className="f1">{label}</span>
              <span style={{ color: "var(--color-neutral-400)" }}>→</span>
            </Link>
          ))}
        </div>
        <div className="hint mt-auto">{tx("owner.sameDataFooter", "Same data on desktop and phone — the owner's view for the road.")}</div>
    </Screen>
  );
}

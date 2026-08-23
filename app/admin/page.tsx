"use client";
import { CountUp } from "@/components/CountUp";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen, useMe, Spinner, Meter } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, money0, weekdayShort } from "@/lib/fmt";

export default function AdminDashboard() {
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
            <div className="hnum fs-lead">Company today</div>
            <div className="small muted">{me.name} · Owner · {weekdayShort(data.today)} {dmy(data.today)}</div>
          </div>
          <button className="btn btn-secondary btn-icon" style={{ }} onClick={logout} title="Sign out">
            <Icon d={paths.logout} size={17} />
          </button>
        </div>

        <div className="kpi-grid">
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Visits today</span>
            <span className="hnum fs-h2"><CountUp value={k.visitsToday} /><span style={{ fontSize: 15, color: "var(--color-neutral-600)" }}> / {k.minToday} min</span></span>
            <span className="small muted fs-caption">{[k.onLeaveCount ? `${k.onLeaveCount} on leave` : "", k.outOfLocationToday ? `⚠ ${k.outOfLocationToday} out-of-location` : ""].filter(Boolean).join(" · ") || "full team in"}</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Sales MTD</span>
            <span className="hnum fs-h2"><CountUp value={k.salesValue} format={money0} /></span>
            <span className="small muted fs-caption">{k.salesBoxes} boxes · 3 cities</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Pending orders</span>
            <span className="hnum fs-h2"><CountUp value={k.pendingCount} /><span style={{ fontSize: 15, color: "var(--color-neutral-600)" }}> · {money0(k.pendingValue)}</span></span>
            <span className="small muted fs-caption">awaiting approval</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Stock alerts</span>
            <span className="hnum" style={{ fontSize: 28, color: k.stockAlerts.length ? "var(--c-coral-deep)" : undefined }}><CountUp value={k.stockAlerts.length} /></span>
            <span className="small muted fs-caption">{k.stockAlerts.slice(0, 2).join(" · ") || "all healthy"}</span>
          </div>
        </div>

        <div className="two-col">
          <div className="stack-2">
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Visits vs minimum — this week</h6>
            <table className="table fs-caption">
              <thead><tr><th>Person</th><th className="ta-r">Visits</th><th className="ta-r">Plan</th><th className="ta-r">Joint</th></tr></thead>
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
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Sales by product × city — this month (boxes)</h6>
            <table className="table fs-caption">
              <thead><tr><th>Product</th>{(data.cities ?? []).map((c: any) => (<th key={c.id} className="ta-r">{c.name}</th>))}<th className="ta-r">Value</th></tr></thead>
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
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Target heat — this month</h6>
          {data.heat.map((h: any) => (
            <div key={h.city} className="row fs-caption">
              <span style={{ width: 60 }}>{h.label}</span>
              <div className="f1"><Meter pct={h.pct} gray={h.pct < 60} /></div>
              <b style={{ width: 34, textAlign: "right", color: h.pct < 60 ? "var(--c-coral-deep)" : undefined }}>{h.pct}%</b>
            </div>
          ))}
        </div>

        <div className="stack-2">
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Go to</h6>
          {[
            ["/admin/map", `Live team map · ${k.inField} in field`],
            ["/approvals", `Approvals · ${k.pendingCount} orders${data.pendingPlans ? ` · ${data.pendingPlans} plans` : ""}`],
            ["/summary", "Day summary"],
            ["/admin/report", "Monthly report"],
            ["/competitors", "Market intel"],
            ["/catalog", "Products & brochures"],
            ["/performance", "Team performance"],
            ["/tasks", "Tasks"],
            ["/spendings", "Spendings"],
            ["/admin/manage", "Users · Products"],
            ["/doctors", "Doctors directory"],
            ["/acct", "Money dashboard (accountant view)"],
            ["/acct/queue", "Invoicing queue"],
            ["/acct/payroll", "Payroll & payouts"],
            ["/admin/settings", "Control panel — switches & metrics"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="listrow" style={{ fontSize: 13, textDecoration: "none", color: "inherit" }}>
              <span className="f1">{label}</span>
              <span style={{ color: "var(--color-neutral-400)" }}>→</span>
            </Link>
          ))}
        </div>
        <div className="hint mt-auto">Same data on desktop and phone — the owner&apos;s view for the road.</div>
    </Screen>
  );
}

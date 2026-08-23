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
          <div style={{ flex: 1 }}>
            <div className="hnum" style={{ fontSize: 18 }}>Company today</div>
            <div className="small muted">{me.name} · Owner · {weekdayShort(data.today)} {dmy(data.today)}</div>
          </div>
          <button className="btn btn-secondary btn-icon" style={{ }} onClick={logout} title="Sign out">
            <Icon d={paths.logout} size={17} />
          </button>
        </div>

        <div className="kpi-grid">
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Visits today</span>
            <span className="hnum" style={{ fontSize: 28 }}><CountUp value={k.visitsToday} /><span style={{ fontSize: 15, color: "var(--color-neutral-600)" }}> / {k.minToday} min</span></span>
            <span className="small muted" style={{ fontSize: 12 }}>{[k.onLeaveCount ? `${k.onLeaveCount} on leave` : "", k.outOfLocationToday ? `⚠ ${k.outOfLocationToday} out-of-location` : ""].filter(Boolean).join(" · ") || "full team in"}</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Sales MTD</span>
            <span className="hnum" style={{ fontSize: 28 }}><CountUp value={k.salesValue} format={money0} /></span>
            <span className="small muted" style={{ fontSize: 12 }}>{k.salesBoxes} boxes · 3 cities</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Pending orders</span>
            <span className="hnum" style={{ fontSize: 28 }}><CountUp value={k.pendingCount} /><span style={{ fontSize: 15, color: "var(--color-neutral-600)" }}> · {money0(k.pendingValue)}</span></span>
            <span className="small muted" style={{ fontSize: 12 }}>awaiting approval</span>
          </div>
          <div className="card" style={{ gap: 2, padding: 12 }}>
            <span className="card-kicker">Stock alerts</span>
            <span className="hnum" style={{ fontSize: 28, color: k.stockAlerts.length ? "var(--c-coral-deep)" : undefined }}><CountUp value={k.stockAlerts.length} /></span>
            <span className="small muted" style={{ fontSize: 12 }}>{k.stockAlerts.slice(0, 2).join(" · ") || "all healthy"}</span>
          </div>
        </div>

        <div className="two-col">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Visits vs minimum — this week</h6>
            <table className="table" style={{ fontSize: 12 }}>
              <thead><tr><th>Person</th><th style={{ textAlign: "right" }}>Visits</th><th style={{ textAlign: "right" }}>Plan</th><th style={{ textAlign: "right" }}>Joint</th></tr></thead>
              <tbody>
                {data.weekRows.map((r: any) => (
                  <tr key={r.name}>
                    <td>{r.name}{r.city && r.city !== "All cities" ? ` · ${r.city}` : ""}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{r.visits}</td>
                    <td style={{ textAlign: "right", color: "var(--color-neutral-600)" }}>{r.plan}</td>
                    <td style={{ textAlign: "right" }}>{r.joint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Sales by product × city — this month (boxes)</h6>
            <table className="table" style={{ fontSize: 12 }}>
              <thead><tr><th>Product</th>{(data.cities ?? []).map((c: any) => (<th key={c.id} style={{ textAlign: "right" }}>{c.name}</th>))}<th style={{ textAlign: "right" }}>Value</th></tr></thead>
              <tbody>
                {data.salesMatrix.map((r: any) => (
                  <tr key={r.product}>
                    <td>{r.product}</td>
                    {(data.cities ?? []).map((c: any) => (
                      <td key={c.id} style={{ textAlign: "right" }}>{r.byCity?.[c.id] ?? 0}</td>
                    ))}
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{money0(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Target heat — this month</h6>
          {data.heat.map((h: any) => (
            <div key={h.city} className="row" style={{ fontSize: 12 }}>
              <span style={{ width: 60 }}>{h.label}</span>
              <div style={{ flex: 1 }}><Meter pct={h.pct} gray={h.pct < 60} /></div>
              <b style={{ width: 34, textAlign: "right", color: h.pct < 60 ? "var(--c-coral-deep)" : undefined }}>{h.pct}%</b>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ color: "var(--color-neutral-400)" }}>→</span>
            </Link>
          ))}
        </div>
        <div className="hint" style={{ marginTop: "auto" }}>Same data on desktop and phone — the owner&apos;s view for the road.</div>
    </Screen>
  );
}

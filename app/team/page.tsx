"use client";
import { term, useTerms } from "@/lib/terms";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Screen, useMe, Spinner, Pips, Meter } from "@/components/Shell";
import { api, dm, dmy, durationHM, hm, weekdayShort } from "@/lib/fmt";
import { HBars, MoneyLine } from "@/components/Charts";

const monthLbl = (p: string) => new Date(p + "-15T12:00:00").toLocaleDateString("en", { month: "short" });
import { Icon, paths } from "@/components/Icons";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

export default function Team() {
  const tx = useT();
  const me = useMe();
  const t = useTerms();
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api("/api/team").then(setData).catch(() => {});
  }, []);
  if (!me || !data) return <Spinner />;

  return (
    <Screen me={me}>
      <div>
        <h4 style={{ margin: "0 0 2px" }}>{tx("team.teamToday", "Team today")}</h4>
        <div className="small muted fs-caption">{weekdayShort(data.today)} {dmy(data.today)}</div>
      </div>

      <div className="card" style={{ gap: 6 }}>
        <h6 className="m0">{tx("chart.salesGrowth12", "Sales growth — last 12 months")}</h6>
        <MoneyLine height={170}
          rows={(data.monthly ?? []).map((r: any) => ({ label: monthLbl(r.period), sales: r.sales }))}
          series={[{ key: "sales", name: tx("chart.sales", "Sales"), color: "var(--color-accent)" }]} />
      </div>
      {(data.repSales ?? []).length ? (
        <div className="card" style={{ gap: 8 }}>
          <h6 className="m0">{tx("chart.whoSoldWhat", "Who sold what — this month")}</h6>
          <HBars rows={data.repSales} />
        </div>
      ) : null}
      {data.rows.map((r: any) => (
        <div key={r.userId} className="card gap-3">
          <div className="row gap-2">
            <span style={{ width: 7, height: 7, borderRadius: 999, background: r.checkedIn ? "var(--color-accent)" : "var(--color-neutral-400)", flex: "none" }} />
            <div className="f1">
              <div style={{ fontSize: 15, fontWeight: 500 }}>{r.name} · {r.cityLabel}</div>
              <div className="small muted">{r.phone}</div>
              <div className="small muted">
                {r.onLeave
                  ? "Not checked in — on approved leave today"
                  : r.checkedIn
                    ? `Checked in ${r.lastInAt ? hm(r.lastInAt) : ""} · in field ${durationHM(r.fieldMinutes)}`
                    : r.lastInAt
                      ? `Checked out · ${durationHM(r.fieldMinutes)} today`
                      : "Not checked in yet"}
              </div>
            </div>
            <span className="hnum" style={{ fontSize: 18, color: r.onLeave ? "var(--color-neutral-500)" : "var(--color-accent-700)" }}>
              {r.onLeave ? "—" : `${r.todayVisits}/${r.dailyMin}`}
            </span>
            <CallButton phone={r.phone} name={r.name} />
            <Link href={`/chat?channel=${r.dmChannel}`} aria-label={`Message ${r.name}`} title={`Message ${r.name}`}
              style={{ width: 40, height: 40, borderRadius: 999, background: "var(--c-violet-soft)", display: "grid", placeItems: "center", flex: "none" }}>
              <Icon d={paths.chat} size={15} stroke="var(--c-violet-deep)" />
            </Link>
          </div>
          {r.onLeave ? (
            <div className="small" style={{ color: "var(--color-neutral-500)" }}>{tx("team.leaveUntil", "Leave until")} {dm(r.leaveUntil)} · {tx("team.excludedFromMinimums", "excluded from minimums")}</div>
          ) : (
            <>
              <Pips done={r.todayVisits} total={r.dailyMin} />
              <div className="row" style={{ gap: 14, fontSize: 12, color: "var(--color-neutral-600)", flexWrap: "wrap" }}>
                {r.products.map((p: any) => (
                  <span key={p.name}>{p.name} <b style={{ color: p.pct >= 70 ? "var(--color-accent-700)" : undefined }}>{p.pct}%</b></span>
                ))}
                <Link href={`/map?userId=${r.userId}`} className="small" style={{ marginLeft: "auto" }}>{tx("team.mapView", "Map view")}</Link>
              </div>
              {r.outOfLocationVisits?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignSelf: "stretch" }}>
                  <div className="tag tag-hot self-start">
                    {/* One sentence with the number dropped in: Arabic does not
                        pluralise by adding an s, so it cannot be assembled from
                        fragments the way the English was. */}
                    ⚠ {tx("team.outOfLocationWeek", "{n} out-of-location visits this week").replace("{n}", String(r.outOfLocationVisits.length))}
                  </div>
                  {r.outOfLocationVisits.map((v: any) => (
                    <Link key={v.id} href={`/doctors/${v.doctorId}`} className="small"
                      style={{ color: "var(--c-coral-deep)", textDecoration: "none" }}>
                      {dm(v.date)} {v.time} · {v.doctorName}
                      {v.noGps ? " · no GPS signal" : ""}
                    </Link>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("team.thisWeekVsPlan", "This week vs plan")}</h6>
        <div className="row" style={{ gap: 10, fontSize: 12, color: "var(--color-neutral-600)" }}>
          <span>{tx("team.teamVisits", "Team visits")} <b style={{ color: "var(--color-text)" }}>{data.week.visits}/{data.week.plan}</b></span>
          <span>{tx("team.jointVisits", "Joint visits")} <b style={{ color: "var(--color-text)" }}>{data.week.joint}</b></span>

        </div>
        <Meter pct={data.week.plan ? (data.week.visits / data.week.plan) * 100 : 0} />
      </div>
      <div className="two">
        <Link href="/targets" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{tx("team.setTargets", "Set targets")}</Link>
        <Link href="/doctors" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{term(t, "doctorPlural", "nav.doctors")}</Link>
        <Link href="/summary" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{tx("team.daySummary", "Day summary")}</Link>
        <Link href="/competitors" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{tx("team.marketIntel", "Market intel")}</Link>
      </div>
    </Screen>
  );
}

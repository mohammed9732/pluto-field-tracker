"use client";
import { useTerms } from "@/lib/terms";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Screen, useMe, Spinner, Pips, Meter } from "@/components/Shell";
import { api, dm, dmy, durationHM, hm, weekdayShort } from "@/lib/fmt";
import { Icon, paths } from "@/components/Icons";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

export default function Team() {
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
        <h4 style={{ margin: "0 0 2px" }}>Team today</h4>
        <div className="small muted" style={{ fontSize: 12 }}>{weekdayShort(data.today)} {dmy(data.today)}</div>
      </div>
      {data.rows.map((r: any) => (
        <div key={r.userId} className="card" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: r.checkedIn ? "var(--color-accent)" : "var(--color-neutral-400)", flex: "none" }} />
            <div style={{ flex: 1 }}>
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
            <div className="small" style={{ color: "var(--color-neutral-500)" }}>Leave until {dm(r.leaveUntil)} · excluded from minimums</div>
          ) : (
            <>
              <Pips done={r.todayVisits} total={r.dailyMin} />
              <div className="row" style={{ gap: 14, fontSize: 12, color: "var(--color-neutral-600)", flexWrap: "wrap" }}>
                {r.products.map((p: any) => (
                  <span key={p.name}>{p.name} <b style={{ color: p.pct >= 70 ? "var(--color-accent-700)" : undefined }}>{p.pct}%</b></span>
                ))}
                <Link href={`/map?userId=${r.userId}`} className="small" style={{ marginLeft: "auto" }}>Map view</Link>
              </div>
              {r.outOfLocationVisits?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignSelf: "stretch" }}>
                  <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>
                    ⚠ {r.outOfLocationVisits.length} out-of-location visit{r.outOfLocationVisits.length === 1 ? "" : "s"} this week
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
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>This week vs plan</h6>
        <div className="row" style={{ gap: 10, fontSize: 12, color: "var(--color-neutral-600)" }}>
          <span>Team visits <b style={{ color: "var(--color-text)" }}>{data.week.visits}/{data.week.plan}</b></span>
          <span>Joint visits <b style={{ color: "var(--color-text)" }}>{data.week.joint}</b></span>

        </div>
        <Meter pct={data.week.plan ? (data.week.visits / data.week.plan) * 100 : 0} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Link href="/targets" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>Set targets</Link>
        <Link href="/doctors" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{t.doctorPlural}</Link>
        <Link href="/summary" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>Day summary</Link>
        <Link href="/competitors" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>Market intel</Link>
      </div>
    </Screen>
  );
}

"use client";
import { Meter } from "@/components/Shell";
import { DoctorLink } from "@/components/DoctorLink";
import { durationHM, money, monthName } from "@/lib/fmt";

// Shared by the rep's Progress tab and the manager's team view.
export function PerformanceView({ data }: { data: any }) {
  const v = data.visits;
  const hitRate = v.required > 0 ? Math.round((v.total / v.required) * 100) : 0;
  return (
    <>
      {/* Visits — spelled out so the numbers explain themselves. */}
      <div className="card" style={{ gap: 8 }}>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <h6 style={{ margin: 0, flex: 1 }}>Visits this month</h6>
          <span className="hnum" style={{ fontSize: 28 }}>{v.total}</span>
          <span className="small muted">of {v.required} expected</span>
        </div>
        <Meter pct={hitRate} gray={hitRate < 80} />
        <div className="small muted">
          {data.dailyMin} per day × {v.workedDays} working days so far
          {v.leaveDays > 0 ? ` (${v.leaveDays} leave day${v.leaveDays === 1 ? "" : "s"} excluded)` : ""} · {hitRate}% of expected
        </div>
        <div className="row" style={{ gap: 14, fontSize: 12, color: "var(--color-neutral-600)", flexWrap: "wrap" }}>
          <span>Average <b style={{ color: "var(--color-text)" }}>{v.perDayAvg}/day</b></span>
          <span>Joint visits <b style={{ color: "var(--color-text)" }}>{v.joint}</b></span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-coral-deep)" }}>Field time</div>
          <div className="hnum" style={{ fontSize: 22 }}>{durationHM(data.field.avgMinutes)}</div>
          <div className="small muted">average per day worked</div>
          {data.field.missedDays > 0 ? (
            <div className="small" style={{ color: "var(--c-amber-deep)" }}>{data.field.missedDays} day(s) never started</div>
          ) : null}
        </div>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-green-deep)" }}>Collected</div>
          <div className="hnum" style={{ fontSize: 18 }}>{money(data.collected)}</div>
          <div className="small muted">this month</div>
        </div>
      </div>

      {/* Coverage — explained in words, not a bar. */}
      <div className="card" style={{ gap: 8 }}>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <h6 style={{ margin: 0, flex: 1 }}>Doctors reached</h6>
          <span className="hnum" style={{ fontSize: 22 }}>{data.coverage.visited}</span>
          <span className="small muted">of {data.coverage.total}{data.cityLabel ? ` in ${data.cityLabel}` : ""}</span>
        </div>
        <div className="small muted">
          How many different doctors were visited at least once this month — the rest have not been seen yet.
        </div>
        {data.byClass.length ? (
          <table className="table" style={{ fontSize: 12, marginTop: 4 }}>
            <thead>
              <tr><th>Class</th><th style={{ textAlign: "right" }}>Reached</th><th style={{ textAlign: "right" }}>Visits</th></tr>
            </thead>
            <tbody>
              {data.byClass.map((c: any) => (
                <tr key={c.cls}>
                  <td>Class {c.cls}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: c.reached < c.total ? "var(--c-amber-deep)" : "var(--c-green-deep)" }}>
                    {c.reached} / {c.total}
                  </td>
                  <td style={{ textAlign: "right" }}>{c.visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <div className="hint">Class A doctors are the highest value — reaching all of them matters more than raw visit count.</div>
      </div>

      {data.cityDays?.length ? (
        <div className="card" style={{ gap: 6 }}>
          <h6 style={{ margin: 0 }}>Days per city</h6>
          {data.cityDays.map((c: any) => (
            <div key={c.city} className="row" style={{ fontSize: 13 }}>
              <span style={{ flex: 1 }}>{c.label}</span>
              <b className="hnum">{c.days} day{c.days === 1 ? "" : "s"}</b>
            </div>
          ))}
        </div>
      ) : null}

      {data.accrual.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Product targets</h6>
          {data.accrual.map((r: any) => (
            <div key={r.productId} className="row" style={{ fontSize: 12 }}>
              <span style={{ width: 108, flex: "none" }}>{r.productName}</span>
              <div style={{ flex: 1 }}><Meter pct={r.achievementPct} min={r.minPct} gray={!r.qualified} /></div>
              <b style={{ width: 66, textAlign: "right", color: r.qualified ? "var(--c-green-deep)" : "var(--c-amber-deep)" }}>
                {r.achievedQty}/{r.targetQty}
              </b>
            </div>
          ))}
        </div>
      ) : null}

      <div className="two-col" style={{ gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Most visited</h6>
          {data.mostVisited.map((d: any) => (
            <div key={d.name} className="row" style={{ fontSize: 12 }}>
              <span style={{ flex: 1 }}><DoctorLink id={d.id} name={d.name} /></span>
              <span className={`tag ${d.class === "A" ? "tag-accent" : "tag-neutral"}`}>{d.class}</span>
              <b className="hnum">×{d.n}</b>
            </div>
          ))}
          {data.mostVisited.length === 0 ? <div className="small muted">No visits yet this month.</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Not visited yet</h6>
          {data.leastVisited.map((d: any) => (
            <div key={d.name} className="row" style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
              <span style={{ flex: 1 }}><DoctorLink id={d.id} name={d.name} /></span>
              <span className={`tag ${d.class === "A" ? "tag-accent" : "tag-neutral"}`}>{d.class}</span>
            </div>
          ))}
          {data.leastVisited.length === 0 ? <div className="small muted">Everyone has been reached.</div> : null}
        </div>
      </div>

      {data.leaderboardOn && data.leaderboard.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Leaderboard — {monthName(data.period)}</h6>
          {data.leaderboard.map((r: any, i: number) => (
            <div key={r.name} className="listrow" style={{ padding: "8px 0" }}>
              <span className="hnum" style={{ width: 22, fontSize: 16, color: i === 0 ? "var(--c-amber-deep)" : "var(--color-neutral-500)" }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                <div className="small muted">{r.visits} visits · {money(r.collected)} collected</div>
              </div>
              <b className="hnum" style={{ fontSize: 15 }}>{r.avgPct}%</b>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

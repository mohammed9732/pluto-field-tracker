"use client";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, durationHM, hm } from "@/lib/fmt";
import { GeoMap } from "@/components/GeoMap";

export default function AdminMap() {
  const me = useMe();
  const [team, setTeam] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api("/api/team").then((r: any) => {
      setTeam(r.rows);
      setUserId(r.rows.find((x: any) => x.checkedIn)?.userId ?? r.rows[0]?.userId ?? null);
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!userId) return;
    api(`/api/mapday?userId=${userId}`).then(setData).catch(() => {});
  }, [userId]);
  useEffect(load, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (!me || !data) return <Spinner />;

  const inField = team.filter((r) => r.checkedIn).length;
  const onLeave = team.filter((r) => r.onLeave).length;

  return (
    <Screen me={me} wide>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <h4 className="m0">Daily map view</h4>
          <span className="small muted" style={{ marginLeft: "auto" }}>{inField} in field · {onLeave} on leave · pings every 5 min</span>
        </div>
        <div className="seg" style={{ width: "100%", overflowX: "auto" }}>
          {team.map((r) => (
            <label key={r.userId} className="seg-opt" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}>
              <input type="radio" name="admmap" checked={userId === r.userId} onChange={() => setUserId(r.userId)} />
              {r.name.split(" ")[0]}{r.onLeave ? " (leave)" : ""}
            </label>
          ))}
        </div>
        <GeoMap checkins={data.checkins} visits={data.visits} pings={data.pings} doctorPins={data.doctorPins ?? []} height={380} />
        <div className="two-col">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h6 style={{ margin: "0 0 8px", color: "var(--color-neutral-600)" }}>Timeline — {data.userName}</h6>
            {data.checkins.filter((c: any) => c.type === "in").map((c: any) => (
              <div key={c.id} className="listrow" style={{ padding: "7px 0", fontSize: 12 }}>
                <b className="hnum" style={{ width: 38 }}>{hm(c.ts)}</b><span className="f1">Check-in</span>
              </div>
            ))}
            {data.visits.map((v: any, i: number) => (
              <div key={v.id} className="listrow" style={{ padding: "7px 0", fontSize: 12 }}>
                <b className="hnum" style={{ width: 38 }}>{v.time}</b>
                <span className="f1">
                  Visit {i + 1} · {v.doctor?.name} — {v.outcome === "order" ? "Order" : v.outcome === "payment" ? "Payment" : "Follow-up"}
                  {(() => {
                    const d = data.dwell.find((x: any) => x.doctorId === v.doctorId);
                    return d ? <span style={{ color: "var(--color-neutral-600)" }}> · {durationHM(d.minutes)} in clinic</span> : null;
                  })()}
                </span>
              </div>
            ))}
            {data.checkins.filter((c: any) => c.type === "out").map((c: any) => (
              <div key={c.id} className="listrow" style={{ padding: "7px 0", fontSize: 12 }}>
                <b className="hnum" style={{ width: 38 }}>{hm(c.ts)}</b><span className="f1">Check-out</span>
              </div>
            ))}
            {data.fieldTime.checkedIn ? (
              <div style={{ display: "flex", gap: 10, fontSize: 12, padding: "7px 0", color: "var(--color-neutral-600)" }}>
                <b className="hnum" style={{ width: 38 }}>—</b><span className="f1">Check-out pending</span>
              </div>
            ) : null}
          </div>
          <div className="stack-2">
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Field time</h6>
            <div className="row items-base">
              <span className="hnum fs-figure">{durationHM(data.fieldTime.minutes)}</span>
              {data.fieldTime.checkedIn ? <span className="small muted">and counting</span> : null}
            </div>
            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
              {(() => {
                const total = Math.max(1, data.fieldTime.minutes);
                return (
                  <>
                    <div style={{ width: `${(data.atClinicsMinutes / total) * 100}%`, background: "var(--color-accent)" }} />
                    <div style={{ width: `${(data.travelMinutes / total) * 100}%`, background: "var(--color-accent-300)" }} />
                    <div style={{ flex: 1, background: "var(--color-neutral-300)" }} />
                  </>
                );
              })()}
            </div>
            <div className="small muted">
              At clinics <b style={{ color: "var(--color-text)" }}>{durationHM(data.atClinicsMinutes)}</b> · travel{" "}
              <b style={{ color: "var(--color-text)" }}>{durationHM(data.travelMinutes)}</b> · outside clinic areas{" "}
              <b style={{ color: "var(--color-accent-700)" }}>{durationHM(data.outsideMinutes)}</b>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              Dwell counts pings inside a clinic&apos;s saved 150 m radius. Pings pause when the phone is locked or the browser is closed — a PWA constraint, not a fault. Schematic — geo tiles in build.
            </div>
          </div>
        </div>
    </Screen>
  );
}

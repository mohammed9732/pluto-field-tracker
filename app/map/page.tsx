"use client";
import { MascotNote } from "@/components/MascotNote";
import { useT } from "@/lib/i18n";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, durationHM, hm } from "@/lib/fmt";
import { getPosition } from "@/lib/geo";
import { GeoMap } from "@/components/GeoMap";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

function MapInner() {
  const tx = useT();
  const me = useMe();
  const params = useSearchParams();
  const [team, setTeam] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = params.get("userId");
    if (q) setUserId(Number(q));
  }, [params]);

  useEffect(() => {
    if (me && me.role !== "rep") {
      api("/api/team").then((r: any) => {
        setTeam(r.rows);
        setUserId((u) => u ?? me.id);
      }).catch(() => {});
      setUserId((u) => u ?? me.id);
    } else if (me) {
      setUserId(me.id);
    }
  }, [me]);

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

  const self = userId === me.id;
  const checkedIn = data.fieldTime.checkedIn;

  async function toggleCheck() {
    setBusy(true);
    try {
      const p = await getPosition();
      await api("/api/field", { json: { action: checkedIn ? "checkout" : "checkin", ...p } });
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen me={me}>
      <div className="row items-base">
        <h4 className="m0 f1">Map</h4>
        <span className={`tag ${checkedIn ? "tag-hot" : "tag-neutral"}`}>
          {checkedIn ? `In field ${durationHM(data.fieldTime.minutes)}` : "Not in field"}
        </span>
      </div>
      {me.role !== "rep" && team.length ? (
        <div className="seg" style={{ width: "100%", overflowX: "auto" }}>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}>
            <input type="radio" name="mapuser" checked={userId === me.id} onChange={() => setUserId(me.id)} />
            Me
          </label>
          {team.map((r) => (
            <label key={r.userId} className="seg-opt" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}>
              <input type="radio" name="mapuser" checked={userId === r.userId} onChange={() => setUserId(r.userId)} />
              {r.name.split(" ")[0]}
            </label>
          ))}
        </div>
      ) : null}

      {self ? (
        checkedIn ? (
          <div className="card" style={{ gap: 8, padding: 14, borderColor: "var(--c-coral)" }}>
            <div className="row gap-2">
              <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--c-coral)", flex: "none" }} />
              <span className="small" style={{ letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-coral-deep)", flex: 1 }}>{tx("map.inTheField", "In the field")}</span>
              <span className="hnum fs-lead">{durationHM(data.fieldTime.minutes)}</span>
            </div>
            <button className="btn btn-coral btn-block" style={{ padding: 13, fontSize: 15 }} onClick={toggleCheck} disabled={busy}>
              {busy ? "Getting GPS…" : "End day"}
            </button>
          </div>
        ) : data.hasStarted ? (
          <div className="card" style={{ gap: 10, padding: 14, borderColor: "var(--c-green)" }}>
            <MascotNote mood="cheer" tone="win" size={64}
              title={tx("map.thatSTheDayPh", "That's the day done")}
              body={`${durationHM(data.fieldTime.minutes)} in the field. Everything you logged is already with the office.`} />
            <button className="btn btn-secondary btn-block" style={{ padding: 10, fontSize: 13 }} onClick={toggleCheck} disabled={busy}>
              {busy ? "Getting GPS…" : "Resume day (ended by mistake?)"}
            </button>
          </div>
        ) : (
          <button className="btn btn-block btn-coral" style={{ padding: 16, fontSize: 16 }} onClick={toggleCheck} disabled={busy}>
            {busy ? "Getting GPS…" : "Start day"}
          </button>
        )
      ) : null}

      <GeoMap checkins={data.checkins} visits={data.visits} pings={data.pings} doctorPins={data.doctorPins ?? []} height={self ? 380 : 320} />
      <div className="hint">Tap a numbered visit pin for Google Maps / Waze navigation. Today&apos;s visits are highlighted.</div>

      <div className="stack-2">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)", flex: 1 }}>{data.userName} — today</h6>
          <span className="hint">in field {durationHM(data.fieldTime.minutes)}</span>
        </div>
        {data.visits.map((v: any, i: number) => {
          const dwell = data.dwell.find((d: any) => d.doctorId === v.doctorId);
          return (
            <div key={v.id} className="listrow" style={{ padding: "8px 0", fontSize: 12 }}>
              <span className="hnum" style={{ width: 18, color: "var(--color-accent-700)" }}>{i + 1}</span>
              <span style={{ width: 42, color: "var(--color-neutral-500)" }}>{v.time}</span>
              <span className="f1">
                <DoctorLink id={v.doctorId} name={v.doctor?.name ?? "?"} /> — {v.outcome === "order" ? "Order" : v.outcome === "payment" ? "Payment" : "Follow-up"}
                {v.outOfLocation ? <span className="tag tag-hot" style={{ marginLeft: 6 }}>out of location</span> : null}
              </span>
              {dwell ? <b className="hnum fs-body">{durationHM(dwell.minutes)}</b> : null}
            </div>
          );
        })}
        {data.visits.length === 0 ? <div className="small muted">{tx("map.noVisitsLoggedYet", "No visits logged yet today.")}</div> : null}
        {data.travelMinutes > 0 ? (
          <div className="listrow" style={{ padding: "8px 0", fontSize: 12, color: "var(--color-neutral-600)" }}>
            <span style={{ width: 60 }}>travel</span>
            <span className="f1">{tx("map.betweenClinics", "Between clinics")}</span>
            <b className="hnum" style={{ fontSize: 15, color: "var(--color-text)" }}>{durationHM(data.travelMinutes)}</b>
          </div>
        ) : null}
        {data.outsideMinutes > 15 ? (
          <div className="soft-accent row" style={{ gap: 8, padding: "9px 10px", fontSize: 12 }}>
            <span style={{ flex: 1, color: "var(--color-accent-800)" }}>{tx("map.outsideClinicAreas", "Outside clinic areas")}</span>
            <b className="hnum" style={{ fontSize: 15, color: "var(--color-accent-800)" }}>{durationHM(data.outsideMinutes)}</b>
          </div>
        ) : null}
      </div>
      <div className="hint mt-auto">
        GPS pinned on check-in, check-out, and every visit. Pings pause when the phone is locked or the browser closed — a PWA constraint, not a fault.
      </div>
    </Screen>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MapInner />
    </Suspense>
  );
}

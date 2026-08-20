"use client";
import { enqueue, isOffline, newRef } from "@/lib/outbox";
import { useTerms, lower } from "@/lib/terms";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { DoctorPicker, DoctorCard, Doc } from "@/components/DoctorPicker";
import { Icon, paths } from "@/components/Icons";
import { api } from "@/lib/fmt";
import { getPosition, GeoPoint } from "@/lib/geo";

function LogVisitInner() {
  const me = useMe();
  const t = useTerms();
  const router = useRouter();
  const params = useSearchParams();
  const [doctor, setDoctor] = useState<Doc | null>(null);
  const [outcome, setOutcome] = useState<"order" | "follow_up" | "payment" | "">("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [joint, setJoint] = useState(false);
  const [jointWith, setJointWith] = useState("");
  const [reps, setReps] = useState<any[]>([]);
  const [pos, setPos] = useState<GeoPoint | null>(null);
  const [saveLocation, setSaveLocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [photo, setPhoto] = useState<{ id: string; name: string } | null>(null);
  const [compOn, setCompOn] = useState(false);
  const [comp, setComp] = useState({ competitor: "", product: "", price: "", note: "" });
  const [compEnabled, setCompEnabled] = useState(false);

  useEffect(() => {
    getPosition().then(setPos);
    api("/api/settings").then((r: any) => setCompEnabled(!!r.settings.competitorTracking)).catch(() => {});
    api("/api/field").then((r: any) => setTodayCount(r.visits.length)).catch(() => {});
    const docId = params.get("doctorId");
    if (docId) {
      api<{ doctors: Doc[] }>("/api/doctors").then((r) => {
        const d = r.doctors.find((x) => x.id === Number(docId));
        if (d) setDoctor(d);
      }).catch(() => {});
    }
  }, [params]);
  useEffect(() => {
    if (me?.role === "supervisor") {
      api<{ doctors: any }>("/api/doctors").catch(() => {});
      api("/api/team").then((r: any) => setReps(r.rows)).catch(() => {});
    }
  }, [me?.role]);

  if (!me) return <Spinner />;

  async function attachPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
    if (r.id) setPhoto({ id: r.id, name: file.name });
  }

  async function save() {
    setErr("");
    if (!doctor) { setErr(`Pick a ${lower(t.doctor)}`); return; }
    if (!outcome) { setErr("Pick an outcome"); return; }
    if (outcome === "follow_up" && !followUpDate) { setErr("Follow-up needs a next-visit date"); return; }
    setBusy(true);
    try {
      const p = pos ?? (await getPosition());
      const payload: any = {
        doctorId: doctor.id, outcome, notes, followUpDate: followUpDate || null,
        jointVisit: joint, jointWith: joint && jointWith ? Number(jointWith) : null,
        lat: p.lat, lng: p.lng,
        setDoctorLocation: saveLocation && doctor.lat == null,
        photo: photo?.id ?? null,
        competitor: compOn && comp.competitor.trim() ? { ...comp, price: Number(String(comp.price).replace(/,/g, "")) || 0 } : null,
      };
      payload.clientRef = newRef();
      let r: any;
      try {
        r = await api<any>("/api/visits", { json: payload });
      } catch (netErr) {
        // No signal. Keep the visit on the phone rather than losing it while the
        // rep is still standing in the clinic.
        if (!isOffline(netErr)) throw netErr;
        enqueue("/api/visits", { ...payload, acceptOutOfLocation: true },
          `Visit — ${doctor.name}`);
        alert("No signal. The visit is saved on your phone and will send itself as soon as you are back online.");
        router.push("/home");
        return;
      }
      if (r.needsConfirm) {
        const msg = r.distance != null
          ? `You are ${r.distance >= 1000 ? (r.distance / 1000).toFixed(1) + " km" : r.distance + " m"} from ${doctor.name}'s saved clinic pin (allowed: ${r.radius} m).\n\nSave anyway? It will be flagged "out of location" to the supervisor and owner.`
          : `No GPS signal — the visit can't be location-verified.\n\nSave anyway? It will be flagged "out of location" to the supervisor and owner.`;
        if (!window.confirm(msg)) { setBusy(false); return; }
        r = await api<any>("/api/visits", { json: { ...payload, acceptOutOfLocation: true } });
      }
      if (outcome === "order") router.push(`/order?doctorId=${doctor.id}`);
      else if (outcome === "payment") router.push(`/pay?doctorId=${doctor.id}`);
      else router.push("/home");
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  function nextVisitIn(days: number | null) {
    if (days == null) { setFollowUpDate(""); return; }
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().slice(0, 10));
  }

  const target = (me.dailyMin || 5);

  return (
    <Screen me={me}>
      <PageHead title="Log visit" back="/home" right={<span className="hint">{pos?.lat != null ? "GPS pinned" : "No GPS"}</span>} />
      {!doctor ? (
        <DoctorPicker onPick={setDoctor} allowAdd />
      ) : (
        <>
          <DoctorCard doctor={doctor} onChange={() => setDoctor(null)} />
          {doctor.lat == null ? (
            <label className="soft-accent row" style={{ gap: 10, padding: 12, cursor: "pointer" }}>
              <Icon d={paths.target} size={18} stroke="var(--color-accent-700)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-accent-800)" }}>Set clinic location</div>
                <div className="small" style={{ color: "var(--color-accent-700)" }}>
                  {pos?.lat != null ? "No pin saved — current GPS will be stored with this visit" : "No pin saved — GPS unavailable right now"}
                </div>
              </div>
              <input type="checkbox" checked={saveLocation} onChange={(e) => setSaveLocation(e.target.checked)} />
            </label>
          ) : null}
          <div className="field" style={{ margin: 0 }}>
            <label>Outcome</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {([["order", "Order"], ["follow_up", "Follow-up"], ["payment", "Payment"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setOutcome(val)}
                  style={{
                    padding: "10px 6px", fontSize: 13, textAlign: "center", cursor: "pointer", font: "inherit",
                    borderRadius: 12,
                    border: `1px solid ${outcome === val ? "var(--color-accent)" : "var(--color-divider)"}`,
                    background: outcome === val ? "var(--color-accent-100)" : "transparent",
                    color: outcome === val ? "var(--color-accent-700)" : "inherit",
                    fontWeight: outcome === val ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {outcome ? (
            <div className="field" style={{ margin: 0 }}>
              <label>Next visit {outcome === "follow_up" ? "(required)" : "(optional)"}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {([["1 week", 7], ["10 days", 10], ["1 month", 30]] as [string, number][]).map(([label, days]) => {
                  const d = new Date(); d.setDate(d.getDate() + days);
                  const val = d.toISOString().slice(0, 10);
                  return (
                    <button key={label} type="button" onClick={() => nextVisitIn(days)}
                      className={`tag ${followUpDate === val ? "tag-accent" : "tag-neutral"}`}
                      style={{ border: "none", cursor: "pointer", padding: "5px 12px" }}>
                      {label}
                    </button>
                  );
                })}
                {outcome !== "follow_up" && followUpDate ? (
                  <button type="button" onClick={() => nextVisitIn(null)} className="tag tag-neutral" style={{ border: "none", cursor: "pointer", padding: "5px 12px" }}>None</button>
                ) : null}
              </div>
              <input className="input" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              <div className="hint" style={{ marginTop: 4 }}>Saved next-visit dates feed your follow-up list and weekly planning.</div>
            </div>
          ) : null}
          <div className="field" style={{ margin: 0 }}>
            <label>Notes (optional)</label>
            <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 70 }} />
          </div>
          <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
            <Icon d="M21 15l-5-5L5 21M3 5h18v14H3Z" size={16} stroke={photo ? "var(--c-green-deep)" : "var(--color-neutral-500)"} />
            <span style={{ flex: 1, color: photo ? "var(--c-green-deep)" : "var(--color-neutral-600)" }}>
              {photo ? `Photo attached — ${photo.name}` : "Add a photo (optional — kept in the doctor's history)"}
            </span>
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && attachPhoto(e.target.files[0])} />
          </label>
          {me.role === "rep" ? (
            <label className="radio" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={joint} onChange={(e) => setJoint(e.target.checked)} />
              <span className="dot" />
              Joint visit with supervisor
            </label>
          ) : (
            <>
              <label className="radio" style={{ fontSize: 13 }}>
                <input type="checkbox" checked={joint} onChange={(e) => setJoint(e.target.checked)} />
                <span className="dot" />
                Joint visit with a rep
              </label>
              {joint ? (
                <select className="input" value={jointWith} onChange={(e) => setJointWith(e.target.value)}>
                  <option value="">Which rep?</option>
                  {reps.map((r) => <option key={r.userId} value={r.userId}>{r.name}</option>)}
                </select>
              ) : null}
            </>
          )}
          {compEnabled ? (
            <div className="card" style={{ gap: 8, padding: 12 }}>
              <label className="row" style={{ gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} style={{ width: 17, height: 17 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>Competitor seen at this clinic</span>
              </label>
              {compOn ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input className="input" placeholder="Competitor (e.g. Regenovue)" value={comp.competitor}
                      onChange={(e) => setComp({ ...comp, competitor: e.target.value })} style={{ minHeight: 32, fontSize: 13 }} />
                    <input className="input" placeholder="Their product" value={comp.product}
                      onChange={(e) => setComp({ ...comp, product: e.target.value })} style={{ minHeight: 32, fontSize: 13 }} />
                  </div>
                  <input className="input" placeholder="Their price (IQD, optional)" inputMode="numeric" value={comp.price}
                    onChange={(e) => setComp({ ...comp, price: e.target.value })} style={{ minHeight: 32, fontSize: 13 }} />
                  <input className="input" placeholder="Note (optional)" value={comp.note}
                    onChange={(e) => setComp({ ...comp, note: e.target.value })} style={{ minHeight: 32, fontSize: 13 }} />
                  <div className="hint">Goes to the market report — the owner and supervisor see it.</div>
                </>
              ) : null}
            </div>
          ) : null}
          {err ? <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>{err}</div> : null}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-primary btn-block" style={{ padding: 13 }} onClick={save} disabled={busy}>
              {busy ? "Saving…" : `Save visit${todayCount != null ? ` — ${todayCount + 1}/${target} today` : ""}`}
            </button>
            <div className="hint" style={{ textAlign: "center" }}>Order opens the order form · Follow-up asks for a date · Payment opens collection</div>
          </div>
        </>
      )}
    </Screen>
  );
}

export default function LogVisit() {
  return (
    <Suspense fallback={<Spinner />}>
      <LogVisitInner />
    </Suspense>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { DoctorLink } from "@/components/DoctorLink";
import { api, dmy, money } from "@/lib/fmt";

export default function Competitors() {
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState({ competitor: "", product: "", price: "", note: "", doctorId: "" });
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api("/api/competitors").then(setData).catch(() => {});
    api<{ doctors: any[] }>("/api/doctors").then((r) => setDoctors(r.doctors)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  if (!data.enabled) {
    return <Screen me={me}><div className="card muted">Competitor tracking is switched off by the admin.</div></Screen>;
  }

  async function add() {
    setErr("");
    if (!form.competitor.trim()) { setErr("Which competitor?"); return; }
    try {
      await api("/api/competitors", { json: { ...form, doctorId: form.doctorId || null } });
      setForm({ competitor: "", product: "", price: "", note: "", doctorId: "" });
      setOpen(false);
      load();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <Screen me={me}>
      <div className="row">
        <h4 className="m0 f1">Market intel</h4>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setOpen((o) => !o)}>＋ Add</button>
      </div>

      {open ? (
        <div className="card gap-3">
          <div className="two">
            <div className="field m0">
              <label>Competitor</label>
              <input className="input" value={form.competitor} onChange={(e) => setForm({ ...form, competitor: e.target.value })} placeholder="e.g. Regenovue" />
            </div>
            <div className="field m0">
              <label>Their product</label>
              <input className="input" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
            </div>
          </div>
          <div className="two">
            <div className="field m0">
              <label>Their price (IQD)</label>
              <input className="input" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="field m0">
              <label>At which doctor (optional)</label>
              <select className="input" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
                <option value="">General market note</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field m0">
            <label>Note</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What did you see or hear?" />
          </div>
          {err ? <div className="tag tag-hot self-start">{err}</div> : null}
          <button className="btn btn-primary btn-block p-3" onClick={add}>Save</button>
        </div>
      ) : null}

      {data.notes.length === 0 ? <div className="card muted">Nothing logged yet. Add what competitors are doing in the field.</div> : null}
      {data.notes.map((c: any) => (
        <div key={c.id} className="card" style={{ gap: 4, padding: 12 }}>
          <div className="row gap-2">
            <div className="f1min">
              <div className="fs-small w-500">{c.competitor}{c.product ? ` · ${c.product}` : ""}</div>
              <div className="small muted">
                {c.doctorName ? <DoctorLink id={c.doctorId} name={c.doctorName} /> : "General"}
                {c.city ? ` · ${c.city}` : ""} · {c.byName} · {dmy(c.ts)}
              </div>
            </div>
            {c.price ? <span className="hnum fs-body">{money(c.price)}</span> : null}
          </div>
          {c.note ? <div style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>{c.note}</div> : null}
        </div>
      ))}
      <div className="hint mt-auto">
        Reps can also capture this during a visit — it lands here and on the doctor profile.
      </div>
    </Screen>
  );
}

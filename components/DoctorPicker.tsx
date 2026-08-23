"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/fmt";
import { Icon, paths } from "./Icons";

export interface Doc {
  id: number; name: string; clinic: string; city: string; area: string;
  class: string; specialty: string; phone: string; lat: number | null; lng: number | null;
}

export function DoctorCard({ doctor, onChange }: { doctor: Doc; onChange: () => void }) {
  return (
    <div className="card" style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}>
      <div className="f1">
        <div style={{ fontSize: 15, fontWeight: 500 }}>{doctor.name}</div>
        <div className="small muted">{doctor.clinic} · {doctor.specialty} · Class {doctor.class}</div>
      </div>
      <button className="btn btn-ghost fs-caption" onClick={onChange}>Change</button>
    </div>
  );
}

export function DoctorPicker({ onPick, allowAdd }: { onPick: (d: Doc) => void; allowAdd?: boolean }) {
  const [doctors, setDoctors] = useState<Doc[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [scoped, setScoped] = useState<string | null>(null);
  const [canAdd, setCanAdd] = useState(false);
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", clinic: "", city: "", area: "", specialty: "Dermatologist", class: "B", phone: "" });

  useEffect(() => {
    api<{ doctors: Doc[]; cities: any[]; scopedToCity: string | null; canAdd: boolean }>("/api/doctors").then((r) => {
      setDoctors(r.doctors);
      setCities(r.cities ?? []);
      setScoped(r.scopedToCity ?? null);
      setCanAdd(!!r.canAdd);
      setNewDoc((d) => ({ ...d, city: r.scopedToCity ?? r.cities?.[0]?.id ?? "" }));
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return doctors
      .filter((d) => (!city || d.city === city))
      .filter((d) => !ql || d.name.toLowerCase().includes(ql) || d.clinic.toLowerCase().includes(ql) || d.area.toLowerCase().includes(ql))
      .slice(0, 30);
  }, [doctors, q, city]);

  async function addDoctor() {
    if (!newDoc.name.trim()) return;
    const r = await api<{ doctor: Doc }>("/api/doctors", { json: { action: "add", ...newDoc } });
    onPick(r.doctor);
  }

  if (adding) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row"><h5 className="m0 f1">New doctor</h5><button className="btn btn-ghost fs-caption" onClick={() => setAdding(false)}>Back to search</button></div>
        <div className="field"><label>Doctor name</label><input className="input" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} /></div>
        <div className="field"><label>Clinic</label><input className="input" value={newDoc.clinic} onChange={(e) => setNewDoc({ ...newDoc, clinic: e.target.value })} /></div>
        <div className="two-3">
          <div className="field"><label>City</label>
            <select className="input" value={newDoc.city} disabled={!!scoped} onChange={(e) => setNewDoc({ ...newDoc, city: e.target.value })}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Area</label><input className="input" value={newDoc.area} onChange={(e) => setNewDoc({ ...newDoc, area: e.target.value })} /></div>
        </div>
        <div className="two-3">
          <div className="field"><label>Specialty</label>
            <select className="input" value={newDoc.specialty} onChange={(e) => setNewDoc({ ...newDoc, specialty: e.target.value })}>
              <option>Dermatologist</option><option>Plastic surgeon</option><option>GP</option><option>Dentist</option><option>Other</option>
            </select>
          </div>
          <div className="field"><label>Class</label>
            <select className="input" value={newDoc.class} onChange={(e) => setNewDoc({ ...newDoc, class: e.target.value })}>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Phone</label><input className="input" value={newDoc.phone} onChange={(e) => setNewDoc({ ...newDoc, phone: e.target.value })} /></div>
        <button className="btn btn-primary btn-block" style={{ padding: 11 }} onClick={addDoctor}>Save & select</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="input" placeholder={`Search ${doctors.length} doctors…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {!scoped ? [{ id: "", name: "All" }, ...cities].map((c) => (
          <button key={c.id} className={`tag ${city === c.id ? "tag-accent" : "tag-neutral"}`} style={{ border: "none", cursor: "pointer" }} onClick={() => setCity(c.id)}>
            {c.name}
          </button>
        )) : null}
        {allowAdd && canAdd ? (
          <button className="tag tag-outline" style={{ marginLeft: "auto", cursor: "pointer", background: "transparent" }} onClick={() => setAdding(true)}>＋ New doctor</button>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filtered.map((d) => (
          <button key={d.id} className="listrow" style={{ background: "none", border: "none", borderBottom: "1px solid var(--color-divider)", textAlign: "left", cursor: "pointer", font: "inherit", width: "100%" }} onClick={() => onPick(d)}>
            <div className="f1min">
              <div className="fs-small w-500">{d.name}</div>
              <div className="small muted">{d.clinic} · {d.specialty} · {d.area}</div>
            </div>
            <Icon d={paths.pinDot} size={14} stroke={d.lat != null ? "var(--color-accent)" : "var(--color-neutral-400)"} />
            <span className={`tag ${d.class === "A" ? "tag-accent" : "tag-neutral"}`}>{d.class}</span>
          </button>
        ))}
        {filtered.length === 0 ? <div className="small muted" style={{ padding: "10px 0" }}>No doctors match.</div> : null}
      </div>
    </div>
  );
}

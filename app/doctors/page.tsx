"use client";
import { term, useTerms } from "@/lib/terms";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api } from "@/lib/fmt";
import { getPosition } from "@/lib/geo";
import * as XLSX from "xlsx";

const EMPTY_DOC = { name: "", clinic: "", city: "", area: "", address: "", specialty: "Dermatologist", class: "B", phone: "", clinicPhone: "", secretaryPhone: "", potentialMonthly: "" };

// Must match the sheet the owner circulates — the last two columns are the
// doctor's own number and the clinic's landline, in that order.
const TEMPLATE_HEADERS = ["Doctor Name", "Clinic Name", "City", "Area", "Specialty", "Class (A/B/C)", "Personal Phone", "Clinic phone"];

export default function Doctors() {
  const tx = useT();
  const me = useMe();
  const t = useTerms();
  const [doctors, setDoctors] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [preview, setPreview] = useState<{ rows: any[]; filename: string } | null>(null);
  const [importResult, setImportResult] = useState<{ added: number; errors: string[] } | null>(null);
  const [canAdd, setCanAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newDoc, setNewDoc] = useState<any>(EMPTY_DOC);
  const [useGps, setUseGps] = useState(true);
  const [addErr, setAddErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [scoped, setScoped] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ doctors: any[]; canAdd: boolean; cities: any[]; scopedToCity: string | null }>("/api/doctors").then((r) => {
      setDoctors(r.doctors);
      setCanAdd(r.canAdd);
      setCities(r.cities ?? []);
      setScoped(r.scopedToCity ?? null);
      setNewDoc((d: any) => ({ ...d, city: d.city || r.scopedToCity || r.cities?.[0]?.id || "" }));
    }).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!doctors) return [];
    const ql = q.toLowerCase();
    return doctors
      .filter((d) => {
        if (filter === "nopin") return d.lat == null;
        if (filter === "A") return d.class === "A";
        if (filter) return d.city === filter;
        return true;
      })
      .filter((d) => !ql || d.name.toLowerCase().includes(ql) || d.clinic.toLowerCase().includes(ql) || d.area.toLowerCase().includes(ql));
  }, [doctors, q, filter]);

  if (!me || !doctors) return <Spinner />;
  const canEdit = me.role === "supervisor" || me.role === "admin";

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Doctors");
    XLSX.writeFile(wb, "doctors-import-template.xlsx");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const rows = raw.slice(1).filter((r) => r.some((c) => String(c).trim() !== "")).map((r) => ({
        name: r[0], clinic: r[1], city: String(r[2] ?? "").toLowerCase(), area: r[3], specialty: r[4], class: String(r[5] ?? "").toUpperCase(), phone: r[6], clinicPhone: r[7],
      }));
      setPreview({ rows, filename: f.name });
      setImportResult(null);
    };
    reader.readAsArrayBuffer(f);
    e.target.value = "";
  }

  async function confirmImport() {
    if (!preview) return;
    const r = await api<{ added: number; errors: string[] }>("/api/doctors", { json: { action: "import", rows: preview.rows } });
    setImportResult(r);
    setPreview(null);
    load();
  }

  return (
    <Screen me={me}>
      <div className="row">
        <h4 className="m0 f1">{term(t, "doctorPlural", "nav.doctors")}</h4>
        {canEdit ? (
          <>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => fileRef.current?.click()}>{tx("docs.importXlsx", "Import .xlsx")}</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          </>
        ) : null}
        {canAdd ? <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => { setAdding((a) => !a); setAddErr(""); }}>＋ Add</button> : null}
      </div>
      {adding ? (
        <div className="card gap-3">
          <h6 className="m0">{tx("docs.newDoctor", "New doctor")}</h6>
          <div className="field m0"><label>{tx("docs.doctorName", "Doctor name")}</label><input className="input" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} /></div>
          <div className="field m0"><label>{tx("docs.centerClinicName", "Center / clinic name")}</label><input className="input" value={newDoc.clinic} onChange={(e) => setNewDoc({ ...newDoc, clinic: e.target.value })} /></div>
          <div className="two-3">
            <div className="field m0"><label>{tx("docs.city", "City")}</label>
              <select className="input" value={newDoc.city} disabled={!!scoped} onChange={(e) => setNewDoc({ ...newDoc, city: e.target.value })}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field m0"><label>{tx("docs.area", "Area")}</label><input className="input" value={newDoc.area} onChange={(e) => setNewDoc({ ...newDoc, area: e.target.value })} /></div>
          </div>
          <div className="field m0"><label>{tx("docs.address", "Address")}</label><input className="input" value={newDoc.address} onChange={(e) => setNewDoc({ ...newDoc, address: e.target.value })} placeholder={tx("docs.streetBuildingFloorPh", "Street, building, floor…")} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="field m0"><label>{tx("docs.specialty", "Specialty")}</label>
              <select className="input" value={newDoc.specialty} onChange={(e) => setNewDoc({ ...newDoc, specialty: e.target.value })}>
                <option>{tx("docs.dermatologist", "Dermatologist")}</option><option>{tx("docs.plasticSurgeon", "Plastic surgeon")}</option><option>GP</option><option>{tx("docs.dentist", "Dentist")}</option><option>{tx("docs.other", "Other")}</option>
              </select>
            </div>
            <div className="field m0"><label>{tx("docs.class", "Class")}</label>
              <select className="input" value={newDoc.class} onChange={(e) => setNewDoc({ ...newDoc, class: e.target.value })}>
                <option>A</option><option>B</option><option>C</option>
              </select>
            </div>
            <div className="field m0"><label>{tx("docs.phone", "Personal phone")}</label><input className="input hnum" inputMode="tel" value={newDoc.phone} onChange={(e) => setNewDoc({ ...newDoc, phone: e.target.value })} /></div>
          </div>
          <div className="field m0">
            <label>{tx("docs.monthlyPotentialIqdOptional", "Monthly potential (IQD, optional)")}</label>
            <input className="input" inputMode="numeric" placeholder={tx("docs.whatThisDoctorShouldPh", "What this doctor should buy per month")}
              value={newDoc.potentialMonthly} onChange={(e) => setNewDoc({ ...newDoc, potentialMonthly: e.target.value })} />
            <div className="field">
              <label>{tx("docs.clinicPhone", "Clinic phone")}</label>
              <input className="input hnum" inputMode="tel" placeholder="066 000 0000"
                value={newDoc.clinicPhone} onChange={(e) => setNewDoc({ ...newDoc, clinicPhone: e.target.value })} />
            </div>
            <div className="field">
              <label>{tx("docs.secretaryPhoneOptional", "Secretary phone (optional)")}</label>
              <input className="input hnum" inputMode="tel" placeholder="0750 000 0000"
                value={newDoc.secretaryPhone} onChange={(e) => setNewDoc({ ...newDoc, secretaryPhone: e.target.value })} />
            </div>
          </div>
          <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={useGps} onChange={(e) => setUseGps(e.target.checked)} />
            <Icon d={paths.target} size={15} stroke="var(--color-accent-700)" />
            <span style={{ color: "var(--color-accent-800)" }}>{tx("docs.setClinicLocationFrom", "Set clinic location from my current GPS")}</span>
          </label>
          {addErr ? <div className="tag tag-hot self-start">{addErr}</div> : null}
          <div className="two">
            <button className="btn btn-primary p-3" onClick={async () => {
              setAddErr("");
              if (!newDoc.name.trim()) { setAddErr("Doctor name is required"); return; }
              const pos = useGps ? await getPosition() : { lat: null, lng: null };
              try {
                await api("/api/doctors", { json: { action: "add", ...newDoc, lat: pos.lat, lng: pos.lng } });
                setNewDoc(EMPTY_DOC);
                setAdding(false);
                load();
              } catch (e: any) { setAddErr(e.message); }
            }}>{tx("docs.saveDoctor", "Save doctor")}</button>
            <button className="btn btn-secondary p-3" onClick={() => setAdding(false)}>{tx("docs.cancel", "Cancel")}</button>
          </div>
        </div>
      ) : null}
      {preview ? (
        <div className="soft-accent" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="row gap-2">
            <Icon d={paths.file} size={16} stroke="var(--color-accent-700)" />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-accent-800)" }}>{preview.filename}</div>
            <span className="small" style={{ color: "var(--color-accent-700)" }}>{preview.rows.length} rows</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, maxHeight: 180, overflowY: "auto" }}>
            {preview.rows.slice(0, 20).map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <span className="f1">{r.name || <span style={{ color: "var(--c-coral-deep)" }}>missing name</span>}</span>
                <span className="muted">{r.clinic}</span>
                <span className="muted">{r.city}</span>
              </div>
            ))}
            {preview.rows.length > 20 ? <div className="muted">…and {preview.rows.length - 20} more</div> : null}
          </div>
          <div className="two">
            <button className="btn btn-primary" style={{ padding: 9 }} onClick={confirmImport}>{tx("docs.confirmImport", "Confirm import")}</button>
            <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setPreview(null)}>{tx("docs.cancel", "Cancel")}</button>
          </div>
        </div>
      ) : null}
      {importResult ? (
        <div className="card" style={{ gap: 4 }}>
          <span className="tag tag-ok self-start">{importResult.added} doctors imported</span>
          {importResult.errors.map((e, i) => <div key={i} className="small" style={{ color: "var(--c-amber-deep)" }}>{e}</div>)}
        </div>
      ) : null}
      <input className="input" placeholder={`Search ${doctors.length} doctors…`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { id: "", name: "All" },
          ...(scoped ? [] : cities),
          { id: "A", name: "Class A" },
          { id: "nopin", name: "No pin" },
        ].map((f) => (
          <button key={f.id} className={`tag ${filter === f.id ? "tag-accent" : "tag-neutral"}`} style={{ border: "none", cursor: "pointer" }} onClick={() => setFilter(f.id)}>{f.name}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filtered.map((d) => (
          <Link key={d.id} href={`/doctors/${d.id}`} className="listrow" style={{ padding: "10px 0", textDecoration: "none", color: "inherit" }}>
            <div className="f1min">
              {/* Red name = ceiling reached: the rep sees it from the list,
                  before even opening the profile. */}
              <div className="fs-small w-500" style={{ color: d.ceiling?.level === "red" ? "var(--c-coral-deep)" : undefined }}>{d.name}</div>
              <div className="small muted">{d.clinic} · {d.specialty} · {d.area}</div>
            </div>
            {d.ceiling?.level === "red" ? (
              <span className="tag tag-hot">{tx("docs.ceilingFull", "Ceiling")}</span>
            ) : d.ceiling?.level === "amber" ? (
              <span className="tag tag-warn">{d.ceiling.pct}%</span>
            ) : null}
            <Icon d={paths.pinDot} size={14} stroke={d.lat != null ? "var(--color-accent)" : "var(--color-neutral-400)"} />
            <span className={`tag ${d.class === "A" ? "tag-accent" : "tag-neutral"}`}>{d.class}</span>
          </Link>
        ))}
      </div>
      <div className="hint mt-auto">
        {scoped ? "You see the doctors in your city. " : ""}Grey pin = no clinic location yet — captured by the rep on first visit.{" "}
        {canEdit ? <>Import template: Name | Clinic | City | Area | Specialty | Class | Personal phone | Clinic phone. <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplate(); }}>{tx("docs.downloadBlankTemplate", "Download blank template")}</a>.</> : null}
      </div>
    </Screen>
  );
}

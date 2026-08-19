"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dm } from "@/lib/fmt";
import { Icon, paths } from "@/components/Icons";
import { PlanDay } from "@/lib/types";

const DAYS = ["SAT", "SUN", "MON", "TUE", "WED", "THU"];

type DayState = Pick<PlanDay, "day" | "area" | "note" | "doctorIds" | "backupIds" | "city" | "jointWith">;

const emptyDays = (): DayState[] =>
  DAYS.map((d) => ({ day: d, area: "", note: "", doctorIds: [], backupIds: [], city: null, jointWith: null }));

export default function MyPlan() {
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [days, setDays] = useState<DayState[]>(emptyDays());
  const [picker, setPicker] = useState<{ dayIdx: number; kind: "visit" | "backup" } | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isSup = me?.role === "supervisor";

  const load = useCallback(() => {
    api("/api/plans?scope=mine").then((r: any) => {
      setData(r);
      const current = r.plans.find((p: any) => p.weekStart === r.nextWeekStart);
      if (current) {
        setDays(DAYS.map((dn) => {
          const d = current.days.find((x: any) => x.day === dn);
          return d
            ? { day: dn, area: d.area ?? "", note: d.note ?? "", doctorIds: d.doctorIds ?? [], backupIds: d.backupIds ?? [], city: d.city ?? null, jointWith: d.jointWith ?? null }
            : { day: dn, area: "", note: "", doctorIds: [], backupIds: [], city: null, jointWith: null };
        }));
      }
    }).catch(() => {});
    // The API already scopes reps to their own city.
    api<{ doctors: any[] }>("/api/doctors").then((r) => setDoctors(r.doctors)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const docById = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  if (!me || !data) return <Spinner />;

  const plan = data.plans.find((p: any) => p.weekStart === data.nextWeekStart) ?? null;
  const tVisit = data.targets?.visit ?? 5;
  const tBackup = data.targets?.backup ?? 2;
  const total = isSup
    ? days.filter((d) => d.city).reduce((s, d) => s + (d.jointWith ? tVisit : d.doctorIds.length), 0)
    : days.reduce((s, d) => s + d.doctorIds.length, 0);
  const weekEnd = (() => { const d = new Date(data.nextWeekStart + "T12:00:00"); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })();

  function addDoctor(id: number) {
    if (!picker) return;
    setDays((ds) => ds.map((d, i) => {
      if (i !== picker.dayIdx) return d;
      if (d.doctorIds.includes(id) || d.backupIds.includes(id)) return d;
      return picker.kind === "visit"
        ? { ...d, doctorIds: [...d.doctorIds, id] }
        : { ...d, backupIds: [...d.backupIds, id] };
    }));
    setQ("");
  }
  function removeDoctor(dayIdx: number, kind: "visit" | "backup", id: number) {
    setDays((ds) => ds.map((d, i) => {
      if (i !== dayIdx) return d;
      return kind === "visit"
        ? { ...d, doctorIds: d.doctorIds.filter((x) => x !== id) }
        : { ...d, backupIds: d.backupIds.filter((x) => x !== id) };
    }));
  }

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      await api("/api/plans", { json: { action: "submit", weekStart: data.nextWeekStart, days } });
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const statusTag = plan
    ? plan.status === "approved" ? <span className="tag tag-ok">Approved</span>
      : plan.status === "returned" ? <span className="tag tag-hot">Returned</span>
      : <span className="tag tag-warn">Awaiting approval</span>
    : <span className="tag tag-neutral">Not submitted</span>;

  const pickList = picker
    ? doctors
        .filter((d) => !days[picker.dayIdx].doctorIds.includes(d.id) && !days[picker.dayIdx].backupIds.includes(d.id))
        .filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.clinic.toLowerCase().includes(q.toLowerCase()) || d.area.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 12)
    : [];

  return (
    <Screen me={me}>
      <div className="row" style={{ alignItems: "baseline" }}>
        <h4 style={{ margin: 0, flex: 1 }}>My weekly plan</h4>
        {statusTag}
      </div>
      <div className="small muted" style={{ fontSize: 12 }}>
        Week of Sat {dm(data.nextWeekStart)} → Thu {dm(weekEnd)}
        {isSup ? " · pick the city you work each day" : ` · ${tVisit} to visit + ${tBackup} backup per day`}
      </div>

      {!isSup && data.dueFollowUps?.length ? (
        <div className="soft-accent" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="small" style={{ fontWeight: 600, color: "var(--color-accent-800)" }}>Follow-ups due that week — tap to slot them in:</div>
          {data.dueFollowUps.map((f: any) => {
            const dayIdx = [6, 0, 1, 2, 3, 4].indexOf(new Date(f.date + "T12:00:00").getDay());
            const already = days.some((d) => d.doctorIds.includes(f.doctorId) || d.backupIds.includes(f.doctorId));
            return (
              <div key={f.doctorId} className="row" style={{ fontSize: 12, gap: 8 }}>
                <span style={{ flex: 1, color: "var(--color-accent-800)" }}>{f.name} · {DAYS[dayIdx] ?? f.date}</span>
                {already ? (
                  <span className="tag tag-ok">planned</span>
                ) : (
                  <button className="tag tag-outline" style={{ cursor: "pointer", background: "transparent" }}
                    onClick={() => dayIdx >= 0 && setDays((ds) => ds.map((d, i) => (i === dayIdx && !d.doctorIds.includes(f.doctorId) ? { ...d, doctorIds: [...d.doctorIds, f.doctorId] } : d)))}>
                    ＋ add to {DAYS[dayIdx]}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {plan?.status === "returned" && plan.note ? (
        <div className="card" style={{ borderColor: "var(--c-coral)", gap: 4 }}>
          <div className="small" style={{ color: "var(--c-coral-deep)", fontWeight: 600 }}>Returned with a note</div>
          <div style={{ fontSize: 13 }}>&quot;{plan.note}&quot;</div>
        </div>
      ) : null}

      {isSup ? (
        /* Supervisor: one city per day, optionally riding with a rep. */
        days.map((d, i) => (
          <div key={d.day} className="card" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="hnum" style={{ fontSize: 15, width: 34, color: "var(--color-neutral-500)" }}>{d.day}</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                {(data.cities ?? []).map((c: any) => (
                  <button key={c.id} type="button"
                    className={`tag ${d.city === c.id ? "tag-accent" : "tag-neutral"}`}
                    style={{ cursor: "pointer", border: "none", padding: "6px 14px" }}
                    onClick={() => setDays((ds) => ds.map((x, j) => (j === i ? { ...x, city: x.city === c.id ? null : c.id } : x)))}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            {d.city ? (
              <div className="row" style={{ gap: 8, fontSize: 12 }}>
                <span className="muted">Double visits with:</span>
                <select className="input" style={{ minHeight: 30, fontSize: 12, flex: 1 }}
                  value={d.jointWith ?? ""}
                  onChange={(e) => setDays((ds) => ds.map((x, j) => (j === i ? { ...x, jointWith: e.target.value ? Number(e.target.value) : null } : x)))}>
                  <option value="">Nobody — solo day</option>
                  {(data.reps ?? []).filter((r: any) => r.city === d.city).map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {d.city && !d.jointWith ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--color-divider)", paddingTop: 8 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="small" style={{ flex: 1, color: d.doctorIds.length >= tVisit ? "var(--c-green-deep)" : "var(--c-amber-deep)", fontWeight: 600 }}>
                    Solo day — pick the doctors you will see
                  </span>
                  <span className={`tag ${d.doctorIds.length >= tVisit ? "tag-ok" : "tag-warn"}`}>{d.doctorIds.length}/{tVisit}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {d.doctorIds.map((id) => (
                    <span key={id} className="tag tag-accent" style={{ gap: 5 }}>
                      {docById.get(id)?.name ?? "?"}
                      <button onClick={() => removeDoctor(i, "visit", id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12 }}>✕</button>
                    </span>
                  ))}
                  <button className="tag tag-outline" style={{ cursor: "pointer", background: "transparent" }}
                    onClick={() => { setPicker({ dayIdx: i, kind: "visit" }); setQ(""); }}>＋ doctor</button>
                </div>
                {picker?.dayIdx === i ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <input className="input" autoFocus placeholder="Search doctors in this city…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 32, fontSize: 13 }} />
                      <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setPicker(null)}>Done</button>
                    </div>
                    {doctors
                      .filter((doc) => doc.city === d.city && !d.doctorIds.includes(doc.id))
                      .filter((doc) => !q || doc.name.toLowerCase().includes(q.toLowerCase()) || doc.clinic.toLowerCase().includes(q.toLowerCase()) || doc.area.toLowerCase().includes(q.toLowerCase()))
                      .slice(0, 10)
                      .map((doc) => (
                        <button key={doc.id} onClick={() => addDoctor(doc.id)} className="row" style={{ gap: 8, background: "none", border: "none", cursor: "pointer", font: "inherit", textAlign: "left", padding: "4px 0" }}>
                          <Icon d={paths.pinDot} size={13} stroke={doc.lat != null ? "var(--color-accent)" : "var(--color-neutral-400)"} />
                          <span style={{ flex: 1, fontSize: 13 }}>{doc.name} <span className="muted">· {doc.area || doc.clinic}</span></span>
                          <span className={`tag ${doc.class === "A" ? "tag-accent" : "tag-neutral"}`}>{doc.class}</span>
                        </button>
                      ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {d.city ? (
              <input className="input" placeholder="Note (optional)" value={d.note} style={{ minHeight: 32, fontSize: 13 }}
                onChange={(e) => setDays((ds) => ds.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
            ) : null}
          </div>
        ))
      ) : (
        /* Rep: doctors per day, scoped to his own city. */
        days.map((d, i) => {
          const short = d.doctorIds.length < tVisit || d.backupIds.length < tBackup;
          return (
            <div key={d.day} className="card" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="hnum" style={{ fontSize: 15, width: 34, color: "var(--color-neutral-500)" }}>{d.day}</span>
                <input className="input" placeholder="Area / route" value={d.area}
                  onChange={(e) => setDays((ds) => ds.map((x, j) => (j === i ? { ...x, area: e.target.value } : x)))}
                  style={{ minHeight: 32, fontSize: 13 }} />
                <span className={`tag ${d.doctorIds.length >= tVisit ? "tag-ok" : "tag-warn"}`}>{d.doctorIds.length}/{tVisit}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {d.doctorIds.map((id) => (
                  <span key={id} className="tag tag-accent" style={{ gap: 5 }}>
                    {docById.get(id)?.name ?? "?"}
                    <button onClick={() => removeDoctor(i, "visit", id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12 }}>✕</button>
                  </span>
                ))}
                <button className="tag tag-outline" style={{ cursor: "pointer", background: "transparent" }} onClick={() => { setPicker({ dayIdx: i, kind: "visit" }); setQ(""); }}>＋ doctor</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span className="small muted">Backup:</span>
                {d.backupIds.map((id) => (
                  <span key={id} className="tag tag-neutral" style={{ gap: 5 }}>
                    {docById.get(id)?.name ?? "?"}
                    <button onClick={() => removeDoctor(i, "backup", id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12 }}>✕</button>
                  </span>
                ))}
                <button className="tag tag-outline" style={{ cursor: "pointer", background: "transparent" }} onClick={() => { setPicker({ dayIdx: i, kind: "backup" }); setQ(""); }}>＋</button>
                {short ? <span className="small" style={{ marginLeft: "auto", color: "var(--c-amber-deep)" }}>below {tVisit}+{tBackup} guide</span> : null}
              </div>
              {picker?.dayIdx === i ? (
                <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <input className="input" autoFocus placeholder={`Add ${picker.kind === "visit" ? "visit" : "backup"} doctor…`} value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 32, fontSize: 13 }} />
                    <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setPicker(null)}>Done</button>
                  </div>
                  {pickList.map((doc) => (
                    <button key={doc.id} onClick={() => addDoctor(doc.id)} className="row" style={{ gap: 8, background: "none", border: "none", cursor: "pointer", font: "inherit", textAlign: "left", padding: "4px 0" }}>
                      <Icon d={paths.pinDot} size={13} stroke={doc.lat != null ? "var(--color-accent)" : "var(--color-neutral-400)"} />
                      <span style={{ flex: 1, fontSize: 13 }}>{doc.name} <span className="muted">· {doc.area || doc.clinic}</span></span>
                      <span className={`tag ${doc.class === "A" ? "tag-accent" : "tag-neutral"}`}>{doc.class}</span>
                    </button>
                  ))}
                  {pickList.length === 0 ? <div className="small muted">No more doctors match.</div> : null}
                </div>
              ) : null}
            </div>
          );
        })
      )}

      <div className="row" style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
        <span style={{ flex: 1 }}>{isSup ? "Days planned" : "Total planned"}</span>
        <span className="hnum" style={{ fontSize: 17, color: "var(--color-accent-700)" }}>
          {isSup ? `${days.filter((d) => d.city).length} days · ${total} meetings` : `${total} visits`}
        </span>
      </div>
      {err ? <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>{err}</div> : null}
      <button className="btn btn-primary btn-block" style={{ padding: 12, marginTop: "auto" }} onClick={submit} disabled={busy || total === 0}>
        {busy ? "Submitting…" : plan && plan.status !== "returned" ? "Re-submit plan" : "Submit plan"}
      </button>
      <div className="hint" style={{ textAlign: "center" }}>
        {isSup
          ? `Pick a city per day. Riding with a rep follows his list; a solo day needs at least ${tVisit} doctors of your own.`
          : "Only doctors in your city are listed. Approved plans become your route on the home screen."}
      </div>
    </Screen>
  );
}

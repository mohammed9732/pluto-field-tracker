"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api } from "@/lib/fmt";
import { DEFAULT_TERMS } from "@/lib/types";
import { useTerms, lower } from "@/lib/terms";

const MASCOT_SLOTS: [string, string, string][] = [
  ["mascotIdleId", "Standing", "idle"],
  ["mascotHelloId", "Waving hello", "hello"],
  ["mascotCheerId", "Celebrating", "cheer"],
  ["mascotSadId", "Disappointed", "sad"],
];

const TERM_FIELDS: [keyof typeof DEFAULT_TERMS, string, string][] = [
  ["doctor", "One customer", "Doctor"],
  ["doctorPlural", "Many customers", "Doctors"],
  ["clinic", "Where they work", "Clinic"],
  ["roleAdmin", "You", "Owner"],
  ["roleSupervisor", "Field manager", "Supervisor"],
  ["roleRep", "Field staff", "Medical rep"],
  ["roleAccountant", "Finance", "Accountant"],
];

const togglesFor = (t: typeof DEFAULT_TERMS): [string, string, string][] => [
  ["supervisorCanAddDoctors", `${t.roleSupervisor} can add ${lower(t.doctorPlural)}`, `Add-${lower(t.doctor)} card on the ${lower(t.roleSupervisor)}'s app`],
  ["repsCanAddDoctors", `${t.roleRep}s can add ${lower(t.doctorPlural)}`, `Add-${lower(t.doctor)} card on the ${lower(t.roleRep)} apps`],
  ["supervisorCanToggleRepAdd", `${t.roleSupervisor} may flip the ${lower(t.roleRep)} switch`, `Off = only you control whether ${lower(t.roleRep)}s can add ${lower(t.doctorPlural)}`],
  ["plannerEnabled", "Weekly planner", `${t.roleRep}s build weekly plans, ${lower(t.doctor)} by ${lower(t.doctor)}, for approval`],
  ["paymentsEnabled", "Payment collection", "Reps record collected amounts with a signed-receipt photo"],
  ["repPriceEdit", "Reps can edit prices", "Off = order prices always come from your tier table"],
  ["spendingsEnabled", "Spendings", "Field spendings with receipts, paid back monthly"],
  ["spendingSupervisorStep", "Supervisor approves spendings first", "Off = spendings go straight to the accountant"],
  ["tasksEnabled", "Tasks", "Accountant and supervisor can assign tasks"],
  ["chatAttachments", "Chat attachments", "Voice messages, images and files in chat"],
  ["visitPhotos", "Visit photos", "Optional photo attached to a visit"],
  ["performanceTab", "Performance tab", "Per-rep KPIs, visit frequency, most/least visited"],
  ["leaderboard", "Monthly leaderboard", "Rep ranking visible to all reps"],
  ["announcementsEnabled", "Announcements", "Moving ticker at the top of every screen"],
  ["deductionsEnabled", "No-check-in deductions", "Flag unexcused missed days for salary deduction"],
  ["paymentReceiptRequired", "Require receipt photo on payments", "Reps must photograph the signed physical receipt"],
  ["managementSeesAllTasks", "Supervisor & accountant see all tasks", "Everything assigned to reps by anyone, not just their own"],
  ["weeklyStockCheck", "Weekly stock check", "City reps must count their own stock by Thursday"],
  ["samplesEnabled", "Free samples", "Reps can mark an order as a sample — free, no target credit, stock still moves"],
  ["competitorTracking", "Competitor tracking", "Capture competitor info during visits and on the market intel page"],
];

const metricsFor = (t: typeof DEFAULT_TERMS): [string, string][] => [
  ["planVisitTarget", `${t.roleRep}: ${lower(t.doctorPlural)} to visit per day`],
  ["planBackupTarget", `${t.roleRep}: backup ${lower(t.doctorPlural)} per day`],
  ["supervisorPlanVisitTarget", "Supervisor: client meetings per day"],
  ["supervisorPlanBackupTarget", "Supervisor: backups per day"],
  ["salesCommissionPct", "Sales commission % (quarterly)"],
  ["collectionCommissionPct", "Collection commission % (monthly)"],
  ["visitRadiusM", "Visit GPS radius (meters)"],
  ["pingMinutes", "GPS ping interval (minutes)"],
  ["dwellRadiusM", `${t.clinic} dwell radius (meters)`],
  ["lowStockThreshold", "Low-stock alert at or below"],
  ["expiryWarnMonths", "Expiry warning (months ahead)"],
  ["checkinNudgeHour", "Check-in reminder hour (0–23)"],
  ["dailySummaryHour", "Daily summary hour (0–23)"],
  ["editWindowMinutes", "Rep self-correction window (minutes)"],
];

export default function ControlPanel() {
  const me = useMe();
  const [settings, setSettings] = useState<any>(null);
  const [announce, setAnnounce] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [editGroup, setEditGroup] = useState<any>(null);
  const [newCity, setNewCity] = useState("");
  const [cityErr, setCityErr] = useState("");
  const t = useTerms();
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const mascotRef = useRef<HTMLInputElement>(null);
  const [mascotSlot, setMascotSlot] = useState<string | null>(null);
  const [mascotBusy, setMascotBusy] = useState<string | null>(null);
  const [wipe, setWipe] = useState<"records" | "everything" | null>(null);
  const [wipeWord, setWipeWord] = useState("");
  const [wipeMsg, setWipeMsg] = useState("");
  const [wipeBusy, setWipeBusy] = useState(false);
  const [closeMonth, setCloseMonth] = useState("");
  const [closeMsg, setCloseMsg] = useState("");
  const [closeBusy, setCloseBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMsg, setDemoMsg] = useState("");

  const load = useCallback(() => {
    api("/api/settings").then((r: any) => setSettings(r.settings)).catch(() => {});
    api("/api/notify").then((r: any) => setAnnouncements(r.announcements)).catch(() => {});
    api("/api/admin").then((r: any) => { setGroups(r.chatGroups ?? []); setUsers(r.users ?? []); }).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !settings) return <Spinner />;

  async function patch(p: Record<string, any>) {
    const r = await api<{ settings: any }>("/api/settings", { json: { patch: p } });
    setSettings(r.settings);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  async function patchCities(cities: any[]) {
    setCityErr("");
    try {
      await patch({ cities });
    } catch (e: any) {
      setCityErr(e.message);
      load();
    }
  }

  async function postAnnouncement() {
    if (!announce.trim()) return;
    await api("/api/notify", { json: { action: "announce", body: announce.trim() } });
    setAnnounce("");
    load();
  }

  return (
    <Screen me={me} wide>
        <div className="row">
          <h4 style={{ margin: 0, flex: 1 }}>Control panel</h4>
          {savedFlash ? <span className="tag tag-ok">Saved</span> : null}
        </div>

        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Company</h6>
        <div className="two-col" style={{ gap: 10 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Company name</label>
            <input className="input" defaultValue={settings.companyName} onBlur={(e) => e.target.value !== settings.companyName && patch({ companyName: e.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Currency label</label>
            <input className="input" defaultValue={settings.currency} onBlur={(e) => e.target.value !== settings.currency && patch({ currency: e.target.value })} />
          </div>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Subtitle under the company name</label>
          <input className="input" defaultValue={settings.companySub ?? ""} placeholder="Leave empty to hide"
            onBlur={(e) => e.target.value !== settings.companySub && patch({ companySub: e.target.value })} />
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Logo &amp; colour</h6>
        <div className="card" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <div style={{
              width: 62, height: 62, borderRadius: 14, flex: "none", display: "grid", placeItems: "center",
              background: "var(--color-neutral-200)", border: "1px solid var(--color-divider)", overflow: "hidden",
            }}>
              {settings.logoId ? (
                <img src={`/api/logo?v=${settings.logoId}`} alt="Logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : <span className="small muted">None</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small">
                Shown on the sign-in screen, at the top of the app, and as the icon on
                your team&apos;s phones. A square PNG around 512&times;512 works best.
              </div>
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                  disabled={logoBusy} onClick={() => logoRef.current?.click()}>
                  {logoBusy ? "Uploading…" : settings.logoId ? "Replace logo" : "Upload logo"}
                </button>
                {settings.logoId ? (
                  <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                    onClick={() => patch({ logoId: "" })}>Remove</button>
                ) : null}
              </div>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setLogoBusy(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", f);
                    const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
                    if (up.id) await patch({ logoId: up.id });
                  } finally { setLogoBusy(false); }
                }} />
            </div>
          </div>

          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <input type="color" value={settings.brandColor ?? "#2f6fe0"} aria-label="Brand colour"
              onChange={(e) => patch({ brandColor: e.target.value })}
              style={{ width: 46, height: 34, padding: 2, border: "1px solid var(--color-divider)", borderRadius: 8, background: "none", cursor: "pointer", flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Brand colour</div>
              <div className="small muted">
                Buttons, links and highlights follow this. The lighter and darker shades
                are worked out for you. Reload to see it everywhere.
              </div>
            </div>
          </div>
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Mascot artwork</h6>
        <div className="card" style={{ gap: 12 }}>
          <div className="small muted">
            Upload your own character and it replaces the drawn one everywhere — sign-in,
            the daily card, and the celebration screens. PNG with a transparent background
            works best, roughly 600px tall. Leave a slot empty and it falls back to the
            standing pose.
          </div>
          <div className="two-col" style={{ gap: 10 }}>
            {MASCOT_SLOTS.map(([key, label, hint]) => (
              <div key={key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 62, height: 68, borderRadius: 14, flex: "none", display: "grid",
                  placeItems: "center", background: "var(--color-neutral-200)",
                  border: "1px solid var(--color-divider)", overflow: "hidden",
                }}>
                  {settings[key] ? (
                    <img src={`/api/mascot?mood=${hint}&v=${settings[key]}`} alt=""
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : <span className="small muted" style={{ fontSize: 10 }}>Drawn</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div className="row" style={{ gap: 6, marginTop: 5 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: "5px 10px" }}
                      disabled={mascotBusy === key}
                      onClick={() => { setMascotSlot(key); setTimeout(() => mascotRef.current?.click(), 0); }}>
                      {mascotBusy === key ? "Uploading…" : settings[key] ? "Replace" : "Upload"}
                    </button>
                    {settings[key] ? (
                      <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                        onClick={() => patch({ [key]: "" })}>Clear</button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <input ref={mascotRef} type="file" accept="image/png,image/webp,image/jpeg" style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f || !mascotSlot) return;
              setMascotBusy(mascotSlot);
              try {
                const fd = new FormData();
                fd.append("file", f);
                const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
                if (up.id) await patch({ [mascotSlot]: up.id });
              } finally { setMascotBusy(null); setMascotSlot(null); }
            }} />
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>What you call things</h6>
        <div className="card" style={{ gap: 10 }}>
          <div className="small muted">
            Change these and the whole app follows. Leave one empty to go back to the default.
          </div>
          <div className="two-col" style={{ gap: 10 }}>
            {TERM_FIELDS.map(([key, label, fallback]) => (
              <div className="field" style={{ margin: 0 }} key={key}>
                <label>{label}</label>
                <input className="input" placeholder={fallback}
                  defaultValue={(settings.terms ?? DEFAULT_TERMS)[key] ?? ""}
                  onBlur={(e) => {
                    const next = { ...(settings.terms ?? DEFAULT_TERMS), [key]: e.target.value };
                    if (e.target.value !== (settings.terms ?? DEFAULT_TERMS)[key]) patch({ terms: next });
                  }} />
              </div>
            ))}
          </div>
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label>Sign-in screen footer</label>
          <input className="input" defaultValue={settings.loginFooter ?? ""} placeholder="Leave empty to hide"
            onBlur={(e) => e.target.value !== settings.loginFooter && patch({ loginFooter: e.target.value })} />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label>Supervisor visit label</label>
          <input className="input" defaultValue={settings.supervisorVisitLabel} onBlur={(e) => e.target.value !== settings.supervisorVisitLabel && patch({ supervisorVisitLabel: e.target.value })} />
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Cities</h6>
        <div className="small muted">
          {`Every ${lower(t.doctor)}, ${lower(t.roleRep)} and stock location belongs to a city.`} Districts like Soran are areas inside their city.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(settings.cities ?? []).map((c: any) => (
            <div key={c.id} className="listrow" style={{ padding: "8px 0" }}>
              <input
                className="input"
                defaultValue={c.name}
                style={{ flex: 1, minHeight: 32 }}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (!name || name === c.name) return;
                  patchCities((settings.cities ?? []).map((x: any) => (x.id === c.id ? { ...x, name } : x)));
                }}
              />
              <span className="small muted" style={{ width: 70 }}>{c.id}</span>
              <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                onClick={() => patchCities((settings.cities ?? []).filter((x: any) => x.id !== c.id))}>
                Remove
              </button>
            </div>
          ))}
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="Add a city (e.g. Sulaymaniyah)" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
            <button className="btn btn-primary" style={{ padding: "8px 16px", flex: "none" }}
              onClick={() => {
                const name = newCity.trim();
                if (!name) return;
                patchCities([...(settings.cities ?? []), { id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name }]);
                setNewCity("");
              }}>
              Add
            </button>
          </div>
          {cityErr ? <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>{cityErr}</div> : null}
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Feature switches</h6>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {togglesFor(t).map(([key, label, hint]) => (
            <label key={key} className="listrow" style={{ cursor: "pointer", padding: "10px 0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                <div className="small muted">{hint}</div>
              </div>
              <input type="checkbox" checked={!!settings[key]} onChange={(e) => patch({ [key]: e.target.checked })} style={{ width: 20, height: 20, accentColor: "var(--color-accent)" }} />
            </label>
          ))}
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Metrics</h6>
        <div className="two-col" style={{ gap: 10 }}>
          {metricsFor(t).map(([key, label]) => (
            <div key={key} className="field" style={{ margin: 0 }}>
              <label>{label}</label>
              <input className="input" inputMode="numeric" defaultValue={settings[key]} onBlur={(e) => Number(e.target.value) !== settings[key] && patch({ [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Chat</h6>
        <div className="field" style={{ margin: 0 }}>
          <label>Who can reps direct-message?</label>
          <select className="input" value={settings.dmPolicy} onChange={(e) => patch({ dmPolicy: e.target.value })}>
            <option value="management">Supervisor and accountant only</option>
            <option value="none">Nobody — groups only</option>
            <option value="all">Everyone</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {groups.map((g) => (
            <div key={g.id} className="listrow" style={{ padding: "8px 0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}{g.builtin ? <span className="small muted"> · built-in</span> : ""}</div>
                <div className="small muted">{g.memberIds.map((id: number) => users.find((u) => u.id === id)?.name?.split(" ")[0] ?? "?").join(", ") || "no members"}</div>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditGroup({ ...g, memberIds: [...g.memberIds] })}>Edit</button>
              {!g.builtin ? (
                <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                  onClick={async () => { if (window.confirm(`Delete group "${g.name}"?`)) { await api("/api/admin", { json: { action: "deleteGroup", id: g.id } }); load(); } }}>
                  Delete
                </button>
              ) : null}
            </div>
          ))}
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px", alignSelf: "flex-start" }}
            onClick={() => setEditGroup({ name: "", memberIds: [] })}>＋ New group</button>
        </div>
        {editGroup ? (
          <div className="card" style={{ gap: 10 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Group name</label>
              <input className="input" value={editGroup.name} disabled={editGroup.builtin} onChange={(e) => setEditGroup({ ...editGroup, name: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {users.filter((u) => u.active).map((u) => (
                <button key={u.id} type="button"
                  className={`tag ${editGroup.memberIds.includes(u.id) ? "tag-accent" : "tag-neutral"}`}
                  style={{ cursor: "pointer", border: "none", padding: "5px 12px" }}
                  onClick={() => setEditGroup((g: any) => ({ ...g, memberIds: g.memberIds.includes(u.id) ? g.memberIds.filter((x: number) => x !== u.id) : [...g.memberIds, u.id] }))}>
                  {u.name}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn btn-primary" style={{ padding: 9 }}
                onClick={async () => { await api("/api/admin", { json: { action: "saveGroup", ...editGroup } }); setEditGroup(null); load(); }}>Save group</button>
              <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setEditGroup(null)}>Cancel</button>
            </div>
          </div>
        ) : null}

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Announcements</h6>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" placeholder="Write a pinned announcement…" value={announce} onChange={(e) => setAnnounce(e.target.value)} />
          <button className="btn btn-primary" style={{ padding: "8px 16px", flex: "none" }} onClick={postAnnouncement}>Post</button>
        </div>
        {announcements.map((a) => (
          <div key={a.id} className="listrow" style={{ padding: "8px 0" }}>
            <div style={{ flex: 1, fontSize: 13 }}>{a.body}</div>
            <span className="small muted">{a.seenBy?.length ?? 0} seen</span>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={async () => { await api("/api/notify", { json: { action: "stopAnnouncement", id: a.id } }); load(); }}>Stop</button>
          </div>
        ))}

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Company data</h6>
        <div className="card" style={{ gap: 8 }}>
          <div className="small">
            The server keeps an automatic backup every day and holds the last 14.
            Download a copy now and then so the company keeps its own record too.
          </div>
          <a className="btn btn-secondary" href="/api/backup" style={{ padding: 9, textAlign: "center" }}>
            Download a backup
          </a>
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Closing the month</h6>
        <div className="card" style={{ gap: 10 }}>
          <div className="small muted">
            Once a month is closed, nothing dated in it can be added or edited — so payroll
            you have already paid cannot move underneath you. A backup is taken first.
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="tag tag-neutral">
              {settings.closedThrough ? `Closed through ${settings.closedThrough}` : "Nothing closed yet"}
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="2026-07" value={closeMonth}
              onChange={(e) => setCloseMonth(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-primary" style={{ flex: "none" }} disabled={closeBusy}
              onClick={async () => {
                setCloseBusy(true); setCloseMsg("");
                try {
                  const r = await api<any>("/api/close", { json: { period: closeMonth } });
                  setCloseMsg(`Closed through ${r.closedThrough}.`);
                  setCloseMonth("");
                  load();
                } catch (e: any) { setCloseMsg(e.message); }
                finally { setCloseBusy(false); }
              }}>
              {closeBusy ? "Closing…" : "Close month"}
            </button>
          </div>
          {settings.closedThrough ? (
            <button className="btn btn-ghost" style={{ fontSize: 12, alignSelf: "flex-start" }}
              onClick={async () => {
                if (!window.confirm("Reopen everything? Figures you have already paid could change.")) return;
                try {
                  await api("/api/close", { json: { action: "reopen", period: "" } });
                  setCloseMsg("Reopened. Everything is editable again.");
                  load();
                } catch (e: any) { setCloseMsg(e.message); }
              }}>
              Reopen all months
            </button>
          ) : null}
          {closeMsg ? <div className="small" style={{ fontWeight: 600 }}>{closeMsg}</div> : null}
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Sample data</h6>
        <div className="card" style={{ gap: 10 }}>
          <div className="small muted">
            Fills the app with a realistic demo company — staff, doctors, visits, orders
            and payments — so you can show it in training. Your logo, colours, wording and
            mascot are kept. Clear it from the danger zone below when you go live.
          </div>
          <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }}
            disabled={demoBusy}
            onClick={async () => {
              if (!window.confirm("Load sample data? Anything currently in the app is replaced. A backup is saved first, and you may need to sign in again.")) return;
              setDemoBusy(true); setDemoMsg("");
              try {
                const r = await api<any>("/api/reset", { json: { action: "loadDemo" } });
                setDemoMsg(`Loaded ${r.counts.doctors} doctors, ${r.counts.orders} orders, ${r.counts.users} people. Reloading…`);
                setTimeout(() => window.location.assign(r.signOut ? "/login" : "/admin"), 1800);
              } catch (e: any) { setDemoMsg(e.message); }
              finally { setDemoBusy(false); }
            }}>
            {demoBusy ? "Loading…" : "Load sample data"}
          </button>
          {demoMsg ? <div className="small" style={{ fontWeight: 600 }}>{demoMsg}</div> : null}
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--c-coral-deep)" }}>Danger zone</h6>
        <div className="card" style={{ gap: 10, borderColor: "var(--c-coral)" }}>
          <div className="small">
            When the training run is over and you are ready for real work, clear the
            practice records. A backup is saved on the server first, every time.
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" style={{ fontSize: 13 }}
              onClick={() => setWipe("records")}>Clear practice records</button>
            <button className="btn btn-secondary" style={{ fontSize: 13, color: "var(--c-coral-deep)" }}
              onClick={() => setWipe("everything")}>Start completely fresh</button>
          </div>
          <div className="hint">
            <b>Clear practice records</b> deletes doctors, visits, orders, payments, chat and
            tasks — your staff, products and settings stay.
            <br />
            <b>Start completely fresh</b> also removes every other user account and the
            product list, leaving only you.
          </div>
        </div>

        {wipe ? (
          <div className="card" style={{ gap: 10, borderColor: "var(--c-coral)", background: "var(--c-coral-soft)" }}>
            <div style={{ fontWeight: 700 }}>
              {wipe === "everything" ? "Start completely fresh?" : "Clear practice records?"}
            </div>
            <div className="small">
              This cannot be undone from inside the app. Type <b>DELETE</b> to confirm.
            </div>
            <input className="input" value={wipeWord} placeholder="DELETE"
              onChange={(e) => setWipeWord(e.target.value)} />
            {wipeMsg ? <div className="small" style={{ fontWeight: 600 }}>{wipeMsg}</div> : null}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-coral" style={{ flex: 1 }} disabled={wipeBusy}
                onClick={async () => {
                  setWipeBusy(true);
                  setWipeMsg("");
                  try {
                    const r = await api<any>("/api/reset", { json: { mode: wipe, confirm: wipeWord } });
                    setWipeMsg(`Done. Backup saved as ${r.backup ?? "(none)"}. Reloading…`);
                    setTimeout(() => window.location.reload(), 1600);
                  } catch (e: any) {
                    setWipeMsg(e.message);
                  } finally { setWipeBusy(false); }
                }}>
                {wipeBusy ? "Working…" : "Yes, delete"}
              </button>
              <button className="btn btn-secondary" onClick={() => { setWipe(null); setWipeWord(""); setWipeMsg(""); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="hint" style={{ marginTop: "auto" }}>
          Every change applies immediately for everyone. Metrics affect new calculations, never historical records.
        </div>
    </Screen>
  );
}

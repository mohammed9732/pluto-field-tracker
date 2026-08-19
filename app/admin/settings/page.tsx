"use client";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api } from "@/lib/fmt";

const TOGGLES: [string, string, string][] = [
  ["supervisorCanAddDoctors", "Supervisor can add doctors", "Add-doctor card on the supervisor's app"],
  ["repsCanAddDoctors", "Reps can add doctors", "Add-doctor card on the reps' apps"],
  ["supervisorCanToggleRepAdd", "Supervisor may flip the reps switch", "Off = only you control whether reps can add doctors"],
  ["plannerEnabled", "Weekly planner", "Reps build doctor-by-doctor weekly plans for approval"],
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

const METRICS: [string, string][] = [
  ["planVisitTarget", "Rep: visit doctors per day"],
  ["planBackupTarget", "Rep: backup doctors per day"],
  ["supervisorPlanVisitTarget", "Supervisor: client meetings per day"],
  ["supervisorPlanBackupTarget", "Supervisor: backups per day"],
  ["salesCommissionPct", "Sales commission % (quarterly)"],
  ["collectionCommissionPct", "Collection commission % (monthly)"],
  ["visitRadiusM", "Visit GPS radius (meters)"],
  ["pingMinutes", "GPS ping interval (minutes)"],
  ["dwellRadiusM", "Clinic dwell radius (meters)"],
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
          <label>Supervisor visit label</label>
          <input className="input" defaultValue={settings.supervisorVisitLabel} onBlur={(e) => e.target.value !== settings.supervisorVisitLabel && patch({ supervisorVisitLabel: e.target.value })} />
        </div>

        <h6 style={{ margin: "8px 0 0", color: "var(--color-neutral-600)" }}>Cities</h6>
        <div className="small muted">
          Every doctor, rep and stock location belongs to a city. Districts like Soran are areas inside their city.
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
          {TOGGLES.map(([key, label, hint]) => (
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
          {METRICS.map(([key, label]) => (
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

        <div className="hint" style={{ marginTop: "auto" }}>
          Every change applies immediately for everyone. Metrics affect new calculations, never historical records.
        </div>
    </Screen>
  );
}

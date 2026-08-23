"use client";
import { tr } from "@/lib/i18n";
import { DailyBoost } from "@/components/DailyBoost";
import { useTerms, roleLabel } from "@/lib/terms";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen, useMe, Spinner, Pips } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, durationHM, hm, dm, weekdayShort } from "@/lib/fmt";
import { getPosition } from "@/lib/geo";
import { useRouter } from "next/navigation";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

const OUTCOME_TAG: Record<string, [string, string]> = {
  order: ["Order", "tag-accent"],
  follow_up: ["Follow-up", "tag-neutral"],
  payment: ["Payment", "tag-ok"],
};

export default function Home() {
  const me = useMe();
  const t = useTerms();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [openTasks, setOpenTasks] = useState(0);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    api("/api/field").then(setData).catch(() => {});
    api("/api/tasks?scope=mine").then((r: any) => {
      setOpenTasks((r.tasks ?? []).filter((t: any) => t.status === "open" && !t.myDone).length);
    }).catch(() => {});
  }, []);
  useEffect(load, [load]);

  // Location ping while checked in and the app is open (interval from settings).
  useEffect(() => {
    if (!data?.fieldTime?.checkedIn) return;
    const minutes = data?.settings?.pingMinutes || 5;
    const send = async () => {
      const p = await getPosition();
      if (p.lat != null) api("/api/field", { json: { action: "ping", ...p } }).catch(() => {});
    };
    pingTimer.current = setInterval(send, minutes * 60 * 1000);
    return () => { if (pingTimer.current) clearInterval(pingTimer.current); };
  }, [data?.fieldTime?.checkedIn, data?.settings?.pingMinutes]);

  if (!me || !data) return <Spinner />;

  const checkedIn = data.fieldTime.checkedIn;
  const visitCount = data.visits.length;
  const min = me.dailyMin || 5;
  const route = data.route;
  const nextDoctor = route?.doctors?.find((d: any) => !d.visited) ?? null;
  const visitWord = me.role === "supervisor" ? (data.supervisorVisitLabel || "Client meeting") : "Visit";

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

  async function logout() {
    await api("/api/auth/logout", { json: {} });
    router.replace("/login");
  }

  // Everything that isn't part of the daily flow lives in the icon grid.
  const tiles: { href: string; label: string; icon: keyof typeof paths; badge?: number }[] = [
    { href: "/map", label: "Map", icon: "pin" },
    { href: "/doctors", label: t.doctorPlural, icon: "pinDot" },
    ...(data.settings?.tasksEnabled ? [{ href: "/tasks", label: "Tasks", icon: "check" as const, badge: openTasks || undefined }] : []),
    ...(data.settings?.spendingsEnabled ? [{ href: "/spendings", label: "Spendings", icon: "receipt" as const }] : []),
    { href: "/stock", label: "Stock", icon: "warehouse" },
    { href: "/catalog", label: "Products", icon: "bag" },
    ...(data.settings?.competitorTracking ? [{ href: "/competitors", label: "Market intel", icon: "warn" as const }] : []),
    { href: "/leave", label: "Leave", icon: "away" },
    ...(me.role === "supervisor" ? [{ href: "/targets", label: "Targets", icon: "target" as const }] : []),
    ...(me.role === "supervisor" ? [{ href: "/summary", label: "Day summary", icon: "cal" as const }] : []),
  ];

  return (
    <Screen me={me}>
      <div className="row">
        <div style={{ flex: 1 }}>
          <div className="hnum" style={{ fontSize: 19 }}>{me.name}</div>
          <div className="small muted">
            {roleLabel(t, me.role)} · {weekdayShort(data.today)} {dmy(data.today)}
          </div>
        </div>
        <Link href="/map" className="tag" style={{ textDecoration: "none", background: checkedIn ? "var(--c-coral-soft)" : "var(--color-neutral-200)", color: checkedIn ? "var(--c-coral-deep)" : "var(--color-neutral-600)", padding: "6px 12px", fontWeight: 600 }}>
          {checkedIn ? `● ${durationHM(data.fieldTime.minutes)}` : "Not checked in"}
        </Link>
        <button className="btn btn-secondary btn-icon" style={{ width: 40, height: 40 }} onClick={logout} title="Sign out">
          <Icon d={paths.logout} size={17} />
        </button>
      </div>

      {!checkedIn ? (
        <Link href="/map" className="card" style={{ gap: 6, padding: 14, textDecoration: "none", color: "inherit", borderColor: "var(--color-accent)" }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon d={paths.pin} size={16} stroke="var(--color-accent)" />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-accent-800)" }}>Start your day — check in on the Map tab</span>
            <span style={{ color: "var(--color-neutral-400)" }}>→</span>
          </div>
        </Link>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <h5 style={{ margin: 0 }}>{route ? "Today's route" : "Today"}</h5>
          <span className="hnum" style={{ fontSize: 16, color: "var(--color-accent-700)" }}>{visitCount}/{min}</span>
          {route ? <span className="small muted" style={{ marginLeft: "auto" }}>{route.area}</span>
            : <span className="small muted" style={{ marginLeft: "auto" }}>{visitCount >= min ? "minimum reached" : `${min - visitCount} to go`}</span>}
        </div>
        <Pips done={visitCount} total={min} />
      </div>

      {route ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {route.doctors.map((d: any, i: number) => {
            const isNext = nextDoctor && d.id === nextDoctor.id;
            return d.visited ? (
              <div key={d.id} className="card" style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                <Icon d={paths.check} size={15} stroke="var(--c-green-deep)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-neutral-500)", textDecoration: "line-through" }}>{d.name}</div>
                  <div className="small muted">{d.time}</div>
                </div>
                <span className={`tag ${OUTCOME_TAG[d.outcome]?.[1] ?? "tag-neutral"}`}>{OUTCOME_TAG[d.outcome]?.[0] ?? ""}</span>
              </div>
            ) : (
              <Link key={d.id} href={`/visit?doctorId=${d.id}`} className="card" style={{
                flexDirection: "row", alignItems: "center", gap: 10, padding: "10px 12px", textDecoration: "none", color: "inherit",
                background: isNext ? "var(--color-accent-100)" : undefined,
                borderColor: isNext ? "var(--color-accent)" : undefined,
              }}>
                <span className="hnum" style={{ fontSize: 14, width: 16, textAlign: "center", color: isNext ? "var(--color-accent-800)" : "var(--color-neutral-500)" }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isNext ? "var(--color-accent-800)" : undefined }}>{d.name}</div>
                  <div className="small" style={{ color: isNext ? "var(--color-accent-700)" : "var(--color-neutral-600)" }}>
                    {/* Every stop is tappable — the route is a suggestion, not an
                        order, and a rep often takes them out of sequence. */}
                    {d.clinic} · {tr("day.tapToLog", "tap to log")}
                  </div>
                </div>
                <Icon d="M5 12h14m-7-7 7 7-7 7" size={15}
                  stroke={isNext ? "var(--color-accent-700)" : "var(--color-neutral-400)"} />
              </Link>
            );
          })}
          {route.backups?.length ? (
            <div className="small muted">Backup: {route.backups.map((b: any) => b.name).join(" · ")}</div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.visits.map((v: any) => (
            <div key={v.id} className="listrow">
              <span className="small" style={{ color: "var(--color-neutral-500)", width: 34 }}>{v.time}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}><DoctorLink id={v.doctorId} name={v.doctor?.name ?? "?"} /></div>
                <div className="small muted">{v.doctor?.clinic}</div>
              </div>
              <span className={`tag ${OUTCOME_TAG[v.outcome]?.[1] ?? "tag-neutral"}`}>{OUTCOME_TAG[v.outcome]?.[0] ?? v.outcome}</span>
            </div>
          ))}
          {data.settings?.plannerEnabled ? (
            <Link href="/plan" className="hint" style={{ textDecoration: "none" }}>No approved plan for today — build your weekly plan →</Link>
          ) : null}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: data.settings?.paymentsEnabled ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
        <Link href="/visit" className="btn btn-primary" style={{ padding: "12px 6px", fontSize: 13 }}>＋ {visitWord}</Link>
        <Link href="/order" className="btn btn-secondary" style={{ padding: "12px 6px", fontSize: 13 }}>Order</Link>
        {data.settings?.paymentsEnabled ? <Link href="/pay" className="btn btn-secondary" style={{ padding: "12px 6px", fontSize: 13 }}>Payment</Link> : null}
      </div>

      {data.followUps.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Follow-ups due</h6>
          {data.followUps.map((f: any) => (
            <div key={f.id} className="row" style={{ fontSize: 13, padding: "4px 0" }}>
              <Icon d={paths.clock} size={17} stroke={f.date === data.today ? "var(--color-accent)" : "var(--color-neutral-500)"} />
              <span style={{ flex: 1 }}>{f.doctor}</span>
              <span className="small" style={{ color: f.date === data.today ? "var(--color-accent-700)" : "var(--color-neutral-500)" }}>
                {f.date === data.today ? "Today" : `${weekdayShort(f.date)} ${dm(f.date)}`}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <DailyBoost date={data.today} name={me.name} />

      <div className="tilegrid" style={{ marginTop: "auto" }}>
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="tile">
            <Icon d={paths[t.icon]} size={21} stroke="var(--color-accent)" />
            <span>{t.label}</span>
            {t.badge ? <span className="tile-badge">{t.badge}</span> : null}
          </Link>
        ))}
      </div>
    </Screen>
  );
}

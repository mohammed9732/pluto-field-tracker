"use client";
import { LightboxHost } from "@/components/Lightbox";
import { LangToggle } from "./LangToggle";
import { OutboxBar } from "./OutboxBar";
import { setBrand, setTerms, term, useBrand, useTerms } from "@/lib/terms";
import { resolveLang, setLang, tr, useLang, useT } from "@/lib/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, paths } from "./Icons";
import { api } from "@/lib/fmt";
import { ChatDock } from "./ChatDock";

export interface Me {
  id: number;
  name: string;
  role: "admin" | "supervisor" | "rep" | "accountant" | "collector";
  city: string;
  phone: string;
  dailyMin: number;
}

export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const router = useRouter();
  useEffect(() => {
    api<{ user: Me | null; terms?: any; companyName?: string; hasLogo?: boolean; lang?: any; defaultLang?: any }>("/api/auth/me")
      .then((r) => {
        setTerms(r.terms);
        setLang(resolveLang(r.lang, r.defaultLang));
        setBrand({ companyName: r.companyName, hasLogo: r.hasLogo });
        setMe(r.user);
        if (!r.user) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return me;
}

// Read lazily so a renamed word reaches the nav without a reload.
const DOCTORS_LABEL = "Doctors";



const NAV: Record<string, { href: string; label: string; tkey?: string; icon: keyof typeof paths }[]> = {
  rep: [
    { href: "/home", label: "Home", tkey: "nav.home", icon: "home" },
    { href: "/plan", label: "Plan", tkey: "nav.plan", icon: "cal" },
    { href: "/orders", label: "Orders", tkey: "nav.orders", icon: "orders" },
    { href: "/progress", label: "Progress", tkey: "nav.progress", icon: "chart" },
  ],
  supervisor: [
    { href: "/home", label: "Home", tkey: "nav.home", icon: "home" },
    { href: "/team", label: "Team", tkey: "nav.team", icon: "users" },
    { href: "/approvals", label: "Approvals", tkey: "nav.approvals", icon: "check" },
    { href: "/doctors", label: DOCTORS_LABEL, icon: "pinDot" },
  ],
  /* The collector's day is money, not sales: the schedule the accountant
   * set, the payments they recorded, and a weekly route plan of their own. */
  collector: [
    { href: "/home", label: "Home", tkey: "nav.home", icon: "home" },
    { href: "/plan", label: "Plan", tkey: "nav.plan", icon: "cal" },
    { href: "/collections", label: "Collections", tkey: "coll.title", icon: "card" },
    { href: "/orders", label: "Payments", tkey: "orders.payments", icon: "receipt" },
  ],
  accountant: [
    { href: "/acct", label: "Money", tkey: "nav.money", icon: "chart" },
    { href: "/acct/queue", label: "Queue", tkey: "nav.queue", icon: "orders" },
    { href: "/stock", label: "Stock", tkey: "nav.stock", icon: "warehouse" },
    { href: "/acct/monthend", label: "Month-end", tkey: "nav.monthEnd", icon: "cal" },
        { href: "/acct/payroll", label: "Pay people", tkey: "nav.payPeople", icon: "users" },
  ],
  admin: [
    { href: "/admin", label: "Today", tkey: "nav.today", icon: "home" },
    { href: "/admin/map", label: "Map", tkey: "nav.map", icon: "pin" },
    { href: "/admin/report", label: "Report", tkey: "nav.report", icon: "chart" },
    { href: "/admin/manage", label: "Manage", tkey: "nav.manage", icon: "users" },
  ],
};

// Everything the desktop sidebar lists, grouped. Bottom-bar items are a subset.
const SIDEBAR: Record<string, { group: string; gkey?: string; items: { href: string; label: string; tkey?: string; icon: keyof typeof paths }[] }[]> = {
  admin: [
    { group: "Overview", gkey: "group.overview", items: [
      { href: "/admin", label: "Today", tkey: "nav.today", icon: "home" },
      { href: "/summary", label: "Day summary", tkey: "nav.daySummary", icon: "cal" },
      { href: "/admin/report", label: "Monthly report", tkey: "nav.monthlyReport", icon: "chart" },
      { href: "/admin/map", label: "Live map", tkey: "nav.liveMap", icon: "pin" },
    ]},
    { group: "Field", gkey: "group.field", items: [
      { href: "/approvals", label: "Approvals", tkey: "nav.approvals", icon: "check" },
      { href: "/doctors", label: DOCTORS_LABEL, icon: "pinDot" },
      { href: "/competitors", label: "Market intel", tkey: "nav.marketIntel", icon: "warn" },
      { href: "/tasks", label: "Tasks", tkey: "nav.tasks", icon: "check" },
      { href: "/performance", label: "Performance", tkey: "nav.performance", icon: "chart" },
    ]},
    { group: "Money & stock", gkey: "group.moneyStock", items: [
      { href: "/acct", label: "Money", tkey: "nav.money", icon: "receipt" },
      { href: "/acct/queue", label: "Invoice queue", tkey: "nav.invoiceQueue", icon: "orders" },
      { href: "/acct/collections", label: "Money in", tkey: "nav.moneyIn", icon: "card" },
      { href: "/stock", label: "Stock", tkey: "nav.stock", icon: "warehouse" },
      { href: "/spendings", label: "Spendings", tkey: "nav.spendings", icon: "card" },
      { href: "/acct/monthend", label: "Month-end", tkey: "nav.monthEnd", icon: "cal" },
        { href: "/acct/payroll", label: "Pay people", tkey: "nav.payPeople", icon: "users" },
      { href: "/docs", label: "Documents", tkey: "nav.documents", icon: "file" },
    ]},
    { group: "Setup", gkey: "group.setup", items: [
      { href: "/catalog", label: "Products", tkey: "nav.products", icon: "bag" },
      { href: "/admin/manage", label: "Users & products", tkey: "nav.usersProducts", icon: "users" },
      { href: "/admin/settings", label: "Control panel", tkey: "nav.controlPanel", icon: "target" },
    ]},
  ],
  // A supervisor spends the morning in the field on their phone and the
  // afternoon at a desk planning the week, so they get both layouts.
  supervisor: [
    { group: "Team", gkey: "group.team", items: [
      { href: "/home", label: "Today", tkey: "nav.today", icon: "home" },
      { href: "/team", label: "Team", tkey: "nav.team", icon: "users" },
      { href: "/summary", label: "Day summary", tkey: "nav.daySummary", icon: "cal" },
      { href: "/map", label: "Live map", tkey: "nav.liveMap", icon: "pin" },
      { href: "/performance", label: "Performance", tkey: "nav.performance", icon: "chart" },
    ]},
    { group: "Field", gkey: "group.field", items: [
      { href: "/approvals", label: "Approvals", tkey: "nav.approvals", icon: "check" },
      { href: "/doctors", label: DOCTORS_LABEL, icon: "pinDot" },
      { href: "/plan", label: "Weekly plan", tkey: "nav.plan", icon: "cal" },
      { href: "/tasks", label: "Tasks", tkey: "nav.tasks", icon: "check" },
      { href: "/competitors", label: "Market intel", tkey: "nav.marketIntel", icon: "warn" },
      { href: "/leave", label: "Leave", tkey: "nav.leave", icon: "cal" },
    ]},
    { group: "Money & stock", gkey: "group.moneyStock", items: [
      { href: "/stock", label: "Stock", tkey: "nav.stock", icon: "warehouse" },
      { href: "/spendings", label: "Spendings", tkey: "nav.spendings", icon: "card" },
      { href: "/targets", label: "Targets", tkey: "nav.targets", icon: "target" },
    ]},
    { group: "Reference", gkey: "group.reference", items: [
      { href: "/catalog", label: "Products", tkey: "nav.products", icon: "bag" },
    ]},
  ],
  accountant: [
    { group: "Money", gkey: "group.money", items: [
      { href: "/acct", label: "Dashboard", tkey: "nav.dashboard", icon: "chart" },
      { href: "/acct/queue", label: "Invoice queue", tkey: "nav.invoiceQueue", icon: "orders" },
      { href: "/acct/collections", label: "Money in", tkey: "nav.moneyIn", icon: "card" },
      { href: "/acct/monthend", label: "Month-end", tkey: "nav.monthEnd", icon: "cal" },
        { href: "/acct/payroll", label: "Pay people", tkey: "nav.payPeople", icon: "users" },
      { href: "/spendings", label: "Spendings", tkey: "nav.spendings", icon: "receipt" },
      { href: "/docs", label: "Documents", tkey: "nav.documents", icon: "file" },
    ]},
    { group: "Stock", gkey: "group.stock", items: [
      { href: "/stock", label: "Stock & checks", tkey: "nav.stockChecks", icon: "warehouse" },
    ]},
    { group: "Reference", gkey: "group.reference", items: [
      { href: "/doctors", label: DOCTORS_LABEL, icon: "pinDot" },
      { href: "/catalog", label: "Products", tkey: "nav.products", icon: "bag" },
      { href: "/tasks", label: "Tasks", tkey: "nav.tasks", icon: "check" },
    ]},
  ],
};


// Desktop sidebar for the roles that also work from a PC (owner, supervisor,
// accountant). Reps are phone-only by design — they are never at a desk.
export function DeskSidebar({ me, company }: { me: Me; company?: string }) {
  const pathname = usePathname();
  const brand = useBrand();
  const t = useTerms();
  const groups = SIDEBAR[me.role] ?? [];
  return (
    <aside className="desksidebar no-print">
      <div className="brand">
        {brand.hasLogo ? (
          <img src="/api/logo" alt={brand.companyName ?? "Logo"}
            style={{ maxWidth: "100%", maxHeight: 40, objectFit: "contain", display: "block" }} />
        ) : (
          company ?? brand.companyName ?? "Field Tracker"
        )}
      </div>
      {groups.map((g) => (
        <div key={g.group} className="sidegroup">
          <div className="sidegroup-title">{(g as any).gkey ? tr((g as any).gkey, g.group) : g.group}</div>
          {g.items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link key={it.href} href={it.href} className={active ? "active" : ""}>
                <Icon d={paths[it.icon]} size={15} />
                <span>{it.label === DOCTORS_LABEL ? term(t, "doctorPlural", "nav.doctors") : (it as any).tkey ? tr((it as any).tkey, it.label) : it.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
      <div className="sidefoot">{me.name}</div>
    </aside>
  );
}

export function BottomNav({ me, unread }: { me: Me; unread?: number }) {
  const pathname = usePathname();
  const t = useTerms();
  const items = NAV[me.role] ?? NAV.rep;
  const left = items.slice(0, 2);
  const right = items.slice(2);
  const link = (it: { href: string; label: string; tkey?: string; icon: keyof typeof paths }) => {
    const active = pathname === it.href || (it.href !== "/home" && it.href !== "/acct" && it.href !== "/admin" && pathname.startsWith(it.href));
    return (
      <Link key={it.href} href={it.href} className={active ? "active" : ""}>
        <Icon d={paths[it.icon]} size={22} />
        <span>{it.label === DOCTORS_LABEL ? term(t, "doctorPlural", "nav.doctors") : it.tkey ? tr(it.tkey, it.label) : it.label}</span>
      </Link>
    );
  };
  return (
    <nav className="bottomnav no-print">
      {left.map(link)}
      <Link href="/chat" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none" }}>
        <span className="chat-blob">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" /></svg>
          {unread ? <span className="chat-badge">{unread}</span> : null}
        </span>
        <span style={{ fontSize: 12, color: "var(--c-violet-deep)", fontWeight: 600 }}>{tr("nav.chat", "Chat")}</span>
      </Link>
      {right.map(link)}
    </nav>
  );
}

// Register the service worker once (PWA + push-ready).
function useServiceWorker() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
}

async function enablePush(): Promise<string> {
  try {
    const { publicKey } = await api<{ publicKey: string | null }>("/api/push");
    if (!publicKey) return "Phone notifications switch on once the app is hosted online — coming with deployment.";
    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "Notifications were blocked — allow them in your browser settings.";
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
    await api("/api/push", { json: { sub: sub.toJSON() } });
    return "Phone notifications are ON for this device.";
  } catch {
    return "Couldn't enable notifications on this device.";
  }
}

function useAlerts() {
  const [data, setData] = useState<{ notifications: any[]; unread: number; announcements: any[] }>({ notifications: [], unread: 0, announcements: [] });
  useEffect(() => {
    let alive = true;
    const load = () => api("/api/notify").then((r: any) => alive && setData(r)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return [data, setData] as const;
}

export function AlertsBar() {
  const tx = useT();
  const [data, setData] = useAlerts();
  const [open, setOpen] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  useServiceWorker();

  async function openBell() {
    setOpen((o) => !o);
    if (!open && data.unread > 0) {
      await api("/api/notify", { json: { action: "readAll" } }).catch(() => {});
      setData((d) => ({ ...d, unread: 0, notifications: d.notifications.map((n: any) => ({ ...n, read: true })) }));
    }
  }

  return (
    <div className="alerts-row" style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
      <button
        onClick={openBell}
        aria-label={tx("shell.notificationsPh", "Notifications")}
        style={{ position: "relative", zIndex: 30, background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 999, width: 44, height: 44, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "var(--elev-1)" }}
      >
        <Icon d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0" size={20} />
        {data.unread > 0 ? (
          <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 999, background: "var(--c-coral)", color: "#fff", fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 3px" }}>{data.unread}</span>
        ) : null}
      </button>
      </div>
      {open ? (
        <div style={{ position: "absolute", right: 0, top: 50, zIndex: 40, width: 290, maxHeight: 320, overflowY: "auto", background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 8, paddingBottom: 4 }}>
            <span className="small muted">{tr("common.language", "Language")}</span>
            <LangToggle compact />
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px" }}
            onClick={async () => setPushMsg(await enablePush())}>
            🔔 Enable phone notifications
          </button>
          {/* The manual lives behind the same button as the language switch and
              notifications — the three things people go looking for and cannot
              otherwise find. */}
          <Link href="/help" onClick={() => setOpen(false)}
            className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px", textDecoration: "none", justifyContent: "center" }}>
            {tr("help.open", "How to use the app")}
          </Link>
          {pushMsg ? <div className="small" style={{ padding: "2px 4px", color: "var(--color-neutral-600)" }}>{pushMsg}</div> : null}
          {data.notifications.length === 0 ? <div className="small muted" style={{ padding: 8 }}>{tx("shell.nothingYet", "Nothing yet.")}</div> : null}
          {data.notifications.map((n: any) => (
            <a key={n.id} href={n.href ?? "#"} style={{ textDecoration: "none", color: "inherit", padding: "7px 8px", borderRadius: 10, background: n.read ? "transparent" : "var(--color-accent-100)" }}>
              <div className="fs-caption">{n.body}</div>
              <div className="small muted fs-caption">{n.ts.slice(0, 10).split("-").reverse().join("-")} {n.ts.slice(11, 16)}</div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Permanent announcement ticker — loops all active announcements as a moving tape.
export function Ticker() {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => api("/api/notify").then((r: any) => alive && setItems(r.announcements.map((a: any) => a.body))).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!items.length) return null;
  const tape = items.join("   •   ");
  const secs = Math.max(12, Math.round(tape.length / 3));
  return (
    <div className="ticker">
      <Icon d={paths.warn} size={17} stroke="var(--c-amber-deep)" />
      <div className="tape" style={{ ["--tape-secs" as any]: `${secs}s` }}>
        <span>{tape}   •   {tape}</span>
      </div>
    </div>
  );
}

export function Screen({ me, children, nav = true, alerts = true, wide = true }: { me?: Me; children: React.ReactNode; nav?: boolean; alerts?: boolean; wide?: boolean }) {
  /* Desktop is the DEFAULT for anyone whose role has a sidebar; phones are
   * unaffected because the wide layout only engages at 900px and above.
   *
   * It used to be opt-in per screen, which produced exactly the bug the owner
   * reported: every screen that forgot the flag — documents, spendings,
   * collections, doctors, tasks — rendered as a phone column in the middle of
   * a PC monitor. A default cannot be forgotten. Reps never get the wide
   * shell: they have no sidebar, so the guard below keeps them in the app
   * layout everywhere.
   */
  const hasSidebar = !!me && !!SIDEBAR[me.role];
  wide = wide && hasSidebar;
  return (
    <div className={wide ? "admin-screen" : "screen"}>
      {alerts && me ? <Ticker /> : null}
      <div className={wide ? "wide-body" : undefined}>
        {wide && me ? <DeskSidebar me={me} /> : null}
        <div className="screen-pad">
          {alerts && me ? <AlertsBar /> : null}
          {me ? <OutboxBar /> : null}
          {children}
        </div>
      </div>
      {nav && me ? <BottomNav me={me} /> : null}
      {wide && me ? <ChatDock /> : null}
      <LightboxHost />
    </div>
  );
}

/* Re-fetch when the app comes back to the foreground. An installed PWA is
 * frozen, not closed: reopening it showed whatever was on screen when it was
 * last used — which is why the collections list looked like it was lagging.
 * Any screen whose data changes behind the user's back should call this. */
export function useRefresh(fn: () => void) {
  useEffect(() => {
    const on = () => { if (document.visibilityState === "visible") fn(); };
    document.addEventListener("visibilitychange", on);
    window.addEventListener("focus", on);
    return () => { document.removeEventListener("visibilitychange", on); window.removeEventListener("focus", on); };
  }, [fn]);
}

export function PageHead({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="row">
      {back ? (
        <button className="btn btn-secondary btn-icon" style={{ }} onClick={() => (back === "back" ? router.back() : router.push(back))}>
          <Icon d={paths.back} size={17} />
        </button>
      ) : null}
      <h4 className="m0 f1">{title}</h4>
      {right}
    </div>
  );
}

export function Meter({ pct, min, gray }: { pct: number; min?: number; gray?: boolean }) {
  return (
    <div className="meter">
      <div className="fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: gray ? "var(--color-neutral-500)" : undefined }} />
      {min !== undefined ? <div className="minmark" style={{ left: `${Math.min(100, min)}%` }} /> : null}
    </div>
  );
}

export function Pips({ done, total }: { done: number; total: number }) {
  return (
    <div className="pips">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < done ? "on" : ""} />
      ))}
    </div>
  );
}

export function Spinner() {
  const tx = useT();
  return (
    <div className="screen" style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
      <div className="muted" style={{ padding: 40, textAlign: "center" }}>{tx("shell.loading", "Loading…")}</div>
    </div>
  );
}

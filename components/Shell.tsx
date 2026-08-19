"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, paths } from "./Icons";
import { api } from "@/lib/fmt";
import { ChatDock } from "./ChatDock";

export interface Me {
  id: number;
  name: string;
  role: "admin" | "supervisor" | "rep" | "accountant";
  city: string;
  phone: string;
  dailyMin: number;
}

export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const router = useRouter();
  useEffect(() => {
    api<{ user: Me | null }>("/api/auth/me")
      .then((r) => {
        setMe(r.user);
        if (!r.user) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return me;
}

const NAV: Record<string, { href: string; label: string; icon: keyof typeof paths }[]> = {
  rep: [
    { href: "/home", label: "Home", icon: "home" },
    { href: "/plan", label: "Plan", icon: "cal" },
    { href: "/orders", label: "Orders", icon: "orders" },
    { href: "/progress", label: "Progress", icon: "chart" },
  ],
  supervisor: [
    { href: "/home", label: "Home", icon: "home" },
    { href: "/team", label: "Team", icon: "users" },
    { href: "/approvals", label: "Approvals", icon: "check" },
    { href: "/doctors", label: "Doctors", icon: "pinDot" },
  ],
  accountant: [
    { href: "/acct", label: "Money", icon: "chart" },
    { href: "/acct/queue", label: "Queue", icon: "orders" },
    { href: "/stock", label: "Stock", icon: "warehouse" },
    { href: "/acct/payroll", label: "Payroll", icon: "users" },
  ],
  admin: [
    { href: "/admin", label: "Today", icon: "home" },
    { href: "/admin/map", label: "Map", icon: "pin" },
    { href: "/admin/report", label: "Report", icon: "chart" },
    { href: "/admin/manage", label: "Manage", icon: "users" },
  ],
};

// Everything the desktop sidebar lists, grouped. Bottom-bar items are a subset.
const SIDEBAR: Record<string, { group: string; items: { href: string; label: string; icon: keyof typeof paths }[] }[]> = {
  admin: [
    { group: "Overview", items: [
      { href: "/admin", label: "Today", icon: "home" },
      { href: "/summary", label: "Day summary", icon: "cal" },
      { href: "/admin/report", label: "Monthly report", icon: "chart" },
      { href: "/admin/map", label: "Live map", icon: "pin" },
    ]},
    { group: "Field", items: [
      { href: "/approvals", label: "Approvals", icon: "check" },
      { href: "/doctors", label: "Doctors", icon: "pinDot" },
      { href: "/competitors", label: "Market intel", icon: "warn" },
      { href: "/tasks", label: "Tasks", icon: "check" },
      { href: "/performance", label: "Performance", icon: "chart" },
    ]},
    { group: "Money & stock", items: [
      { href: "/acct", label: "Money", icon: "receipt" },
      { href: "/acct/queue", label: "Invoice queue", icon: "orders" },
      { href: "/stock", label: "Stock", icon: "warehouse" },
      { href: "/spendings", label: "Spendings", icon: "card" },
      { href: "/acct/payroll", label: "Payroll", icon: "users" },
      { href: "/acct/payouts", label: "Payouts", icon: "card" },
    ]},
    { group: "Setup", items: [
      { href: "/catalog", label: "Products", icon: "bag" },
      { href: "/admin/manage", label: "Users & products", icon: "users" },
      { href: "/admin/settings", label: "Control panel", icon: "target" },
    ]},
  ],
  accountant: [
    { group: "Money", items: [
      { href: "/acct", label: "Dashboard", icon: "chart" },
      { href: "/acct/queue", label: "Invoice queue", icon: "orders" },
      { href: "/acct/payroll", label: "Payroll", icon: "users" },
      { href: "/acct/payouts", label: "Payouts", icon: "card" },
      { href: "/spendings", label: "Spendings", icon: "receipt" },
    ]},
    { group: "Stock", items: [
      { href: "/stock", label: "Stock & checks", icon: "warehouse" },
    ]},
    { group: "Reference", items: [
      { href: "/doctors", label: "Doctors", icon: "pinDot" },
      { href: "/catalog", label: "Products", icon: "bag" },
      { href: "/tasks", label: "Tasks", icon: "check" },
    ]},
  ],
};


// Desktop sidebar for the roles that also work from a PC (owner + accountant).
export function DeskSidebar({ me, company }: { me: Me; company?: string }) {
  const pathname = usePathname();
  const groups = SIDEBAR[me.role] ?? [];
  return (
    <aside className="desksidebar no-print">
      <div className="brand">{company ?? "Pluto Field Tracker"}</div>
      {groups.map((g) => (
        <div key={g.group} className="sidegroup">
          <div className="sidegroup-title">{g.group}</div>
          {g.items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link key={it.href} href={it.href} className={active ? "active" : ""}>
                <Icon d={paths[it.icon]} size={15} />
                <span>{it.label}</span>
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
  const items = NAV[me.role] ?? NAV.rep;
  const left = items.slice(0, 2);
  const right = items.slice(2);
  const link = (it: { href: string; label: string; icon: keyof typeof paths }) => {
    const active = pathname === it.href || (it.href !== "/home" && it.href !== "/acct" && it.href !== "/admin" && pathname.startsWith(it.href));
    return (
      <Link key={it.href} href={it.href} className={active ? "active" : ""}>
        <Icon d={paths[it.icon]} size={19} />
        <span>{it.label}</span>
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
        <span style={{ fontSize: 10, color: "var(--c-violet-deep)", fontWeight: 600 }}>Chat</span>
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
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
      <button
        onClick={openBell}
        aria-label="Notifications"
        style={{ position: "relative", zIndex: 30, background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", borderRadius: 999, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}
      >
        <Icon d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0" size={15} />
        {data.unread > 0 ? (
          <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 999, background: "var(--c-coral)", color: "#fff", fontSize: 9, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 3px" }}>{data.unread}</span>
        ) : null}
      </button>
      </div>
      {open ? (
        <div style={{ position: "absolute", right: 0, top: 38, zIndex: 40, width: 290, maxHeight: 320, overflowY: "auto", background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px" }}
            onClick={async () => setPushMsg(await enablePush())}>
            🔔 Enable phone notifications
          </button>
          {pushMsg ? <div className="small" style={{ padding: "2px 4px", color: "var(--color-neutral-600)" }}>{pushMsg}</div> : null}
          {data.notifications.length === 0 ? <div className="small muted" style={{ padding: 8 }}>Nothing yet.</div> : null}
          {data.notifications.map((n: any) => (
            <a key={n.id} href={n.href ?? "#"} style={{ textDecoration: "none", color: "inherit", padding: "7px 8px", borderRadius: 10, background: n.read ? "transparent" : "var(--color-accent-100)" }}>
              <div style={{ fontSize: 12 }}>{n.body}</div>
              <div className="small muted" style={{ fontSize: 10 }}>{n.ts.slice(0, 10).split("-").reverse().join("-")} {n.ts.slice(11, 16)}</div>
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
      <Icon d={paths.warn} size={14} stroke="var(--c-amber-deep)" />
      <div className="tape" style={{ ["--tape-secs" as any]: `${secs}s` }}>
        <span>{tape}   •   {tape}</span>
      </div>
    </div>
  );
}

export function Screen({ me, children, nav = true, alerts = true, wide = false }: { me?: Me; children: React.ReactNode; nav?: boolean; alerts?: boolean; wide?: boolean }) {
  // wide = full desktop layout, but only for the roles that actually have a
  // sidebar. Reps and supervisors keep the phone shell so they never lose the
  // bottom bar on a page they share with management (products, stock, summary).
  const hasSidebar = !!me && !!SIDEBAR[me.role];
  wide = wide && hasSidebar;
  return (
    <div className={wide ? "admin-screen" : "screen"}>
      {alerts && me ? <Ticker /> : null}
      <div className={wide ? "wide-body" : undefined}>
        {wide && me ? <DeskSidebar me={me} /> : null}
        <div className="screen-pad">
          {alerts && me ? <AlertsBar /> : null}
          {children}
        </div>
      </div>
      {nav && me ? <BottomNav me={me} /> : null}
      {wide && me ? <ChatDock /> : null}
    </div>
  );
}

export function PageHead({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="row">
      {back ? (
        <button className="btn btn-secondary btn-icon" style={{ width: 30, height: 30 }} onClick={() => (back === "back" ? router.back() : router.push(back))}>
          <Icon d={paths.back} size={14} />
        </button>
      ) : null}
      <h4 style={{ margin: 0, flex: 1 }}>{title}</h4>
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
  return (
    <div className="screen" style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
      <div className="muted" style={{ padding: 40, textAlign: "center" }}>Loading…</div>
    </div>
  );
}

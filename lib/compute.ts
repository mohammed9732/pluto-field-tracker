import { DB, Order, Product, User } from "./types";

// Tier price: base unitPrice, overridden by the best tier the quantity reaches.
export function priceForQty(product: Product, qty: number): number {
  let price = product.unitPrice;
  for (const t of product.tiers ?? []) {
    if (qty >= t.minQty && t.price < price) price = t.price;
  }
  return price;
}

// Daily salary rate — 26 workdays/month (Sat–Thu).
export function dailyRate(baseSalary: number): number {
  return Math.round(baseSalary / 26);
}

export function notify(db: DB, seq: () => number, userId: number, body: string, href: string | null) {
  db.notifications.push({ id: seq(), userId, body, href, ts: nowIso(), read: false });
  // Phone push (no-op until VAPID keys exist, i.e. after deployment).
  import("./push").then((m) => m.pushToUser(db, userId, db.settings.companyName, body, href)).catch(() => {});
}

export function logActivity(db: DB, seq: () => number, userId: number, action: string) {
  db.activity.push({ id: seq(), userId, action, ts: nowIso() });
  if (db.activity.length > 2000) db.activity.splice(0, db.activity.length - 2000);
}

export const APP_TZ_NOW = () => new Date();

export function todayStr(): string {
  return localDateStr(new Date());
}
export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function nowIso(): string {
  const d = new Date();
  return `${localDateStr(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
export function periodOf(dateIso: string): string {
  return dateIso.slice(0, 7); // YYYY-MM
}
export function currentPeriod(): string {
  return todayStr().slice(0, 7);
}
export function quarterOf(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
}
export function periodsInQuarter(quarter: string): string[] {
  const [y, q] = quarter.split("-Q");
  const start = (Number(q) - 1) * 3 + 1;
  return [0, 1, 2].map((i) => `${y}-${String(start + i).padStart(2, "0")}`);
}
export function currentQuarter(): string {
  return quarterOf(currentPeriod());
}

export function orderTotal(o: Order): number {
  return o.items.reduce((s, it) => s + it.qty * it.price, 0);
}

// City helpers — cities are admin-managed, so never hard-code them.
export function cityName(db: DB, id: string | null | undefined): string {
  if (!id) return "";
  if (id === "all") return "All cities";
  if (id === "main") return "Main";
  return db.settings.cities.find((c) => c.id === id)?.name ?? id;
}
export function cityIds(db: DB): string[] {
  return db.settings.cities.map((c) => c.id);
}
// The first city is head office: its stock lives in the main warehouse, so it
// never gets a separate column. Every other city holds its own stock.
export function hqCityId(db: DB): string {
  return db.settings.cities[0]?.id ?? "";
}
export function stockCityIds(db: DB): string[] {
  return cityIds(db).filter((id) => id !== hqCityId(db));
}
// Doctors a user may work with: reps are scoped to their own city.
export function doctorsFor(db: DB, user: { role: string; city: string }) {
  if (user.role === "rep" && user.city && user.city !== "all") {
    return db.doctors.filter((d) => d.city === user.city);
  }
  return db.doctors;
}

// Achieved qty/value for user+product in a month, counting approved + invoiced.
export function achieved(db: DB, userId: number, productId: number, period: string) {
  let qty = 0;
  let value = 0;
  for (const o of db.orders) {
    if (o.createdBy !== userId) continue;
    if (o.isSample) continue; // free samples earn no target credit
    if (o.status !== "approved" && o.status !== "invoiced") continue;
    if (periodOf(o.createdAt) !== period) continue;
    for (const it of o.items) {
      if (it.productId !== productId) continue;
      qty += it.qty;
      value += it.qty * it.price;
    }
  }
  return { qty, value };
}

export interface AccrualRow {
  productId: number;
  productName: string;
  targetQty: number;
  minPct: number;
  incentivePct: number;
  achievedQty: number;
  achievedValue: number;
  achievementPct: number; // 0-100
  qualified: boolean;
  incentiveAmount: number;
}

export function monthlyAccrual(db: DB, userId: number, period: string): AccrualRow[] {
  const rows: AccrualRow[] = [];
  for (const t of db.targets.filter((t) => t.userId === userId && t.period === period)) {
    const product = db.products.find((p) => p.id === t.productId);
    if (!product) continue;
    const a = achieved(db, userId, t.productId, period);
    const pct = t.targetQty > 0 ? (a.qty / t.targetQty) * 100 : 0;
    const qualified = pct >= t.minPct;
    rows.push({
      productId: t.productId,
      productName: product.name,
      targetQty: t.targetQty,
      minPct: t.minPct,
      incentivePct: t.incentivePct,
      achievedQty: a.qty,
      achievedValue: a.value,
      achievementPct: pct,
      qualified,
      incentiveAmount: qualified ? a.value * (t.incentivePct / 100) : 0,
    });
  }
  return rows;
}

export function monthlyIncentiveTotal(db: DB, userId: number, period: string): number {
  return monthlyAccrual(db, userId, period).reduce((s, r) => s + r.incentiveAmount, 0);
}

// Achieved sales value this month (approved + invoiced orders by this user).
export function monthlySalesValue(db: DB, userId: number, period: string): number {
  return db.orders
    .filter((o) => o.createdBy === userId && !o.isSample && (o.status === "approved" || o.status === "invoiced") && periodOf(o.createdAt) === period)
    .reduce((s, o) => s + orderTotal(o), 0);
}

// Flat % of achieved monthly sales — accrues monthly, paid with the quarterly payout.
export function salesCommission(db: DB, userId: number, period: string): number {
  const u = db.users.find((x) => x.id === userId);
  if (!u || u.role !== "rep") return 0;
  return Math.round(monthlySalesValue(db, userId, period) * (db.settings.salesCommissionPct / 100));
}

// Flat % of payments collected — paid monthly in payroll.
export function collectionCommission(db: DB, userId: number, period: string): number {
  const u = db.users.find((x) => x.id === userId);
  if (!u || u.role !== "rep") return 0;
  const collected = db.payments.filter((p) => p.collectedBy === userId && periodOf(p.ts) === period).reduce((s, p) => s + p.amount, 0);
  return Math.round(collected * (db.settings.collectionCommissionPct / 100));
}

// Free sample boxes handed out in a month — reported, never counted as sales.
export function samplesGiven(db: DB, userId: number, period: string): number {
  return db.orders
    .filter((o) => o.createdBy === userId && o.isSample && o.status !== "rejected" && periodOf(o.createdAt) === period)
    .reduce((s, o) => s + o.items.reduce((x, it) => x + it.qty, 0), 0);
}

export function quarterAccrual(db: DB, userId: number, quarter: string) {
  const months = periodsInQuarter(quarter).map((period) => ({
    period,
    amount: monthlyIncentiveTotal(db, userId, period),
    commission: salesCommission(db, userId, period),
  }));
  return {
    months,
    incentives: months.reduce((s, m) => s + m.amount, 0),
    commission: months.reduce((s, m) => s + m.commission, 0),
    total: months.reduce((s, m) => s + m.amount + m.commission, 0),
  };
}

// Field time today from checkins: pair ins with outs; open session counts to now.
export function fieldTimeMinutes(db: DB, userId: number, date: string): { minutes: number; checkedIn: boolean; inSince: string | null } {
  const events = db.checkins
    .filter((c) => c.userId === userId && c.ts.startsWith(date))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  let minutes = 0;
  let openIn: string | null = null;
  for (const e of events) {
    if (e.type === "in") openIn = e.ts;
    else if (e.type === "out" && openIn) {
      minutes += (new Date(e.ts).getTime() - new Date(openIn).getTime()) / 60000;
      openIn = null;
    }
  }
  if (openIn && date === todayStr()) {
    minutes += (Date.now() - new Date(openIn).getTime()) / 60000;
  }
  return { minutes: Math.max(0, Math.round(minutes)), checkedIn: !!openIn, inSince: openIn };
}

export function visitsOn(db: DB, userId: number, date: string) {
  return db.visits.filter((v) => v.userId === userId && v.date === date).sort((a, b) => a.time.localeCompare(b.time));
}

export function onApprovedLeave(db: DB, userId: number, date: string): boolean {
  return db.leaves.some((l) => l.userId === userId && l.status === "approved" && l.start <= date && date >= l.start && date <= l.end);
}

// Work days (Sat-Thu) in a month, minus approved leave days for the user.
export function workDaysInMonth(period: string): string[] {
  const [y, m] = period.split("-").map(Number);
  const days: string[] = [];
  const last = new Date(y, m, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, m - 1, d);
    if (dt.getDay() !== 5) days.push(localDateStr(dt)); // 5 = Friday
  }
  return days;
}

export function weekStartOf(date: string): string {
  // Week starts Saturday.
  const d = new Date(date + "T12:00:00");
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (dow + 1) % 7; // days since Saturday
  d.setDate(d.getDate() - diff);
  return localDateStr(d);
}

export function weekDates(weekStart: string): string[] {
  const out: string[] = [];
  const d = new Date(weekStart + "T12:00:00");
  for (let i = 0; i < 6; i++) {
    out.push(localDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return out; // Sat..Thu
}

export function publicUser(u: User, includeSalary = false) {
  const { password, ...rest } = u;
  if (!includeSalary) {
    const { baseSalary, ...noSalary } = rest;
    return noSalary;
  }
  return rest;
}

// Who may download a given upload. Every file — receipt photos, invoice PDFs,
// visit photos, chat attachments — lives in one flat id namespace, so without
// this any signed-in person could fetch any id they came across.
export function canSeeFile(db: DB, user: { id: number; role: string; city: string }, fileId: string): boolean {
  if (!fileId) return false;

  // Management already sees this material through the screens they own.
  if (user.role === "admin" || user.role === "accountant" || user.role === "supervisor") return true;

  // Product photos, brochures and price lists are company-wide by design.
  if (db.products.some((p) => p.imageId === fileId || p.brochureId === fileId)) return true;
  if (db.brochures.some((b) => b.fileId === fileId)) return true;

  // You can always re-open something you uploaded yourself.
  if (db.files.some((f) => f.id === fileId && f.ownerId === user.id)) return true;

  // Chat attachments, but only in a channel this person belongs to.
  const msg = db.messages.find((m) => m.fileId === fileId);
  if (msg) {
    if (msg.channel.startsWith("dm-")) {
      const parts = msg.channel.split("-").slice(1).map(Number);
      if (parts.includes(user.id)) return true;
    } else if (msg.channel.startsWith("g-")) {
      const gid = Number(msg.channel.slice(2));
      if (db.chatGroups.some((g) => g.id === gid && g.memberIds.includes(user.id))) return true;
    }
    return false;
  }

  // Records inside this rep's own territory.
  const mine = new Set(doctorsFor(db, user).map((d) => d.id));
  if (db.visits.some((v) => v.photo === fileId && mine.has(v.doctorId))) return true;
  if (db.payments.some((p) => p.photo === fileId && mine.has(p.doctorId))) return true;

  return false;
}

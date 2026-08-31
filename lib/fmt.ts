import { getLang } from "./i18n";
// IQD: whole numbers, thousands separators — "65,000 IQD".
/* Figures stay in Western digits and Latin grouping in both languages —
 * that is what people here read on invoices — but the currency itself is a
 * word, and words get translated. */
function currency(): string {
  return getLang() === "ar" ? "د.ع" : "IQD";
}

export function money(n: number): string {
  return Math.round(n).toLocaleString("en-US") + " " + currency();
}
export function money0(n: number): string {
  return Math.round(n).toLocaleString("en-US") + " " + currency();
}
// DD-MM-YYYY per spec
export function dmy(dateIso: string): string {
  const d = dateIso.slice(0, 10).split("-");
  return `${d[2]}-${d[1]}-${d[0]}`;
}
export function dm(dateIso: string): string {
  const d = dateIso.slice(0, 10).split("-");
  return `${d[2]}-${d[1]}`;
}
export function hm(ts: string): string {
  return ts.slice(11, 16);
}
export function weekdayShort(dateIso: string): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(dateIso + "T12:00:00").getDay()];
}
export function durationHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} m` : `${m} m`;
}
export function monthName(period: string): string {
  const [y, m] = period.split("-").map(Number);
  // Follows the reader's language. Hard-coding en-US meant "August 2026" sat
  // in the middle of an otherwise Arabic month-end screen. ar-EG rather than
  // plain ar: it gives the Gregorian month names people here actually use
  // (أغسطس), not the Levantine ones (آب).
  const locale = getLang() === "ar" ? "ar-EG" : "en-US";
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: "long", year: "numeric" });
}
/* Why pages open instantly on the second visit.
 *
 * Every screen fetches its data from Railway, and from Iraq that round trip
 * is what made each page feel slow. GETs are cached in memory: a screen you
 * have already seen paints immediately from the cache while a background
 * fetch quietly updates it for the next visit. Any POST clears the whole
 * cache — after an action, everything reads fresh, so a stale list can
 * never swallow the order you just placed. Chat and the notification bell
 * are never cached: they are the two things that must always be live. */
const GET_CACHE = new Map<string, { ts: number; data: any }>();
const NEVER_CACHE = ["/api/messages", "/api/notify"];
const CACHE_MS = 5 * 60_000;

export async function api<T = any>(path: string, opts?: RequestInit & { json?: any }): Promise<T> {
  const init: RequestInit = { ...opts };
  if (opts?.json !== undefined) {
    init.method = init.method ?? "POST";
    init.headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    init.body = JSON.stringify(opts.json);
    GET_CACHE.clear();
    const res = await fetch(path, init);
    if (!res.ok) {
      let msg = "Request failed";
      try { msg = (await res.json()).error ?? msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }
  const cacheable = typeof window !== "undefined" && !NEVER_CACHE.some((p) => path.startsWith(p));
  const hit = cacheable ? GET_CACHE.get(path) : undefined;
  if (hit && Date.now() - hit.ts < CACHE_MS) {
    // Serve the cached copy NOW; refresh behind the scenes for next time.
    fetch(path).then(async (res) => {
      if (res.ok) GET_CACHE.set(path, { ts: Date.now(), data: await res.json() });
    }).catch(() => {});
    return hit.data as T;
  }
  const res = await fetch(path, init);
  if (!res.ok) {
    let msg = "Request failed";
    try { msg = (await res.json()).error ?? msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  if (cacheable) GET_CACHE.set(path, { ts: Date.now(), data });
  return data;
}

/* Money typed into a form.
 *
 * Amounts here run to eight digits — 12,500,000 IQD is an ordinary order — and
 * an unbroken run of digits is genuinely hard to check. These two keep the
 * separators in place as the person types.
 */
export function groupDigits(raw: string): string {
  const digits = String(raw).replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
}

export function ungroup(formatted: string): number {
  return Math.round(Number(String(formatted).replace(/,/g, "")) || 0);
}

// Today as YYYY-MM-DD, for date-input min/max bounds.
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

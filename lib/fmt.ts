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
export async function api<T = any>(path: string, opts?: RequestInit & { json?: any }): Promise<T> {
  const init: RequestInit = { ...opts };
  if (opts?.json !== undefined) {
    init.method = init.method ?? "POST";
    init.headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    init.body = JSON.stringify(opts.json);
  }
  const res = await fetch(path, init);
  if (!res.ok) {
    let msg = "Request failed";
    try { msg = (await res.json()).error ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
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

// IQD: whole numbers, thousands separators — "65,000 IQD".
export function money(n: number): string {
  return Math.round(n).toLocaleString("en-US") + " IQD";
}
export function money0(n: number): string {
  return Math.round(n).toLocaleString("en-US") + " IQD";
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
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
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

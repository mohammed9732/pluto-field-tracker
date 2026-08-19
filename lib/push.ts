import { DB } from "./types";

// Web push — activates automatically once VAPID keys exist in the environment
// (set on deployment; harmless no-op while running locally over http).
let configured = false;

async function webpush() {
  const mod = await import("web-push");
  const wp = (mod as any).default ?? mod;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return null;
  if (!configured) {
    wp.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:owner@pluto.app", pub, priv);
    configured = true;
  }
  return wp;
}

export function publicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

// Fire-and-forget: never blocks or fails the request that triggered it.
export function pushToUser(db: DB, userId: number, title: string, body: string, href: string | null) {
  const subs = db.pushSubs.filter((s) => s.userId === userId);
  if (!subs.length) return;
  webpush().then((wp) => {
    if (!wp) return;
    for (const s of subs) {
      wp.sendNotification(s.sub, JSON.stringify({ title, body, href })).catch(() => {});
    }
  }).catch(() => {});
}

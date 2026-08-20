"use client";
import { useSyncExternalStore } from "react";

/* Work that could not be sent yet.
 *
 * A rep in a clinic basement has no signal. Without this, tapping "Save visit"
 * throws an error and the visit is simply gone — they are standing in front of
 * the doctor with nothing recorded. Instead the request is kept on the phone and
 * sent the moment the signal comes back.
 *
 * Two rules make this safe:
 *
 * 1. Only deliberate, one-way actions are queued — logging a visit, raising an
 *    order, recording a payment. Never a read, never an approval. If the server
 *    would have refused it (a closed month, a doctor outside your city), it will
 *    still refuse when it finally arrives, and the item is dropped with the
 *    reason kept so the rep can see what happened.
 *
 * 2. Every entry carries a clientRef the server checks. If a send half-succeeded
 *    — reply lost on a dying connection — the retry returns the record that was
 *    already created instead of writing a second one. Nobody gets billed twice.
 */

export type OutboxEntry = {
  ref: string;
  path: string;
  body: any;
  label: string;   // what the rep sees: "Visit — Dr. Shirin Ahmed"
  at: string;
  error?: string;  // set when the server refused it outright
};

const KEY = "pluto-outbox";
const listeners = new Set<() => void>();
let cached: OutboxEntry[] | null = null;

function read(): OutboxEntry[] {
  if (cached) return cached;
  try {
    cached = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    cached = [];
  }
  return cached!;
}

function write(list: OutboxEntry[]) {
  cached = list;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  listeners.forEach((l) => l());
}

export function newRef(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function enqueue(path: string, body: any, label: string): OutboxEntry {
  const entry: OutboxEntry = {
    ref: body?.clientRef ?? newRef(),
    path, body, label, at: new Date().toISOString(),
  };
  write([...read(), entry]);
  return entry;
}

export function pending(): OutboxEntry[] {
  return read();
}

export function drop(ref: string) {
  write(read().filter((e) => e.ref !== ref));
}

// A network failure is a TypeError from fetch; anything with a status is the
// server talking to us, which is a different thing entirely.
export function isOffline(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return err instanceof TypeError;
}

let flushing = false;

export async function flush(): Promise<{ sent: number; failed: number }> {
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    // Oldest first, and stop at the first network failure so order is preserved
    // — an order should never arrive before the visit that produced it.
    for (const entry of [...read()]) {
      try {
        const res = await fetch(entry.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry.body),
        });
        if (res.ok) {
          drop(entry.ref);
          sent++;
          continue;
        }
        // The server answered and said no. Retrying will not help.
        let msg = "The office refused this";
        try { msg = (await res.json()).error ?? msg; } catch {}
        write(read().map((e) => (e.ref === entry.ref ? { ...e, error: msg } : e)));
        failed++;
      } catch {
        break; // still offline; leave the rest queued
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useOutbox(): OutboxEntry[] {
  return useSyncExternalStore(subscribe, read, () => []);
}

// Try again whenever the phone thinks it is back, and whenever the rep returns
// to the app — coming out of a lift is the common case and fires neither event
// reliably on its own.
export function startOutboxWatcher() {
  if (typeof window === "undefined") return;
  const go = () => { if (pending().length) flush(); };
  window.addEventListener("online", go);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) go(); });
  setInterval(go, 60_000);
  go();
}

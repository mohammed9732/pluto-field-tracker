"use client";
import { useSyncExternalStore } from "react";
import { Terms, DEFAULT_TERMS } from "./types";
import { tr } from "./i18n";

// A tiny store rather than a React context, so any component can ask for the
// company's wording without every page having to thread a provider through.
let current: Terms = DEFAULT_TERMS;
const listeners = new Set<() => void>();

export function setTerms(next: Partial<Terms> | undefined) {
  if (!next) return;
  const merged = { ...DEFAULT_TERMS, ...next };
  // Keep the same object when nothing changed, so useSyncExternalStore does not
  // re-render every screen on each poll.
  if (JSON.stringify(merged) === JSON.stringify(current)) return;
  current = merged;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const snapshot = () => current;

export function useTerms(): Terms {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_TERMS);
}

// Lower-case form for mid-sentence use ("pick a doctor").
export function lower(word: string): string {
  return word ? word.charAt(0).toLowerCase() + word.slice(1) : word;
}

/* The company's word for a thing, in the reader's language.
 *
 * Two systems meet here and the precedence matters:
 *   - the company HAS renamed it  -> their word, untouched, in both languages.
 *     It is usually a brand or legal term and translating it would be wrong.
 *   - the company has NOT renamed it -> the default word, translated.
 *
 * Without this an Arabic reader at a company using the defaults saw "Doctors"
 * in the middle of an otherwise Arabic screen.
 */
export function term(t: Terms, key: keyof Terms, i18nKey: string): string {
  return t[key] === DEFAULT_TERMS[key] ? tr(i18nKey, t[key]) : t[key];
}

export function roleLabel(t: Terms, role: string): string {
  return role === "admin" ? t.roleAdmin
    : role === "supervisor" ? t.roleSupervisor
    : role === "accountant" ? t.roleAccountant
    : role === "collector" ? (t.roleCollector ?? "Collector")
    : t.roleRep;
}


// The company's mark and name, filled by useMe on every screen.
export interface Brand { companyName?: string; hasLogo?: boolean }

let brand: Brand = {};
const brandListeners = new Set<() => void>();

export function setBrand(next: Brand) {
  if (next.companyName === brand.companyName && next.hasLogo === brand.hasLogo) return;
  brand = next;
  brandListeners.forEach((l) => l());
}

const EMPTY_BRAND: Brand = {};

export function useBrand(): Brand {
  return useSyncExternalStore(
    (cb) => { brandListeners.add(cb); return () => brandListeners.delete(cb); },
    () => brand,
    () => EMPTY_BRAND,
  );
}

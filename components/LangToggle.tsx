"use client";
import { useState } from "react";
import { api } from "@/lib/fmt";
import { rememberLang, useLang, useT } from "@/lib/i18n";

/* English / عربي.
 *
 * The switch applies instantly and is then saved, rather than saved and then
 * applied — a language toggle that waits on the network feels broken, and if
 * the save fails the worst case is it reverts on next sign-in.
 */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const tx = useT();
  const lang = useLang();
  const [busy, setBusy] = useState(false);

  async function choose(next: "en" | "ar") {
    if (next === lang) return;
    // Applied and remembered on the device first, so it works on the sign-in
    // screen where there is nobody to save it against yet. The server call is
    // best-effort: signed out it will fail, and that is fine.
    rememberLang(next);
    setBusy(true);
    try { await api("/api/lang", { json: { lang: next } }); }
    catch {}
    finally { setBusy(false); }
  }

  return (
    <div className="seg" style={{ opacity: busy ? 0.6 : 1 }} aria-label={tx("lang.languagePh", "Language")}>
      <label className="seg-opt">
        <input type="radio" name={`lang-${compact ? "c" : "f"}`} checked={lang === "en"}
          onChange={() => choose("en")} />
        <span>{compact ? "EN" : "English"}</span>
      </label>
      <label className="seg-opt">
        <input type="radio" name={`lang-${compact ? "c" : "f"}`} checked={lang === "ar"}
          onChange={() => choose("ar")} />
        <span dir="rtl">{compact ? "ع" : "العربية"}</span>
      </label>
    </div>
  );
}

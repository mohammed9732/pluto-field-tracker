"use client";
import { useEffect, useState } from "react";

/* Fullscreen image viewer that stays inside the app.
 *
 * The installed PWA has no browser chrome, so opening a receipt photo with
 * target="_blank" stranded people on a bare image with no back button — the
 * only way out was killing the app. This overlay opens on top of the page
 * instead: tap anywhere (or the ×) and you are back exactly where you were.
 */
export function openImage(url: string) {
  window.dispatchEvent(new CustomEvent("pluto:lightbox", { detail: url }));
}

export function LightboxHost() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setUrl((e as CustomEvent).detail as string);
    window.addEventListener("pluto:lightbox", on);
    return () => window.removeEventListener("pluto:lightbox", on);
  }, []);
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setUrl(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url]);
  if (!url) return null;
  return (
    <div onClick={() => setUrl(null)} style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "rgba(10,10,12,.93)",
      display: "grid", placeItems: "center", padding: 14,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" style={{ maxWidth: "100%", maxHeight: "88vh", borderRadius: 10, objectFit: "contain" }} />
      <button aria-label="Close" onClick={() => setUrl(null)} style={{
        position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", right: 14,
        width: 42, height: 42, borderRadius: 999, border: "none", cursor: "pointer",
        background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 24, lineHeight: 1,
      }}>×</button>
    </div>
  );
}

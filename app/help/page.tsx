"use client";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { manualFor } from "@/lib/manual";
import { useLang, useT } from "@/lib/i18n";
import { useState } from "react";

/* The manual.
 *
 * Filtered to the reader's role, because the commonest reason a manual goes
 * unread is that the first thing in it is somebody else's job. A rep opening
 * this sees their day, not the month-end close.
 */
export default function HelpPage() {
  const me = useMe();
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);

  if (!me) return <Spinner />;
  const sections = manualFor(me.role);

  return (
    <Screen me={me}>
      <PageHead title={t("help.title", "How to use the app")} back="back" />
      <div className="small muted">
        {t("help.intro", "Written for what you do. Tap a heading to open it.")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map((s) => {
          const isOpen = open === s.id;
          return (
            <div key={s.id} className="card" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                aria-expanded={isOpen}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "13px 14px", textAlign: "start", font: "inherit",
                  color: "var(--color-text)",
                }}
              >
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{s.title[lang]}</span>
                {/* Rotates rather than swapping glyphs, so it reads the same
                    way round in Arabic as in English. */}
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 12, color: "var(--color-neutral-500)",
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform .18s ease",
                  }}
                >
                  ▸
                </span>
              </button>
              {isOpen ? (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                  {s.body[lang].map((para, i) => (
                    <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--color-neutral-700)" }}>
                      {para}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="small muted" style={{ marginTop: 4 }}>
        {t("help.footer", "Something here out of date, or something missing? Tell the owner — it is part of the app, so it can be fixed.")}
      </div>
    </Screen>
  );
}

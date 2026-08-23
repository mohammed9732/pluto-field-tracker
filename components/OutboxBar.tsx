"use client";
import { useEffect, useState } from "react";
import { drop, flush, startOutboxWatcher, useOutbox } from "@/lib/outbox";

/* What is still sitting on this phone.
 *
 * Anything queued has to be visible. A rep who thinks a visit was saved, and a
 * supervisor who cannot see it, is worse than an error at the time.
 */
export function OutboxBar() {
  const items = useOutbox();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { startOutboxWatcher(); }, []);

  if (!items.length) return null;
  const refused = items.filter((i) => i.error);
  const waiting = items.filter((i) => !i.error);

  return (
    <div className={`outbox ${refused.length ? "outbox-bad" : ""}`}>
      <button className="outbox-head" onClick={() => setOpen((o) => !o)}>
        <span style={{ flex: 1, textAlign: "left" }}>
          {waiting.length > 0
            ? `${waiting.length} saved on your phone — waiting for signal`
            : `${refused.length} could not be sent`}
        </span>
        <span className="small">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 12px 10px" }}>
          {items.map((i) => (
            <div key={i.ref} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{i.label}</div>
                {i.error ? (
                  <div className="small" style={{ color: "var(--c-coral-deep)" }}>{i.error}</div>
                ) : (
                  <div className="small muted">Queued {new Date(i.at).toLocaleTimeString()}</div>
                )}
              </div>
              {i.error ? (
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => drop(i.ref)}>
                  Discard
                </button>
              ) : null}
            </div>
          ))}
          <button className="btn btn-secondary" style={{ fontSize: 12, alignSelf: "flex-start" }}
            disabled={busy}
            onClick={async () => { setBusy(true); await flush(); setBusy(false); }}>
            {busy ? "Trying…" : "Try sending now"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

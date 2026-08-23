"use client";
import { useEffect, useState } from "react";
import { api, dmy, hm } from "@/lib/fmt";

/* Who changed what, on one record.
 *
 * Collapsed by default: on a normal day nobody cares, but when a price looks
 * wrong or a doctor's class changed overnight, this is the first thing you want.
 */
export function RecordHistory({ entity, id }: { entity: string; id: number }) {
  const [entries, setEntries] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || entries) return;
    api(`/api/history?entity=${entity}&id=${id}`)
      .then((r: any) => setEntries(r.entries ?? []))
      .catch(() => setEntries([]));
  }, [open, entries, entity, id]);

  return (
    <details className="card gap-2" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, listStyle: "revert" }}>
        History
      </summary>
      {entries === null ? (
        <div className="small muted">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="small muted">Nothing has been changed since this was created.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {entries.map((h) => (
            <div key={h.id} className="listrow" style={{ padding: "8px 0", alignItems: "flex-start" }}>
              <div className="f1min">
                <div className="fs-small">
                  <b>{h.byName}</b> — {h.action}
                </div>
                {h.detail ? <div className="small muted">{h.detail}</div> : null}
              </div>
              <span className="small muted" style={{ whiteSpace: "nowrap" }}>
                {dmy(h.at)} {hm(h.at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

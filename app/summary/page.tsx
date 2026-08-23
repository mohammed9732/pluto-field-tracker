"use client";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, durationHM, money, money0, weekdayShort } from "@/lib/fmt";

// End-of-day picture for the owner and supervisor.
export default function DailySummary() {
  const me = useMe();
  const [date, setDate] = useState("");
  const [data, setData] = useState<any>(null);

  useEffect(() => { setDate(new Date().toISOString().slice(0, 10)); }, []);

  const load = useCallback(() => {
    if (!date) return;
    api(`/api/summary?date=${date}`).then(setData).catch(() => {});
  }, [date]);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const t = data.totals;

  return (
    <Screen me={me} wide>
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "0 0 2px" }}>Day summary</h4>
          <div className="small muted">{weekdayShort(data.date)} {dmy(data.date)}</div>
        </div>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
      </div>

      <div className="kpi-grid">
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">Visits</span>
          <span className="hnum" style={{ fontSize: 28 }}>{t.visits}<span style={{ fontSize: 15, color: "var(--color-neutral-500)" }}> / {t.target}</span></span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">Orders</span>
          <span className="hnum" style={{ fontSize: 28 }}>{money0(t.orderValue)}</span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">Collected</span>
          <span className="hnum" style={{ fontSize: 28 }}>{money0(t.collected)}</span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">Samples</span>
          <span className="hnum" style={{ fontSize: 28 }}>{t.samples}</span>
        </div>
      </div>

      {(t.notStarted.length || t.belowTarget.length || t.outOfLocation || data.pendingOrders || data.pendingInvoices) ? (
        <div className="card" style={{ gap: 5, borderColor: "var(--c-amber)" }}>
          <h6 style={{ margin: 0, color: "var(--c-amber-deep)" }}>Needs attention</h6>
          {t.notStarted.length ? <div className="small" style={{ color: "var(--c-coral-deep)" }}>Never started the day: {t.notStarted.join(", ")}</div> : null}
          {t.belowTarget.length ? <div className="small" style={{ color: "var(--c-amber-deep)" }}>Below visit target: {t.belowTarget.join(", ")}</div> : null}
          {t.outOfLocation ? <div className="small" style={{ color: "var(--c-coral-deep)" }}>{t.outOfLocation} out-of-location visit(s)</div> : null}
          {data.pendingOrders ? <div className="small">{data.pendingOrders} order(s) awaiting approval</div> : null}
          {data.pendingInvoices ? <div className="small">{data.pendingInvoices} approved order(s) awaiting invoicing</div> : null}
        </div>
      ) : (
        <div className="card" style={{ borderColor: "var(--c-green)" }}>
          <span className="small" style={{ color: "var(--c-green-deep)" }}>Nothing needs your attention today.</span>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ fontSize: 12, minWidth: 520 }}>
          <thead>
            <tr>
              <th>Person</th>
              <th style={{ textAlign: "right" }}>Visits</th>
              <th style={{ textAlign: "right" }}>Field time</th>
              <th style={{ textAlign: "right" }}>Orders</th>
              <th style={{ textAlign: "right" }}>Collected</th>
              <th style={{ textAlign: "right" }}>Samples</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r: any) => (
              <tr key={r.userId}>
                <td>
                  {r.name} <span className="muted">· {r.city}</span>
                  {r.onLeave ? <span className="tag tag-neutral" style={{ marginLeft: 6 }}>leave</span> : null}
                  {!r.onLeave && !r.started ? <span className="tag tag-hot" style={{ marginLeft: 6 }}>not started</span> : null}
                  {r.outOfLocation ? <span className="tag tag-hot" style={{ marginLeft: 6 }}>{r.outOfLocation} off-site</span> : null}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700, color: !r.onLeave && r.visits < r.target ? "var(--c-amber-deep)" : undefined }}>
                  {r.onLeave ? "—" : `${r.visits}/${r.target}`}
                </td>
                <td style={{ textAlign: "right" }}>{r.fieldMinutes ? durationHM(r.fieldMinutes) : "—"}</td>
                <td style={{ textAlign: "right" }}>{r.orderValue ? money0(r.orderValue) : "—"}</td>
                <td style={{ textAlign: "right" }}>{r.collected ? money0(r.collected) : "—"}</td>
                <td style={{ textAlign: "right" }}>{r.samples || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hint" style={{ marginTop: "auto" }}>
        This lands as a notification every evening after {String(data.hour).padStart(2, "0")}:00 — change the hour in the control panel.
      </div>
    </Screen>
  );
}

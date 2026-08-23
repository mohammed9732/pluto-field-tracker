"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, money, monthName } from "@/lib/fmt";

export default function Targets() {
  const tx = useT();
  const me = useMe();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [period, setPeriod] = useState("");
  const [rows, setRows] = useState<Record<number, { targetQty: string; minPct: string; incentivePct: string }>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Next month, by arithmetic rather than by stepping a Date. setMonth keeps
    // the day-of-month, so on the 31st it overflows a short month and lands
    // two months out — targets would be set against the wrong month.
    const now = new Date();
    const m = now.getMonth() + 1;
    const year = now.getFullYear() + Math.floor(m / 12);
    setPeriod(`${year}-${String((m % 12) + 1).padStart(2, "0")}`);
    api("/api/team").then((r: any) => {
      setUsers(r.rows);
      if (r.rows.length) setUserId(r.rows[0].userId);
    }).catch(() => {});
  }, []);

  const loadTargets = useCallback(() => {
    if (!userId || !period) return;
    api(`/api/targets?userId=${userId}&period=${period}`).then((r: any) => {
      setProducts(r.products);
      const map: any = {};
      for (const p of r.products) {
        const t = r.targets.find((x: any) => x.productId === p.id);
        map[p.id] = t
          ? { targetQty: String(t.targetQty), minPct: String(t.minPct), incentivePct: String(t.incentivePct) }
          : { targetQty: "", minPct: "70", incentivePct: "2" };
      }
      setRows(map);
    }).catch(() => {});
  }, [userId, period]);
  useEffect(loadTargets, [loadTargets]);

  if (!me) return <Spinner />;

  async function save() {
    if (!userId) return;
    setBusy(true);
    setSaved(false);
    try {
      await api("/api/targets", {
        json: {
          userId, period,
          rows: products.map((p) => ({
            productId: p.id,
            targetQty: Number(rows[p.id]?.targetQty) || 0,
            minPct: Number(rows[p.id]?.minPct) || 70,
            incentivePct: Number(rows[p.id]?.incentivePct) || 0,
          })),
        },
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const monthOptions: string[] = [];
  {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    for (let i = 0; i < 4; i++) {
      monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() + 1);
    }
  }

  return (
    <Screen me={me}>
      <div>
        <h4 style={{ margin: "0 0 2px" }}>{tx("tgt.setTargets", "Set targets")}</h4>
        <div className="small muted fs-caption">{tx("tgt.quantitiesPerProductPer", "Quantities per product per month")}</div>
      </div>
      <div className="two-3">
        <div className="field m0">
          <label>Rep</label>
          <select className="input" value={userId ?? ""} onChange={(e) => setUserId(Number(e.target.value))}>
            {users.map((u) => <option key={u.userId} value={u.userId}>{u.name}</option>)}
          </select>
        </div>
        <div className="field m0">
          <label>{tx("tgt.month", "Month")}</label>
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {monthOptions.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
        </div>
      </div>
      {products.map((p) => (
        <div key={p.id} className="card gap-2">
          <div className="fs-small w-500">
            {p.name} <span style={{ fontWeight: 400, color: "var(--color-neutral-600)" }}>· {money(p.unitPrice)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div className="field m0">
              <label>{tx("tgt.targetQty", "Target qty")}</label>
              <input className="input" inputMode="numeric" value={rows[p.id]?.targetQty ?? ""} onChange={(e) => setRows((r) => ({ ...r, [p.id]: { ...r[p.id], targetQty: e.target.value } }))} />
            </div>
            <div className="field m0">
              <label>{tx("tgt.min", "Min %")}</label>
              <input className="input" inputMode="numeric" value={rows[p.id]?.minPct ?? ""} onChange={(e) => setRows((r) => ({ ...r, [p.id]: { ...r[p.id], minPct: e.target.value } }))} />
            </div>
            <div className="field m0">
              <label>{tx("tgt.incentive", "Incentive %")}</label>
              <input className="input" inputMode="decimal" value={rows[p.id]?.incentivePct ?? ""} onChange={(e) => setRows((r) => ({ ...r, [p.id]: { ...r[p.id], incentivePct: e.target.value } }))} />
            </div>
          </div>
        </div>
      ))}
      <div className="hint">Below the minimum → incentive is $0 for that product that month. Achieved value uses price snapshots. Leave qty empty to remove a target.</div>
      {saved ? <div className="tag tag-ok self-start">{tx("tgt.targetsSaved", "Targets saved")}</div> : null}
      <button className="btn btn-primary btn-block" style={{ padding: 13, marginTop: "auto" }} onClick={save} disabled={busy || !userId}>
        {busy ? "Saving…" : `Save ${monthName(period)} targets`}
      </button>
    </Screen>
  );
}

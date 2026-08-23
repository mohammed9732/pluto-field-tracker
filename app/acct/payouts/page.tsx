"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, money, monthName } from "@/lib/fmt";

export default function Payouts() {
  const tx = useT();
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const load = useCallback(() => {
    api("/api/money?view=payouts").then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);
  if (!me || !data) return <Spinner />;

  async function pay(userId: number) {
    if (!window.confirm("Mark this quarter as paid? This locks it with timestamp and your ID.")) return;
    await api("/api/money", { json: { action: "payout", userId, quarter: data.quarter } });
    load();
  }

  return (
    <Screen me={me} wide>
      <div className="row items-base">
        <h4 className="m0 f1">{tx("payouts.payouts", "Payouts")}</h4>
        <span className="tag tag-neutral">{data.quarter.replace("-", " ")}</span>
      </div>
      {data.rows.map((r: any) => (
        <div key={r.userId} className="card gap-2">
          <div className="row gap-3">
            <div className="f1">
              <div className="fs-small w-500">{r.name}</div>
              <div className="small muted">
                {r.months.map((m: any) => `${monthName(m.period).slice(0, 3)} ${(m.amount + (m.commission ?? 0)) > 0 ? money(m.amount + (m.commission ?? 0)) : "—"}`).join(" · ")}
              </div>
              {r.commission > 0 ? (
                <div className="small muted">Target incentives {money(r.incentives ?? 0)} + sales commission {money(r.commission)}</div>
              ) : null}
            </div>
            <span className="hnum fs-lead">{money(r.total)}</span>
          </div>
          {r.paid ? (
            <div className="row" style={{ gap: 8, fontSize: 12, color: "var(--color-neutral-600)" }}>
              <span className="tag tag-ok">{tx("payouts.paid", "Paid")}</span>
              {dmy(r.paid.paidAt)} {r.paid.paidAt.slice(11, 16)} · by {r.paid.paidByName}
            </div>
          ) : r.paidWithWages ? (
            <div className="small" style={{ color: "var(--c-green-deep)" }}>
              Paid with the quarter-end wages on {dmy(r.paidWithWages)}
            </div>
          ) : (
            <button className="btn btn-primary btn-block p-3" onClick={() => pay(r.userId)} disabled={r.total <= 0}>
              {tx("payouts.markAsPaid", "Mark as paid")}
            </button>
          )}
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("payouts.paid", "Paid")}</h6>
        {data.history.length === 0 ? <div className="small muted">{tx("payouts.noPayoutHistoryYet", "No payout history yet.")}</div> : null}
        {data.history.map((p: any) => (
          <div key={p.id} className="listrow py-2">
            <div className="f1">
              <div className="fs-small">{p.quarter.replace("-", " ")} · {p.name}</div>
              <div className="small muted">paid {dmy(p.paidAt)} by {p.paidByName}</div>
            </div>
            <span className="tag tag-ok">Paid · {money(p.amount)}</span>
          </div>
        ))}
      </div>
      <div className="hint mt-auto">
        Marking as paid locks the quarter with timestamp and accountant ID. Reps see accrued vs paid, read-only.
      </div>
    </Screen>
  );
}

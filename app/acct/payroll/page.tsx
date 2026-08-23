"use client";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, money, monthName } from "@/lib/fmt";

export default function Payroll() {
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const load = useCallback(() => {
    api("/api/money?view=payroll").then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);
  if (!me || !data) return <Spinner />;

  async function pay(r: any) {
    if (!window.confirm(`Pay ${r.name} ${money(r.total)} for ${monthName(data.period)}?`)) return;
    await api("/api/money", { json: { action: "payroll", userId: r.userId, period: data.period, amount: r.total } });
    load();
  }

  const roleLabel: Record<string, string> = { supervisor: "Supervisor", rep: "", accountant: "Accountant" };

  return (
    <Screen me={me} wide>
      <div className="row" style={{ alignItems: "baseline" }}>
        <h4 style={{ margin: 0, flex: 1 }}>Payroll</h4>
        <span className="tag tag-neutral">{monthName(data.period)}</span>
      </div>
      {data.rows.map((r: any) => (
        <div key={r.userId} className="card" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {r.name}{roleLabel[r.role] ? ` · ${roleLabel[r.role]}` : ""}
              </div>
              <div className="small muted">
                Base {money(r.base)}
                {r.commission > 0 ? ` + ${money(r.commission)} collection commission` : ""}
                {data.isQuarterEnd && r.incentiveDue > 0 ? ` + ${money(r.incentiveDue)} quarter incentives` : " · incentives pay at quarter end"}
              </div>
            </div>
            <span className="hnum" style={{ fontSize: 18 }}>{money(r.total)}</span>
          </div>
          {(() => {
            const flagged = (r.deductions ?? []).filter((d: any) => d.status === "flagged");
            if (!flagged.length) return null;
            return (
              <details style={{ background: "var(--c-amber-soft)", borderRadius: 10, padding: "7px 10px" }}>
                <summary style={{ fontSize: 12, color: "var(--c-amber-deep)", cursor: "pointer", fontWeight: 600 }}>
                  {flagged.length} day{flagged.length === 1 ? "" : "s"} without check-in — review
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8 }}>
                  {flagged.map((d: any) => (
                    <div key={d.id} className="row" style={{ gap: 6, fontSize: 12 }}>
                      <span style={{ flex: 1, color: "var(--c-amber-deep)" }}>{dmy(d.date)} — {money(d.amount)}</span>
                      <button className="btn" style={{ fontSize: 12, padding: "3px 10px", background: "var(--c-amber)", border: "none", color: "#fff" }}
                        onClick={async () => { await api("/api/money", { json: { action: "deduction", id: d.id, decision: "confirm" } }); load(); }}>Deduct</button>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: "3px 10px" }}
                        onClick={async () => { await api("/api/money", { json: { action: "deduction", id: d.id, decision: "waive" } }); load(); }}>Excuse</button>
                    </div>
                  ))}
                </div>
              </details>
            );
          })()}
          {r.deducted > 0 ? <div className="small" style={{ color: "var(--c-coral-deep)" }}>Deducted {money(r.deducted)} for missed days</div> : null}
          {r.spendingsDue > 0 ? (
            <div className="row" style={{ gap: 6, fontSize: 12 }}>
              <span style={{ flex: 1, color: "var(--c-green-deep)" }}>Spendings to pay back: <b>{money(r.spendingsDue)}</b></span>
              <button className="btn btn-green" style={{ fontSize: 12, padding: "3px 10px" }}
                onClick={async () => { await api("/api/spendings", { json: { action: "payMonth", userId: r.userId, period: data.period } }); load(); }}>Pay back</button>
            </div>
          ) : null}
          {r.paid ? (
            <div className="row" style={{ gap: 8, fontSize: 12, color: "var(--color-neutral-600)" }}>
              <span className="tag tag-ok">Paid</span>
              {dmy(r.paid.paidAt)} {r.paid.paidAt.slice(11, 16)} · by {r.paid.paidByName}
            </div>
          ) : (
            <button className="btn btn-primary btn-block" style={{ padding: 10 }} onClick={() => pay(r)}>Mark as paid</button>
          )}
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Quarter-end months add incentives</h6>
        <div className="small muted" style={{ fontSize: 12 }}>
          September rows will show base + Q3 incentive due for anyone who qualified.
        </div>
      </div>
      <div className="hint" style={{ marginTop: "auto" }}>
        Salaries visible to owner and accountant only. Every payment records timestamp + accountant ID.
      </div>
    </Screen>
  );
}

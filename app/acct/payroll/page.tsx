"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, money, monthName } from "@/lib/fmt";

/* Pay people — everything the company pays its employees, on one page.
 *
 * It used to be two: Payroll (monthly wages) and Payouts (quarterly
 * incentives), two card stacks over the same API, cross-referencing each
 * other. Answering "is this person fully paid?" meant checking both. The
 * owner suspected they belonged together and the review agreed: both are the
 * same job — pay the team — split by which table the money came from, which
 * is the system's concern, not the accountant's.
 *
 * The wages are a table, not cards: eight people's figures only become
 * comparable when the columns line up, and the footer answers the question
 * the cards never could — how much cash to withdraw this month.
 */
export default function PayPeople() {
  const tx = useT();
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [payouts, setPayouts] = useState<any>(null);

  const load = useCallback(() => {
    api("/api/money?view=payroll").then(setData).catch(() => {});
    api("/api/money?view=payouts").then(setPayouts).catch(() => {});
  }, []);
  useEffect(load, [load]);
  if (!me || !data) return <Spinner />;

  async function pay(r: any) {
    if (!window.confirm(tx("payroll.confirmPay", "Pay {name} {amount} for {month}?")
      .replace("{name}", r.name).replace("{amount}", money(r.total)).replace("{month}", monthName(data.period)))) return;
    await api("/api/money", { json: { action: "payroll", userId: r.userId, period: data.period } });
    load();
  }

  async function payQuarter(r: any) {
    if (!window.confirm(tx("payouts.confirmPay", "Pay {name} {amount} for {q}?")
      .replace("{name}", r.name).replace("{amount}", money(r.total)).replace("{q}", payouts.quarter))) return;
    await api("/api/money", { json: { action: "payout", userId: r.userId, quarter: payouts.quarter } });
    load();
  }

  const rows = data.rows as any[];
  const totalBill = rows.reduce((s, r) => s + r.total, 0);
  const paidSoFar = rows.filter((r) => r.paid).reduce((s, r) => s + (r.paid.amount ?? r.total), 0);
  const stillDue = rows.filter((r) => !r.paid).reduce((s, r) => s + r.total, 0);
  // People with something to decide before their pay is final.
  const attention = rows.filter((r) =>
    (r.deductions ?? []).some((d: any) => d.status === "flagged") || r.spendingsDue > 0);

  return (
    <Screen me={me}>
      <div className="row items-base">
        <h4 className="m0 f1">{tx("payroll.payPeople", "Pay people")}</h4>
        <span className="tag tag-neutral">{monthName(data.period)}</span>
      </div>

      {/* The three numbers the whole page exists to answer. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">{tx("payroll.wageBill", "Wage bill")}</span>
          <span className="hnum fs-h3">{money(totalBill)}</span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker" style={{ color: "var(--c-green-deep)" }}>{tx("payroll.paidSoFar", "Paid")}</span>
          <span className="hnum fs-h3" style={{ color: "var(--c-green-deep)" }}>{money(paidSoFar)}</span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker" style={{ color: stillDue ? "var(--c-amber-deep)" : undefined }}>{tx("payroll.stillDue", "Still due")}</span>
          <span className="hnum fs-h3" style={{ color: stillDue ? "var(--c-amber-deep)" : undefined }}>{money(stillDue)}</span>
        </div>
      </div>

      {/* ---- monthly wages, as columns that line up -------------------- */}
      <div className="card" style={{ gap: 8 }}>
        <h6 className="m0">{tx("payroll.monthlyWages", "Monthly wages")}</h6>
        <div style={{ overflowX: "auto" }}>
          <table className="table fs-caption" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>{tx("acct.person", "Person")}</th>
                <th className="ta-r">{tx("acct.base", "Base")}</th>
                <th className="ta-r">{tx("acct.commission", "Commission")}</th>
                <th className="ta-r">{tx("payroll.incentives", "Incentives")}</th>
                <th className="ta-r">{tx("acct.deducted", "Deducted")}</th>
                <th className="ta-r">{tx("common.total", "Total")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td className="w-500">{r.name}</td>
                  <td className="ta-r hnum">{money(r.base)}</td>
                  <td className="ta-r hnum">{r.commission ? money(r.commission) : "—"}</td>
                  <td className="ta-r hnum">{r.incentiveDue ? money(r.incentiveDue) : "—"}</td>
                  <td className="ta-r hnum" style={{ color: r.deducted ? "var(--c-coral-deep)" : undefined }}>
                    {r.deducted ? `−${money(r.deducted)}` : "—"}
                  </td>
                  <td className="ta-r hnum" style={{ fontWeight: 700 }}>{money(r.total)}</td>
                  <td className="ta-r">
                    {r.paid ? (
                      <span className="tag tag-ok" title={`${dmy(r.paid.paidAt)} · ${r.paid.paidByName}`}>{tx("payroll.paid", "Paid")}</span>
                    ) : (
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => pay(r)}>
                        {tx("payroll.payBtn", "Pay")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="w-700">{tx("common.total", "Total")}</td>
                <td className="ta-r hnum w-700">{money(rows.reduce((s, r) => s + r.base, 0))}</td>
                <td className="ta-r hnum w-700">{money(rows.reduce((s, r) => s + r.commission, 0))}</td>
                <td className="ta-r hnum w-700">{money(rows.reduce((s, r) => s + r.incentiveDue, 0))}</td>
                <td className="ta-r hnum w-700" style={{ color: "var(--c-coral-deep)" }}>
                  −{money(rows.reduce((s, r) => s + r.deducted, 0))}
                </td>
                <td className="ta-r hnum w-700">{money(totalBill)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!data.isQuarterEnd ? (
          <div className="small muted">{tx("payroll.quarterNote", "Quarter incentives are added to the third month of each quarter — or paid separately below.")}</div>
        ) : null}
      </div>

      {/* ---- things to decide before pay is final ---------------------- */}
      {attention.length ? (
        <div className="card" style={{ gap: 10, borderColor: "var(--c-amber)" }}>
          <h6 className="m0" style={{ color: "var(--c-amber-deep)" }}>{tx("payroll.decideFirst", "Decide these before paying")}</h6>
          {attention.map((r) => {
            const flagged = (r.deductions ?? []).filter((d: any) => d.status === "flagged");
            return (
              <div key={r.userId} className="stack-1" style={{ paddingBottom: 6, borderBottom: "1px solid var(--color-divider)" }}>
                <div className="fs-small w-500">{r.name}</div>
                {flagged.map((d: any) => (
                  <div key={d.id} className="row" style={{ gap: 6, fontSize: 12 }}>
                    <span style={{ flex: 1, color: "var(--c-amber-deep)" }}>
                      {tx("payroll.noCheckin", "No check-in")} {dmy(d.date)} — {money(d.amount)}
                    </span>
                    <button className="btn" style={{ fontSize: 12, padding: "3px 10px", background: "var(--c-amber)", border: "none", color: "#fff" }}
                      onClick={async () => { await api("/api/money", { json: { action: "deduction", id: d.id, decision: "confirm" } }); load(); }}>{tx("payroll.deduct", "Deduct")}</button>
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: "3px 10px" }}
                      onClick={async () => { await api("/api/money", { json: { action: "deduction", id: d.id, decision: "waive" } }); load(); }}>{tx("payroll.excuse", "Excuse")}</button>
                  </div>
                ))}
                {r.spendingsDue > 0 ? (
                  <div className="row" style={{ gap: 6, fontSize: 12 }}>
                    <span style={{ flex: 1, color: "var(--c-green-deep)" }}>
                      {tx("payroll.spendingsToPayBack", "Spendings to pay back:")} <b>{money(r.spendingsDue)}</b>
                    </span>
                    <button className="btn btn-green" style={{ fontSize: 12, padding: "3px 10px" }}
                      onClick={async () => { await api("/api/spendings", { json: { action: "payMonth", userId: r.userId, period: data.period } }); load(); }}>{tx("payroll.payBack", "Pay back")}</button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ---- quarterly incentives (was its own Payouts page) ----------- */}
      {payouts ? (
        <div className="card" style={{ gap: 8 }}>
          <div className="row items-base">
            <h6 className="m0 f1">{tx("payouts.quarterly", "Quarterly incentives")}</h6>
            <span className="tag tag-neutral hnum">{payouts.quarter}</span>
          </div>
          {payouts.rows.filter((r: any) => r.total > 0 || r.paid || r.paidWithWages).length === 0 ? (
            <div className="small muted">{tx("payouts.nothingAccrued", "Nothing accrued this quarter yet.")}</div>
          ) : payouts.rows.filter((r: any) => r.total > 0 || r.paid || r.paidWithWages).map((r: any) => (
            <div key={r.userId} className="listrow" style={{ alignItems: "center", gap: 10 }}>
              <div className="f1min">
                <div className="fs-small w-500">{r.name}</div>
                <div className="small muted">
                  {tx("payouts.targetIncentives", "Target incentives")} {money(r.incentives ?? 0)} + {tx("payouts.salesCommission", "sales commission")} {money(r.commission)}
                </div>
              </div>
              <span className="hnum fs-small" style={{ fontWeight: 700 }}>{money(r.total)}</span>
              {r.paid ? (
                <span className="tag tag-ok" title={`${dmy(r.paid.paidAt)} · ${r.paid.paidByName}`}>{tx("payouts.paid", "Paid")}</span>
              ) : r.paidWithWages ? (
                <span className="tag tag-ok">{tx("payouts.withWages", "With wages")} {dmy(r.paidWithWages)}</span>
              ) : (
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => payQuarter(r)} disabled={r.total <= 0}>
                  {tx("payroll.payBtn", "Pay")}
                </button>
              )}
            </div>
          ))}
          {payouts.history?.length ? (
            <details>
              <summary className="small muted" style={{ cursor: "pointer" }}>{tx("payouts.history", "Payout history")}</summary>
              <div className="stack-1" style={{ paddingTop: 6 }}>
                {payouts.history.map((p: any) => (
                  <div key={p.id} className="row fs-caption" style={{ gap: 8, color: "var(--color-neutral-600)" }}>
                    <span className="f1">{p.name} · {p.quarter}</span>
                    <span className="hnum">{money(p.amount)}</span>
                    <span>{dmy(p.paidAt)}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="hint mt-auto">
        {tx("payroll.footer", "Salaries are visible to the owner and accountant only. Every payment records a timestamp and who pressed the button; the amount is always recomputed by the system, never taken from the screen.")}
      </div>
    </Screen>
  );
}

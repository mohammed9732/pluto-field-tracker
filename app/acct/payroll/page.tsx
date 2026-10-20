"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy, groupDigits, money, monthName, ungroup } from "@/lib/fmt";

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
/* A section that folds away. Closed, it still answers "how much is
 * waiting in here?" — the badge carries the count, per the owner's ask:
 * tidy when shut, never silent. */
function Fold({ title, badge, accent, defaultOpen, children }: {
  title: string; badge?: number; accent?: boolean; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="card" style={{ gap: open ? 10 : 0, borderColor: accent ? "var(--c-amber)" : undefined }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "start", font: "inherit", width: "100%" }}>
        <h6 className="m0 f1" style={{ color: accent ? "var(--c-amber-deep)" : undefined }}>{title}</h6>
        {!open && badge ? <span className="tag tag-warn hnum">{badge}</span> : null}
        <span style={{ color: "var(--color-neutral-500)", fontSize: 14 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open ? children : null}
    </div>
  );
}

export default function PayPeople() {
  const tx = useT();
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [payouts, setPayouts] = useState<any>(null);
  // Per-person tiered collection plans being edited: userId -> draft fields.
  const [planDraft, setPlanDraft] = useState<Record<number, { target: string; below: string; above: string }>>({});
  // Manual penalty being written: null = closed.
  const [pen, setPen] = useState<{ userId: string; amount: string; reason: string } | null>(null);
  const [penErr, setPenErr] = useState("");

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
  const decideCount = rows.reduce((s, r) =>
    s + (r.deductions ?? []).filter((d: any) => d.status === "flagged").length + (r.spendingsDue > 0 ? 1 : 0), 0);

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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span className="tag tag-ok" title={`${dmy(r.paid.paidAt)} · ${r.paid.paidByName}`}>{tx("payroll.paid", "Paid")}</span>
                        {/* The undo: removes the payment record so Pay comes
                            back; the history keeps who undid it. */}
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 6px", color: "var(--c-coral-deep)" }}
                          title={tx("payroll.undoPay", "Undo this payment")}
                          onClick={async () => {
                            if (!window.confirm(tx("payroll.undoPayConfirm", "Undo {name}'s wage payment? The Pay button comes back and the undo is recorded.").replace("{name}", r.name))) return;
                            await api("/api/money", { json: { action: "unpay", kind: "payroll", userId: r.userId, period: data.period } });
                            load();
                          }}>↩</button>
                      </span>
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
      <Fold title={tx("payroll.decideFirst", "Decide these before paying")} badge={decideCount} accent defaultOpen={decideCount > 0}>
          {pen ? (
            <div className="stack-2" style={{ padding: 10, background: "var(--c-amber-soft)", borderRadius: 12 }}>
              <div className="row gap-2">
                <select className="input f1" value={pen.userId} onChange={(e) => setPen({ ...pen, userId: e.target.value })}>
                  <option value="">{tx("payroll.whoPenalty", "Who…")}</option>
                  {rows.map((r) => <option key={r.userId} value={r.userId}>{r.name}</option>)}
                </select>
                <input className="input hnum" style={{ width: 130 }} inputMode="numeric" placeholder={tx("common.amount", "Amount")}
                  value={pen.amount} onChange={(e) => setPen({ ...pen, amount: groupDigits(e.target.value) })} />
              </div>
              <input className="input" placeholder={tx("payroll.penaltyReasonPh", "What is it for? e.g. weekly report not sent")}
                value={pen.reason} onChange={(e) => setPen({ ...pen, reason: e.target.value })} />
              {penErr ? <div className="tag tag-hot self-start">{penErr}</div> : null}
              <div className="two">
                <button className="btn btn-primary" style={{ padding: 8 }} disabled={!pen.userId || !pen.amount || !pen.reason.trim()}
                  onClick={async () => {
                    setPenErr("");
                    try {
                      await api("/api/money", { json: { action: "penalty", userId: Number(pen.userId), amount: ungroup(pen.amount), reason: pen.reason } });
                      setPen(null);
                      load();
                    } catch (e: any) { setPenErr(e?.message || "Could not add it"); }
                  }}>{tx("payroll.addPenalty", "Add penalty")}</button>
                <button className="btn btn-secondary" style={{ padding: 8 }} onClick={() => setPen(null)}>{tx("docs.cancel", "Cancel")}</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost fs-caption self-start" onClick={() => { setPenErr(""); setPen({ userId: "", amount: "", reason: "" }); }}>
              ＋ {tx("payroll.addPenalty", "Add penalty")}
            </button>
          )}
          {attention.length === 0 ? (
            <div className="small muted">{tx("payroll.nothingToDecide", "Nothing waiting — every flag is decided.")}</div>
          ) : null}
          {attention.map((r) => {
            const flagged = (r.deductions ?? []).filter((d: any) => d.status === "flagged");
            return (
              <div key={r.userId} className="stack-1" style={{ paddingBottom: 6, borderBottom: "1px solid var(--color-divider)" }}>
                <div className="fs-small w-500">{r.name}</div>
                {flagged.map((d: any) => (
                  <div key={d.id} className="row" style={{ gap: 6, fontSize: 12 }}>
                    <span style={{ flex: 1, color: "var(--c-amber-deep)" }}>
                      {d.reason ? d.reason : tx("payroll.noCheckin", "No check-in")} {dmy(d.date)} — {money(d.amount)}
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
      </Fold>

      {/* ---- the collection incentive: target + two rates, per person -- */}
      <Fold title={tx("payroll.collPlan", "Collection incentive — target & rates")}>
        <div className="small muted">
          {tx("payroll.collPlanSub", "Below the monthly target they earn the lower % on what they collected; at or above it, the higher % on all of it. Blank = the company-wide rate.")}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table fs-caption" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>{tx("acct.person", "Person")}</th>
                <th className="ta-r">{tx("payroll.collectedMtd", "Collected")}</th>
                <th className="ta-r">{tx("payroll.collTarget", "Monthly target")}</th>
                <th className="ta-r">{tx("payroll.pctBelow", "% below")}</th>
                <th className="ta-r">{tx("payroll.pctAbove", "% at/above")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => (r.role === "rep" && r.canCollect) || r.role === "collector").map((r) => {
                const d = planDraft[r.userId] ?? {
                  target: r.collectionTarget != null ? String(r.collectionTarget) : "",
                  below: r.collectionPctBelow != null ? String(r.collectionPctBelow) : "",
                  above: r.collectionPctAbove != null ? String(r.collectionPctAbove) : "",
                };
                const hit = r.collectionTarget && r.collected >= r.collectionTarget;
                return (
                  <tr key={r.userId}>
                    <td className="w-500">{r.name}</td>
                    <td className="ta-r hnum" style={{ color: hit ? "var(--c-green-deep)" : undefined, fontWeight: hit ? 700 : 400 }}>
                      {money(r.collected)}{hit ? " ✓" : ""}
                    </td>
                    <td className="ta-r"><input className="input hnum" style={{ width: 120, minHeight: 30, textAlign: "end" }} inputMode="numeric"
                      value={d.target} onChange={(e) => setPlanDraft({ ...planDraft, [r.userId]: { ...d, target: e.target.value } })} /></td>
                    <td className="ta-r"><input className="input hnum" style={{ width: 64, minHeight: 30, textAlign: "end" }} inputMode="decimal"
                      value={d.below} onChange={(e) => setPlanDraft({ ...planDraft, [r.userId]: { ...d, below: e.target.value } })} /></td>
                    <td className="ta-r"><input className="input hnum" style={{ width: 64, minHeight: 30, textAlign: "end" }} inputMode="decimal"
                      value={d.above} onChange={(e) => setPlanDraft({ ...planDraft, [r.userId]: { ...d, above: e.target.value } })} /></td>
                    <td className="ta-r">
                      {planDraft[r.userId] ? (
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 12px" }}
                          onClick={async () => {
                            await api("/api/money", { json: { action: "collectionPlan", userId: r.userId, target: d.target, below: d.below, above: d.above } });
                            setPlanDraft((pd) => { const n = { ...pd }; delete n[r.userId]; return n; });
                            load();
                          }}>{tx("common.save", "Save")}</button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Fold>

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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="tag tag-ok" title={`${dmy(r.paid.paidAt)} · ${r.paid.paidByName}`}>{tx("payouts.paid", "Paid")}</span>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 6px", color: "var(--c-coral-deep)" }}
                    title={tx("payroll.undoPay", "Undo this payment")}
                    onClick={async () => {
                      if (!window.confirm(tx("payroll.undoPayoutConfirm", "Undo {name}'s quarterly payout? The Pay button comes back and the undo is recorded.").replace("{name}", r.name))) return;
                      await api("/api/money", { json: { action: "unpay", kind: "payout", userId: r.userId, quarter: payouts.quarter } });
                      load();
                    }}>↩</button>
                </span>
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

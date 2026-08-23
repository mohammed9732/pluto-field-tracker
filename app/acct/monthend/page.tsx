"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { MascotNote } from "@/components/MascotNote";
import { api, dmy, money, monthName } from "@/lib/fmt";

/* The month-end pack.
 *
 * One screen to check before paying anyone. The blockers at the top are the
 * whole point: paying a month while a spending is still unapproved means the
 * figure you paid was never the real one.
 */
/* The server sends both a key and an English label. The key is what we
 * translate against; the label is the fallback if a new blocker type appears
 * before this list knows about it. */
function blockerLabel(tx: (k: string, en: string) => string, key: string, fallback: string): string {
  switch (key) {
    case "deductions": return tx("monthend.blockerDeductions", "missed days still undecided");
    case "spendings":  return tx("monthend.blockerSpendings", "spendings not yet approved");
    case "orders":     return tx("monthend.blockerOrders", "orders still awaiting approval");
    case "invoices":   return tx("monthend.blockerInvoices", "approved orders not yet invoiced");
    default:           return fallback;
  }
}

export default function MonthEnd() {
  const tx = useT();
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    api(`/api/monthend${period ? `?period=${period}` : ""}`)
      .then((r: any) => {
        setData(r);
        if (!period) setPeriod(r.period);
      })
      .catch(() => {});
  }, [period]);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const t = data.totals;

  async function pay(p: any) {
    if (!window.confirm(`Pay ${p.name} ${money(p.netPay)} for ${monthName(data.period)}?`)) return;
    setBusy(p.userId);
    try {
      await api("/api/money", { json: { action: "payroll", userId: p.userId, period: data.period, amount: p.netPay } });
      load();
    } finally {
      setBusy(null);
    }
  }

  function shiftMonth(by: number) {
    const [y, m] = data.period.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + by, 1));
    setPeriod(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    setData(null);
  }

  return (
    <Screen me={me} wide>
      <div className="row" style={{ alignItems: "baseline", flexWrap: "wrap" }}>
        <h4 className="m0 f1">{tx("monthend.monthEndPack", "Month-end pack")}</h4>
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 11px" }} onClick={() => shiftMonth(-1)}>
          {tx("monthend.earlier", "← Earlier")}
        </button>
        <span className="tag tag-neutral">{monthName(data.period)}</span>
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 11px" }} onClick={() => shiftMonth(1)}>
          {tx("monthend.later", "Later →")}
        </button>
      </div>

      {data.isClosedAlready ? (
        <div className="tag tag-ok self-start">
          {tx("monthend.closedTheseFiguresCan", "Closed — these figures can no longer change")}
        </div>
      ) : null}

      {data.blockers.length === 0 ? (
        <MascotNote mood="cheer" tone="win" size={60}
          title={tx("monthend.nothingIsWaitingOnPh", "Nothing is waiting on a decision")}
          body={tx("monthend.safeToPay", "Every missed day, spending and order for this month has been dealt with. Safe to pay.")} />
      ) : (
        <div className="card" style={{ gap: 8, borderColor: "var(--c-amber)" }}>
          <div className="row gap-2">
            <span style={{ fontWeight: 700, flex: 1 }}>{tx("monthend.dealWithTheseFirst", "Deal with these first")}</span>
            <span className="tag tag-warn">{data.blockers.length}</span>
          </div>
          <div className="small muted">
            {tx("monthend.blockersWhy", "Each of these could still change what someone is owed. Paying now means paying a figure that moves afterwards.")}
          </div>
          {data.blockers.map((b: any) => (
            <Link key={b.key} href={b.href} className="listrow" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="hnum" style={{ fontSize: 18, width: 34 }}>{b.count}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{blockerLabel(tx, b.key, b.label)}</span>
              <span className="small" style={{ color: "var(--color-accent)" }}>{tx("monthend.open", "Open →")}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="kpi-grid">
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">{tx("monthend.toHandOver", "To hand over")}</span>
          <span className="hnum fs-h2">{money(t.handOver)}</span>
          <span className="small muted fs-caption">
            {tx("monthend.wagesWord", "wages")} {money(t.netPay)} + {tx("monthend.expensesWord", "expenses")} {money(t.reimburse)}
          </span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">{tx("monthend.salesThisMonth", "Sales this month")}</span>
          <span className="hnum fs-h2">{money(t.sales)}</span>
          <span className="small muted fs-caption">{tx("monthend.approvedInvoiced", "approved and invoiced orders")}</span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">{tx("monthend.cashCollected", "Cash collected")}</span>
          <span className="hnum fs-h2">{money(t.collected)}</span>
          <span className="small muted fs-caption">{tx("monthend.commissionWord", "commission")} {money(t.commission)}</span>
        </div>
        <div className="card" style={{ gap: 2, padding: 12 }}>
          <span className="card-kicker">{tx("monthend.deductions", "Deductions")}</span>
          <span className="hnum" style={{ fontSize: 28, color: t.deducted ? "var(--c-coral-deep)" : undefined }}>
            {money(t.deducted)}
          </span>
          <span className="small muted fs-caption">
            {tx("monthend.alreadyPaid", "{a} of {b} already paid").replace("{a}", String(t.paidCount)).replace("{b}", String(data.people.length))}
          </span>
        </div>
      </div>

      {data.isQuarterEnd ? (
        <div className="card" style={{ gap: 4, borderColor: "var(--c-violet)" }}>
          <span className="card-kicker" style={{ color: "var(--c-violet-deep)" }}>
            {tx("monthend.quarterEnd", "Quarter end")} — {data.quarter.replace("-", " ")}
          </span>
          <div className="small">
            {tx("monthend.thisIsTheThird", "This is the third month of the quarter, so accrued sales incentives of")} <b>{money(t.incentiveDue)}</b> fall
            due with this payroll. They are already included in each total below.
          </div>
        </div>
      ) : null}

      <h6 style={{ margin: "6px 0 0", color: "var(--color-neutral-600)" }}>{tx("monthend.personByPerson", "Person by person")}</h6>
      <div className="tscroll">
        <table className="table">
          <thead>
            <tr>
              <th>{tx("monthend.person", "Person")}</th>
              <th className="ta-r">{tx("monthend.base", "Base")}</th>
              <th className="ta-r">{tx("monthend.commission", "Commission")}</th>
              {data.isQuarterEnd ? <th className="ta-r">{tx("monthend.quarter", "Quarter")}</th> : null}
              <th className="ta-r">{tx("monthend.deducted", "Deducted")}</th>
              <th className="ta-r">{tx("monthend.wages", "Wages")}</th>
              <th className="ta-r">{tx("monthend.expenses", "Expenses")}</th>
              <th className="ta-r">{tx("monthend.handOver", "Hand over")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.people.map((p: any) => (
              <tr key={p.userId}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="small muted">{p.city}</div>
                </td>
                <td className="ta-r">{money(p.base)}</td>
                <td className="ta-r">{p.commission ? money(p.commission) : "—"}</td>
                {data.isQuarterEnd ? (
                  <td className="ta-r">{p.incentiveDue ? money(p.incentiveDue) : "—"}</td>
                ) : null}
                <td style={{ textAlign: "right", color: p.deducted ? "var(--c-coral-deep)" : undefined }}>
                  {p.deducted ? `−${money(p.deducted)}` : "—"}
                  {p.undecidedDeductions ? (
                    <div className="small" style={{ color: "var(--c-amber-deep)" }}>{p.undecidedDeductions} {tx("monthend.undecided", "undecided")}</div>
                  ) : null}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{money(p.netPay)}</td>
                <td className="ta-r">
                  {p.reimburse ? money(p.reimburse) : "—"}
                  {p.spendingsPendingCount ? (
                    <div className="small" style={{ color: "var(--c-amber-deep)" }}>{p.spendingsPendingCount} {tx("monthend.pending", "pending")}</div>
                  ) : null}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{money(p.handOver)}</td>
                <td className="ta-r">
                  {p.paid ? (
                    <span className="tag tag-ok">{tx("monthend.paidOn", "Paid")} {dmy(p.paid.paidAt)}</span>
                  ) : (
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                      disabled={busy === p.userId || data.isClosedAlready}
                      onClick={() => pay(p)}>
                      {busy === p.userId ? "…" : tx("monthend.payWages", "Pay wages")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hint">
        {tx("monthend.footer", "Wages and expenses are paid separately. The app records the wage payment here; reimbursements are marked off on the Spendings screen. Hand over is what the person receives in total.")}
      </div>

      {!data.isClosedAlready && data.blockers.length === 0 && t.paidCount === data.people.length ? (
        <div className="card" style={{ gap: 8, borderColor: "var(--c-green)" }}>
          <span style={{ fontWeight: 700 }}>{tx("monthend.everyoneIsPaidAnd", "Everyone is paid and nothing is outstanding")}</span>
          <div className="small muted">
            This month can be closed in the control panel, which locks the figures so they cannot move afterwards.
          </div>
          <Link className="btn btn-secondary" href="/admin/settings" style={{ alignSelf: "flex-start", fontSize: 12 }}>
            {tx("monthend.goAndCloseIt", "Go and close it")}
          </Link>
        </div>
      ) : null}
    </Screen>
  );
}

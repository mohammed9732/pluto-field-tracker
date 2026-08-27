"use client";
import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { api, dmy, groupDigits, hm, money, money0, monthName, todayIso, ungroup } from "@/lib/fmt";
import { DoctorLink } from "@/components/DoctorLink";
import { useT } from "@/lib/i18n";

/* Money in — the one place for money coming into the company.
 *
 * "Collections" used to mean two different things: the dashboard tab listed
 * payments RECEIVED, while the sidebar item of the same name was the
 * SCHEDULE. "Cash collected today" lived, of all places, on the invoicing
 * page. Checking the money meant three screens and a guess about which word
 * meant what. Now it is one page, three tabs, in the order of the job:
 *
 *   Schedule   — what should come in, and what went wrong (missed, short)
 *   Received   — what actually came in this month
 *   Cash check — matching physical cash per rep against the records
 */
export default function MoneyIn() {
  const me = useMe();
  const tx = useT();
  const [tab, setTab] = useState<"schedule" | "received" | "recon">("schedule");
  const [sched, setSched] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null); // null = form closed
  const [err, setErr] = useState("");
  const [repFilter, setRepFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(() => {
    api("/api/collections").then(setSched).catch(() => {});
    api("/api/acctdash").then(setDash).catch(() => {});
    api("/api/doctors").then((r: any) => setDoctors(r.doctors)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !sched) return <Spinner />;

  const stateOf = (c: any) =>
    c.status === "done" ? (c.shortfall ? "shortfall" : "done") : (c.missedFlagged ? "missed" : "due");

  const TAG: Record<string, [string, string]> = {
    missed: [tx("coll.missed", "Missed"), "tag-hot"],
    shortfall: [tx("coll.shortfall", "Shortfall"), "tag-warn"],
    done: [tx("coll.done", "Collected"), "tag-ok"],
    due: [tx("coll.due", "Due"), "tag-neutral"],
  };

  const rows: any[] = sched.rows ?? [];
  // The morning list: what went wrong, newest first, until dealt with.
  const attention = rows
    .filter((c) => !c.attended && (c.missedFlagged || (c.status === "done" && c.shortfall)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filtered = rows
    .filter((c) => !repFilter || String(c.repId) === repFilter)
    .filter((c) => !statusFilter || stateOf(c) === statusFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const pickedDoc = doctors.find((d) => d.id === Number(form?.doctorId));
  const eligibleReps = (sched.reps ?? []).filter(
    (r: any) => !pickedDoc || r.city === "all" || r.city === pickedDoc.city);

  async function create() {
    setErr("");
    try {
      await api("/api/collections", { json: { action: "create", ...form, amount: ungroup(form.amount) } });
      setForm(null);
      load();
    } catch (e: any) { setErr(e?.message || "Could not schedule it"); }
  }

  /* Reschedule: the loop-closing button. For a shortfall it pre-fills the
   * REMAINDER, not the original amount — the question on the accountant's
   * mind is "when do we get the rest?". */
  function reschedule(c: any) {
    const remainder = c.status === "done" && c.shortfall ? c.amount - (c.collectedAmount ?? 0) : c.amount;
    setForm({
      doctorId: String(c.doctorId), repId: String(c.repId), date: "",
      amount: groupDigits(String(remainder)), invoiceNo: c.invoiceNo ?? "", note: c.note ?? "",
      afterId: c.id, // dismiss the old flag once the new one is scheduled
    });
    setTab("schedule");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function dismiss(id: number) {
    await api("/api/collections", { json: { action: "dismiss", id } });
    load();
  }

  // ---- Received tab data ----
  const received: any[] = dash?.collections ?? [];
  const [recRep, recMethod] = [repFilter, statusFilter]; // reuse the two filter slots per tab
  const receivedFiltered = received
    .filter((c) => !recRep || c.rep === recRep)
    .filter((c) => !recMethod || c.method === recMethod);
  const receivedTotal = receivedFiltered.reduce((s, c) => s + c.amount, 0);

  function exportReceived() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(receivedFiltered.map((c: any) => ({
      Ref: c.ref, Date: c.ts.slice(0, 10), Time: c.ts.slice(11, 16), Doctor: c.doctor, Rep: c.rep,
      Method: c.method, Note: c.note ?? "", "Amount IQD": c.amount,
    }))), "Received");
    XLSX.writeFile(wb, `money-in-${dash.period}.xlsx`);
  }

  // ---- Cash check tab: group by rep with subtotals ----
  const recon: any[] = dash?.reconciliation ?? [];
  // Plain computation, deliberately NOT useMemo: this code sits below the
  // early return above, and a hook after an early return crashes React with
  // "rendered more hooks than during the previous render" the moment the
  // data arrives. Grouping thirty rows is far cheaper than that bug.
  const reconGroups: Record<string, any[]> = {};
  for (const r of recon) (reconGroups[r.rep] = reconGroups[r.rep] ?? []).push(r);
  const reconByRep = Object.entries(reconGroups).map(([rep, days]) => ({
    rep, days,
    cash: days.reduce((s, d) => s + (d.cash ?? 0), 0),
    transfer: days.reduce((s, d) => s + (d.transfer ?? 0), 0),
    receipts: days.reduce((s, d) => s + (d.receipts ?? 0), 0),
  }));
  const reconTotal = {
    cash: reconByRep.reduce((s, g) => s + g.cash, 0),
    transfer: reconByRep.reduce((s, g) => s + g.transfer, 0),
    receipts: reconByRep.reduce((s, g) => s + g.receipts, 0),
  };

  return (
    <Screen me={me}>
      <PageHead title={tx("coll.moneyIn", "Money in")} back="back"
        right={dash ? <span className="tag tag-neutral">{monthName(dash.period)}</span> : undefined} />

      <div className="seg" style={{ width: "100%" }}>
        {([["schedule", tx("coll.tabSchedule", "Schedule")],
           ["received", tx("coll.tabReceived", "Received")],
           ["recon", tx("coll.tabCashCheck", "Cash check")]] as const).map(([k, label]) => (
          <label key={k} className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="mitab" checked={tab === k}
              onChange={() => { setTab(k); setRepFilter(""); setStatusFilter(""); }} />{label}
          </label>
        ))}
      </div>

      {/* ═══════════ SCHEDULE ═══════════ */}
      {tab === "schedule" ? (<>
        {attention.length ? (
          <div className="card" style={{ gap: 8, borderColor: "var(--c-coral)" }}>
            <h6 className="m0" style={{ color: "var(--c-coral-deep)" }}>
              {tx("coll.needsAttention", "Needs attention")} · {attention.length}
            </h6>
            {attention.map((c) => (
              <div key={c.id} className="listrow" style={{ alignItems: "center", gap: 10 }}>
                <span className={`tag ${TAG[stateOf(c)][1]}`}>{TAG[stateOf(c)][0]}</span>
                <div className="f1min">
                  <div className="fs-small w-500">{c.doctorName} <span className="muted">← {c.repName}</span></div>
                  <div className="small muted">
                    {dmy(c.date)}{c.invoiceNo ? ` · ${tx("coll.invoice", "invoice")} ${c.invoiceNo}` : ""}
                    {c.status === "done" && c.shortfall
                      ? ` · ${tx("coll.gotOf", "got {a} of {b}").replace("{a}", money(c.collectedAmount ?? 0)).replace("{b}", money(c.amount))}`
                      : ` · ${money(c.amount)}`}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => reschedule(c)}>
                  {tx("coll.reschedule", "Reschedule")}
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => dismiss(c.id)}
                  title={tx("coll.dismissHint", "Remove from this list — the record itself stays")}>
                  ✓
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="row gap-2">
          <button className="btn btn-secondary" style={{ fontSize: 12.5, padding: "8px 16px" }}
            onClick={() => { setErr(""); setForm(form ? null : { doctorId: "", repId: "", date: "", amount: "", invoiceNo: "", note: "" }); }}>
            {form ? tx("common.cancel", "Cancel") : "＋ " + tx("coll.scheduleOne", "Schedule a collection")}
          </button>
          <select className="input" style={{ width: 170, marginInlineStart: "auto" }} value={repFilter} onChange={(e) => setRepFilter(e.target.value)}>
            <option value="">{tx("coll.allReps", "All reps")}</option>
            {(sched.reps ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="input" style={{ width: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{tx("common.all", "All")}</option>
            <option value="due">{TAG.due[0]}</option>
            <option value="missed">{TAG.missed[0]}</option>
            <option value="shortfall">{TAG.shortfall[0]}</option>
            <option value="done">{TAG.done[0]}</option>
          </select>
        </div>

        {form ? (
          <div className="card" style={{ gap: 10 }}>
            <div className="two-col" style={{ gap: 10 }}>
              <div className="field m0">
                <label>{tx("coll.customer", "Customer")}</label>
                <select className="input" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value, repId: "" })}>
                  <option value="">{tx("stk.choose", "Choose…")}</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.clinic}</option>)}
                </select>
              </div>
              <div className="field m0">
                <label>{tx("coll.whoCollects", "Who collects")}</label>
                <select className="input" value={form.repId} onChange={(e) => setForm({ ...form, repId: e.target.value })}>
                  <option value="">{tx("stk.choose", "Choose…")}</option>
                  {eligibleReps.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="field m0">
                <label>{tx("common.date", "Date")}</label>
                <input className="input" type="date" min={todayIso()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field m0">
                <label>{tx("coll.amountIqd", "Amount (IQD)")}</label>
                <input className="input hnum" inputMode="numeric" placeholder="1,000,000" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: groupDigits(e.target.value) })} />
              </div>
              <div className="field m0">
                <label>{tx("coll.invoiceNo", "Invoice number")}</label>
                <input className="input" value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
              </div>
              <div className="field m0">
                <label>{tx("common.notes", "Note")}</label>
                <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            {err ? <div className="tag tag-hot self-start">{err}</div> : null}
            <button className="btn btn-primary self-start" style={{ padding: "10px 24px" }} onClick={create}>
              {tx("coll.schedule", "Schedule")}
            </button>
          </div>
        ) : null}

        <div className="card" style={{ gap: 6 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table fs-caption" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>{tx("coll.customer", "Customer")}</th>
                  <th>{tx("acct.rep", "Rep")}</th>
                  <th>{tx("common.date", "Date")}</th>
                  <th>{tx("coll.invoiceNo", "Invoice")}</th>
                  <th className="ta-r">{tx("coll.scheduled", "Scheduled")}</th>
                  <th className="ta-r">{tx("docp.collected", "Collected")}</th>
                  <th>{tx("common.status", "Status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="muted">{tx("coll.noneYet", "Nothing scheduled yet.")}</td></tr>
                ) : filtered.map((c) => {
                  const st = stateOf(c);
                  return (
                    <tr key={c.id}>
                      <td className="w-500">{c.doctorName}</td>
                      <td>{c.repName}</td>
                      <td>{dmy(c.date)}</td>
                      <td>{c.invoiceNo || "—"}</td>
                      <td className="ta-r hnum">{money0(c.amount)}</td>
                      <td className="ta-r hnum">{c.collectedAmount != null ? money0(c.collectedAmount) : "—"}</td>
                      <td><span className={`tag ${TAG[st][1]}`}>{TAG[st][0]}</span></td>
                      <td className="ta-r">
                        {sched.canEdit && c.status === "due" ? (
                          <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                            onClick={async () => { await api("/api/collections", { json: { action: "delete", id: c.id } }); load(); }}>✕</button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="w-700">{tx("common.total", "Total")} · {filtered.length}</td>
                  <td className="ta-r hnum w-700">{money0(filtered.reduce((s, c) => s + c.amount, 0))}</td>
                  <td className="ta-r hnum w-700">{money0(filtered.reduce((s, c) => s + (c.collectedAmount ?? 0), 0))}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>) : null}

      {/* ═══════════ RECEIVED ═══════════ */}
      {tab === "received" ? (<>
        <div className="row gap-2">
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={exportReceived}>
            {tx("acct.exportToExcel", "Export to Excel")}
          </button>
          <select className="input" style={{ width: 170, marginInlineStart: "auto" }} value={repFilter} onChange={(e) => setRepFilter(e.target.value)}>
            <option value="">{tx("coll.allReps", "All reps")}</option>
            {Array.from(new Set<string>(received.map((c) => c.rep))).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{tx("common.all", "All")}</option>
            <option value="cash">{tx("acct.cash", "Cash")}</option>
            <option value="transfer">{tx("acct.transfer", "Transfer")}</option>
          </select>
        </div>
        <div className="card" style={{ gap: 6 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table fs-caption" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>{tx("acct.date", "Date")}</th>
                  <th>{tx("coll.customer", "Customer")}</th>
                  <th>{tx("acct.rep", "Rep")}</th>
                  <th>{tx("pay.method", "Method")}</th>
                  <th>{tx("acct.receipt", "receipt")}</th>
                  <th className="ta-r">{tx("common.amount", "Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {receivedFiltered.length === 0 ? (
                  <tr><td colSpan={6} className="muted">{tx("acct.noPaymentsThisMonth", "No payments this month.")}</td></tr>
                ) : receivedFiltered.map((c) => (
                  <tr key={c.ref}>
                    <td>{dmy(c.ts)} <span className="muted">{hm(c.ts)}</span></td>
                    <td className="w-500"><DoctorLink id={c.doctorId} name={c.doctor} /></td>
                    <td>{c.rep}</td>
                    <td>{c.method === "cash" ? tx("acct.cash", "Cash") : tx("acct.transfer", "Transfer")}</td>
                    <td>
                      {c.photo
                        ? <a href={`/api/files?id=${c.photo}`} target="_blank" rel="noreferrer">{tx("acct.receipt", "receipt")}</a>
                        : <span style={{ color: "var(--c-amber-deep)" }}>{tx("acct.noPhoto", "no photo")}</span>}
                    </td>
                    <td className="ta-r hnum w-700">{money0(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="w-700">
                    {tx("coll.receivedCount", "{n} payments").replace("{n}", String(receivedFiltered.length))}
                  </td>
                  <td className="ta-r hnum w-700">{money0(receivedTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>) : null}

      {/* ═══════════ CASH CHECK ═══════════ */}
      {tab === "recon" ? (<>
        <div className="hint">
          {tx("coll.reconHint", "Per rep per day — match the cash column against what was physically handed in, then enter it in the accounting system.")}
        </div>
        <div className="card" style={{ gap: 6 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table fs-caption" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>{tx("acct.rep", "Rep")} / {tx("acct.date", "Date")}</th>
                  <th className="ta-r">{tx("acct.cash", "Cash")}</th>
                  <th className="ta-r">{tx("acct.transfer", "Transfer")}</th>
                  <th className="ta-r">{tx("acct.receipts", "Receipts")}</th>
                </tr>
              </thead>
              <tbody>
                {reconByRep.length === 0 ? (
                  <tr><td colSpan={4} className="muted">{tx("acct.noPaymentsThisMonth", "No payments this month.")}</td></tr>
                ) : reconByRep.map((g) => (
                  <FragmentRows key={g.rep} g={g} />
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="w-700">{tx("common.total", "Total")}</td>
                  <td className="ta-r hnum w-700">{money0(reconTotal.cash)}</td>
                  <td className="ta-r hnum w-700">{money0(reconTotal.transfer)}</td>
                  <td className="ta-r hnum w-700">{reconTotal.receipts}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>) : null}
    </Screen>
  );
}

/* One rep's block: subtotal row first (that is the number she checks the
 * envelope against), the day rows indented beneath it. */
function FragmentRows({ g }: { g: any }) {
  return (
    <>
      <tr style={{ background: "var(--color-neutral-200)" }}>
        <td className="w-700">{g.rep}</td>
        <td className="ta-r hnum w-700">{g.cash ? money0(g.cash) : "—"}</td>
        <td className="ta-r hnum w-700">{g.transfer ? money0(g.transfer) : "—"}</td>
        <td className="ta-r hnum w-700">{g.receipts}</td>
      </tr>
      {g.days.map((d: any, i: number) => (
        <tr key={i}>
          <td style={{ paddingInlineStart: 24 }} className="muted">{dmy(d.date)}</td>
          <td className="ta-r hnum">{d.cash ? money0(d.cash) : "—"}</td>
          <td className="ta-r hnum">{d.transfer ? money0(d.transfer) : "—"}</td>
          <td className="ta-r hnum">{d.receipts}</td>
        </tr>
      ))}
    </>
  );
}

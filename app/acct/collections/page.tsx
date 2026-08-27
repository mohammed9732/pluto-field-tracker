"use client";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { api, dmy, groupDigits, money, todayIso, ungroup } from "@/lib/fmt";
import { useT } from "@/lib/i18n";

/* The accountant's side of the collection schedule.
 *
 * One form to schedule an item — customer, who collects, date, amount,
 * invoice number typed off the paper invoice — and one list showing where
 * everything stands: due, missed (red), shortfall (amber), done.
 */
export default function AcctCollectionsPage() {
  const me = useMe();
  const tx = useT();
  const [data, setData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState({ doctorId: "", repId: "", date: "", amount: "", invoiceNo: "", note: "" });
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api("/api/collections").then(setData).catch(() => {});
    api("/api/doctors").then((r: any) => setDoctors(r.doctors)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;

  // Reps whose city matches the picked customer — narrowing the picker to the
  // people who can actually reach them.
  const pickedDoc = doctors.find((d) => d.id === Number(form.doctorId));
  const eligibleReps = (data.reps ?? []).filter(
    (r: any) => !pickedDoc || r.city === "all" || r.city === pickedDoc.city);

  async function create() {
    setErr(""); setSaved(false);
    try {
      await api("/api/collections", { json: { action: "create", ...form, amount: ungroup(form.amount) } });
      setForm({ doctorId: "", repId: "", date: "", amount: "", invoiceNo: "", note: "" });
      setSaved(true);
      load();
    } catch (e: any) { setErr(e?.message || "Could not schedule it"); }
  }

  const TAG: Record<string, [string, string]> = {
    missed: [tx("coll.missed", "Missed"), "tag-hot"],
    shortfall: [tx("coll.shortfall", "Shortfall"), "tag-warn"],
    done: [tx("coll.done", "Collected"), "tag-ok"],
    due: [tx("coll.due", "Due"), "tag-neutral"],
  };
  const stateOf = (c: any) =>
    c.status === "done" ? (c.shortfall ? "shortfall" : "done") : (c.missedFlagged ? "missed" : "due");

  return (
    <Screen me={me}>
      <PageHead title={tx("coll.scheduleTitle", "Collection schedule")} back="back" />

      {data.canEdit ? (
        <div className="card" style={{ gap: 10 }}>
          <h6 className="m0">{tx("coll.scheduleOne", "Schedule a collection")}</h6>
          <div className="two-col" style={{ gap: 10 }}>
            <div className="field m0">
              <label>{tx("coll.customer", "Customer")}</label>
              <select className="input" value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value, repId: "" })}>
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
              <input className="input" type="date" min={todayIso()} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field m0">
              <label>{tx("coll.amountIqd", "Amount (IQD)")}</label>
              <input className="input hnum" inputMode="numeric" placeholder="1,000,000" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: groupDigits(e.target.value) })} />
            </div>
            <div className="field m0">
              <label>{tx("coll.invoiceNo", "Invoice number")}</label>
              <input className="input" value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
            </div>
            <div className="field m0">
              <label>{tx("common.notes", "Note")}</label>
              <input className="input" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          {err ? <div className="tag tag-hot self-start">{err}</div> : null}
          {saved ? <div className="small" style={{ color: "var(--c-green-deep)" }}>{tx("coll.scheduled", "Scheduled — the rep has been notified.")}</div> : null}
          <button className="btn btn-primary" style={{ padding: 10, alignSelf: "flex-start", paddingInline: 24 }} onClick={create}>
            {tx("coll.schedule", "Schedule")}
          </button>
        </div>
      ) : null}

      <div className="card" style={{ gap: 6 }}>
        <h6 className="m0">{tx("coll.allItems", "All scheduled collections")}</h6>
        {data.rows.length === 0 ? <div className="small muted">{tx("coll.noneYet", "Nothing scheduled yet.")}</div> : null}
        {data.rows.map((c: any) => {
          const st = stateOf(c);
          return (
            <div key={c.id} className="listrow" style={{ alignItems: "center", gap: 10 }}>
              <div className="f1min">
                <div className="fs-small w-500">{c.doctorName} <span className="muted">← {c.repName}</span></div>
                <div className="small muted">
                  {dmy(c.date)}{c.invoiceNo ? ` · ${tx("coll.invoice", "invoice")} ${c.invoiceNo}` : ""}
                  {c.status === "done" && c.shortfall
                    ? ` · ${tx("coll.gotOf", "got {a} of {b}").replace("{a}", money(c.collectedAmount ?? 0)).replace("{b}", money(c.amount))}`
                    : ""}
                </div>
              </div>
              <span className="hnum fs-small" style={{ fontWeight: 700 }}>{money(c.amount)}</span>
              <span className={`tag ${TAG[st][1]}`}>{TAG[st][0]}</span>
              {data.canEdit && c.status === "due" ? (
                <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                  onClick={async () => { await api("/api/collections", { json: { action: "delete", id: c.id } }); load(); }}>
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

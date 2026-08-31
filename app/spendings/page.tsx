"use client";
import { openImage } from "@/components/Lightbox";
import { useCallback, useEffect, useState } from "react";
import { compressImage } from "@/lib/image";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, groupDigits, money, ungroup } from "@/lib/fmt";

const TYPES: [string, string][] = [["gas", "Gas / transport"], ["food", "Food"], ["gifts", "Gifts / samples"], ["accommodation", "Accommodation"], ["other", "Other"]];
const STATUS_TAG: Record<string, [string, string]> = {
  pending: ["Pending", "tag-warn"],
  supervisor_ok: ["Supervisor OK", "tag-accent"],
  approved: ["Approved", "tag-ok"],
  rejected: ["Rejected", "tag-hot"],
  paid: ["Paid back", "tag-ok"],
};

export default function Spendings() {
  const tx = useT();
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("gas");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; name: string } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isApprover = me && (me.role === "supervisor" || me.role === "accountant" || me.role === "admin");

  const load = useCallback(() => {
    api("/api/spendings?scope=mine").then(setData).catch(() => {});
    if (isApprover) api("/api/spendings?scope=approvals").then((r: any) => setApprovals(r.spendings ?? [])).catch(() => {});
  }, [isApprover]);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  if (!data.enabled) return <Screen me={me}><div className="card muted">{tx("spend.spendingsAreSwitchedOff", "Spendings are switched off by the admin.")}</div></Screen>;

  async function attachReceipt(raw: File) {
    const file = await compressImage(raw);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
    if (r.id) setReceipt({ id: r.id, name: file.name });
  }

  async function submit() {
    setErr("");
    const amt = Math.round(Number(amount.replace(/,/g, "")));
    if (!(amt > 0)) { setErr("Enter the amount in IQD"); return; }
    setBusy(true);
    try {
      await api("/api/spendings", { json: { action: "add", amount: amt, type, note, receipt: receipt?.id ?? null } });
      setAmount(""); setNote(""); setReceipt(null);
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function decide(id: number, decision: "approve" | "reject") {
    let note: string | undefined;
    if (decision === "reject") {
      note = window.prompt("Why is it rejected?") ?? undefined;
      if (!note) return;
    }
    await api("/api/spendings", { json: { action: "decide", id, decision, note } });
    load();
  }

  const mineApprovals = approvals.filter((s: any) => s.userId !== me.id);

  return (
    <Screen me={me}>
      <h4 className="m0">{tx("spend.spendings", "Spendings")}</h4>

      <div className="card gap-3">
        <div className="two-3">
          <div className="field m0">
            <label>{tx("spend.amountIqd", "Amount (IQD)")}</label>
            <input className="input hnum" inputMode="numeric" placeholder="25,000" value={amount} onChange={(e) => setAmount(groupDigits(e.target.value))} style={{ fontSize: 16 }} />
          </div>
          <div className="field m0">
            <label>{tx("spend.type", "Type")}</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="field m0">
          <label>{tx("spend.note", "Note")}</label>
          <input className="input" placeholder={tx("spend.eGFuelForPh", "e.g. fuel for the Soran circuit")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
          <Icon d={paths.file} size={15} stroke={receipt ? "var(--c-green-deep)" : "var(--color-neutral-500)"} />
          <span style={{ flex: 1, color: receipt ? "var(--c-green-deep)" : "var(--color-neutral-600)" }}>
            {receipt ? `Receipt attached — ${receipt.name}` : "Attach receipt photo"}
          </span>
          <input type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && attachReceipt(e.target.files[0])} />
        </label>
        {err ? <div className="tag tag-hot self-start">{err}</div> : null}
        <button className="btn btn-primary btn-block" style={{ padding: 11 }} onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Log spending"}
        </button>
        <div className="hint">{tx("spend.approvedSpendingsArePaid", "Approved spendings are paid back at the end of the month.")}</div>
      </div>

      {isApprover && mineApprovals.length ? (
        <div className="stack-2">
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("spend.waitingForYourDecision", "Waiting for your decision")}</h6>
          {mineApprovals.map((s: any) => (
            <div key={s.id} className="card" style={{ gap: 8, padding: 12 }}>
              <div className="row gap-2">
                <div className="f1">
                  <div className="fs-small w-500">{s.userName} · {TYPES.find(([v]) => v === s.type)?.[1]}</div>
                  <div className="small muted">{dmy(s.date)}{s.note ? ` · ${s.note}` : ""}</div>
                </div>
                <span className="hnum fs-body">{money(s.amount)}</span>
              </div>
              {s.receipt ? <a className="small" href="#" onClick={(e) => { e.preventDefault(); openImage(`/api/files?id=${s.receipt}`); }}>{tx("spend.viewReceipt", "View receipt")}</a> : <span className="small" style={{ color: "var(--c-amber-deep)" }}>{tx("spend.noReceiptAttached", "No receipt attached")}</span>}
              <div className="two">
                <button className="btn btn-primary" style={{ padding: 8 }} onClick={() => decide(s.id, "approve")}>{tx("spend.approve", "Approve")}</button>
                <button className="btn btn-secondary" style={{ padding: 8 }} onClick={() => decide(s.id, "reject")}>{tx("spend.reject", "Reject…")}</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="stack-2">
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("spend.mySpendings", "My spendings")}</h6>
        {data.spendings.length === 0 ? <div className="small muted">{tx("spend.nothingLoggedYet", "Nothing logged yet.")}</div> : null}
        {data.spendings.map((s: any) => (
          <div key={s.id} className="listrow py-2">
            <div className="f1min">
              <div className="fs-small">{TYPES.find(([v]) => v === s.type)?.[1]} · {dmy(s.date)}</div>
              <div className="small muted">{s.note}{s.status === "rejected" && s.decideNote ? ` — "${s.decideNote}"` : ""}</div>
            </div>
            <span className="hnum fs-body">{money(s.amount)}</span>
            <span className={`tag ${STATUS_TAG[s.status][1]}`}>{STATUS_TAG[s.status][0]}</span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
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
  if (!data.enabled) return <Screen me={me}><div className="card muted">Spendings are switched off by the admin.</div></Screen>;

  async function attachReceipt(file: File) {
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
      <h4 style={{ margin: 0 }}>Spendings</h4>

      <div className="card" style={{ gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Amount (IQD)</label>
            <input className="input hnum" inputMode="numeric" placeholder="25,000" value={amount} onChange={(e) => setAmount(groupDigits(e.target.value))} style={{ fontSize: 16 }} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Note</label>
          <input className="input" placeholder="e.g. fuel for the Soran circuit" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
          <Icon d={paths.file} size={15} stroke={receipt ? "var(--c-green-deep)" : "var(--color-neutral-500)"} />
          <span style={{ flex: 1, color: receipt ? "var(--c-green-deep)" : "var(--color-neutral-600)" }}>
            {receipt ? `Receipt attached — ${receipt.name}` : "Attach receipt photo"}
          </span>
          <input type="file" accept="image/*,.pdf" capture="environment" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && attachReceipt(e.target.files[0])} />
        </label>
        {err ? <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>{err}</div> : null}
        <button className="btn btn-primary btn-block" style={{ padding: 11 }} onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Log spending"}
        </button>
        <div className="hint">Approved spendings are paid back at the end of the month.</div>
      </div>

      {isApprover && mineApprovals.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>Waiting for your decision</h6>
          {mineApprovals.map((s: any) => (
            <div key={s.id} className="card" style={{ gap: 8, padding: 12 }}>
              <div className="row" style={{ gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.userName} · {TYPES.find(([v]) => v === s.type)?.[1]}</div>
                  <div className="small muted">{dmy(s.date)}{s.note ? ` · ${s.note}` : ""}</div>
                </div>
                <span className="hnum" style={{ fontSize: 15 }}>{money(s.amount)}</span>
              </div>
              {s.receipt ? <a className="small" href={`/api/files?id=${s.receipt}`} target="_blank">View receipt</a> : <span className="small" style={{ color: "var(--c-amber-deep)" }}>No receipt attached</span>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="btn btn-primary" style={{ padding: 8 }} onClick={() => decide(s.id, "approve")}>Approve</button>
                <button className="btn btn-secondary" style={{ padding: 8 }} onClick={() => decide(s.id, "reject")}>Reject…</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>My spendings</h6>
        {data.spendings.length === 0 ? <div className="small muted">Nothing logged yet.</div> : null}
        {data.spendings.map((s: any) => (
          <div key={s.id} className="listrow" style={{ padding: "8px 0" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>{TYPES.find(([v]) => v === s.type)?.[1]} · {dmy(s.date)}</div>
              <div className="small muted">{s.note}{s.status === "rejected" && s.decideNote ? ` — "${s.decideNote}"` : ""}</div>
            </div>
            <span className="hnum" style={{ fontSize: 15 }}>{money(s.amount)}</span>
            <span className={`tag ${STATUS_TAG[s.status][1]}`}>{STATUS_TAG[s.status][0]}</span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

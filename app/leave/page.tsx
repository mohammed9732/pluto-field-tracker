"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dm } from "@/lib/fmt";

const TAG: Record<string, [string, string]> = {
  approved: ["Approved", "tag-ok"],
  pending: ["Pending", "tag-warn"],
  rejected: ["Rejected", "tag-hot"],
};

export default function LeavePage() {
  const tx = useT();
  const me = useMe();
  const [leaves, setLeaves] = useState<any[] | null>(null);
  const [type, setType] = useState("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ leaves: any[] }>("/api/leaves?scope=mine").then((r) => setLeaves(r.leaves)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !leaves) return <Spinner />;

  async function submit() {
    setErr("");
    if (!start || !end || end < start) { setErr("Pick valid dates"); return; }
    setBusy(true);
    try {
      await api("/api/leaves", { json: { action: "request", type, start, end, reason } });
      setStart(""); setEnd(""); setReason("");
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen me={me}>
      <h4 className="m0">{tx("leave.leave", "Leave")}</h4>
      <div className="field m0">
        <label>{tx("leave.type", "Type")}</label>
        <div className="seg">
          {[["annual", "Annual"], ["sick", "Sick"]].map(([v, l]) => (
            <label key={v} className="seg-opt">
              <input type="radio" name="lt" checked={type === v} onChange={() => setType(v)} />{l}
            </label>
          ))}
        </div>
      </div>
      <div className="two-3">
        <div className="field m0"><label>{tx("leave.from", "From")}</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="field m0"><label>To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      <div className="field m0"><label>{tx("leave.reason", "Reason")}</label><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: 60 }} /></div>
      {err ? <div className="tag tag-hot self-start">{err}</div> : null}
      <button className="btn btn-primary btn-block" style={{ padding: 12 }} onClick={submit} disabled={busy}>{tx("leave.requestLeave", "Request leave")}</button>
      <div className="hint">
        Annual leave must be requested at least 1 week ahead. Approved days are excluded from your visit minimums.{" "}
        {me.role === "rep" ? "Reps' leaves are approved by the supervisor." : "Yours is approved by the owner."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("leave.myRequests", "My requests")}</h6>
        {leaves.map((l) => (
          <div key={l.id} className="listrow py-2">
            <div className="f1">
              <div className="fs-small">{dm(l.start)} → {dm(l.end)} · {l.type[0].toUpperCase() + l.type.slice(1)}</div>
              <div className="small muted">{l.decidedByName ? `Decided by ${l.decidedByName}` : "Awaiting decision"}</div>
            </div>
            <span className={`tag ${TAG[l.status][1]}`}>{TAG[l.status][0]}</span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

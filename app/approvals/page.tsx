"use client";
import { MascotNote } from "@/components/MascotNote";
import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dm, dmy, hm, money } from "@/lib/fmt";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

type Tab = "orders" | "plans" | "leaves";

export default function Approvals() {
  const tx = useT();
  const me = useMe();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api("/api/orders?scope=pending"),
      api("/api/plans?scope=all"),
      api("/api/leaves?scope=approvals"),
    ]).then(([o, p, l]: any[]) => {
      setOrders(o.orders);
      setPlans(p.plans);
      setLeaves(l.leaves);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);
  useEffect(load, [load]);

  if (!me || !loaded) return <Spinner />;

  const pendingPlans = plans.filter((p) => p.status === "submitted");
  const decidedPlans = plans.filter((p) => p.status !== "submitted").slice(0, 3);
  const pendingLeaves = leaves.filter((l) => l.status === "pending");

  async function decideOrder(o: any, action: "approve" | "reject") {
    let note: string | undefined;
    if (action === "reject") {
      note = window.prompt("Rejection note (required):") ?? undefined;
      if (!note) return;
    }
    const priceEdits = o.items.map((it: any) => ({
      productId: it.productId,
      price: parseFloat(prices[`${o.id}-${it.productId}`] ?? "") || it.price,
    }));
    await api("/api/orders", { json: { action, id: o.id, note, prices: priceEdits } });
    load();
  }

  async function decidePlan(p: any, decision: "approve" | "return") {
    let note: string | undefined;
    if (decision === "return") {
      note = window.prompt("Note to the rep (required):") ?? undefined;
      if (!note) return;
    }
    await api("/api/plans", { json: { action: "decide", id: p.id, decision, note } });
    load();
  }

  async function decideLeave(l: any, decision: "approve" | "reject") {
    await api("/api/leaves", { json: { action: "decide", id: l.id, decision } });
    load();
  }

  return (
    <Screen me={me}>
      <h4 className="m0">{tx("appr.approvals", "Approvals")}</h4>
      {orders.length + pendingPlans.length + pendingLeaves.length > 0 ? (
        <div className="row" style={{ gap: 8, padding: "10px 12px", background: "var(--c-coral-soft)", borderRadius: 14, fontSize: 13, fontWeight: 600, color: "var(--c-coral-deep)" }}>
          {/* One phrase per item with the number inside it — Arabic cannot be
              assembled from "order" + "s". */}
          ⏱ {tx("appr.waitingOnYou", "Waiting on you")}: {[
            orders.length ? tx("appr.nOrders", "{n} orders").replace("{n}", String(orders.length)) : "",
            pendingPlans.length ? tx("appr.nPlans", "{n} plans").replace("{n}", String(pendingPlans.length)) : "",
            pendingLeaves.length ? tx("appr.nLeaves", "{n} leave requests").replace("{n}", String(pendingLeaves.length)) : "",
          ].filter(Boolean).join(" · ")}
        </div>
      ) : null}
      <div className="seg" style={{ width: "100%" }}>
        {([["orders", `Orders${orders.length ? ` · ${orders.length}` : ""}`], ["plans", `Plans${pendingPlans.length ? ` · ${pendingPlans.length}` : ""}`], ["leaves", `Leaves${pendingLeaves.length ? ` · ${pendingLeaves.length}` : ""}`]] as [Tab, string][]).map(([t, label]) => (
          <label key={t} className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="tab" checked={tab === t} onChange={() => setTab(t)} />{label}
          </label>
        ))}
      </div>

      {tab === "orders" ? (
        <>
          {orders.length === 0 ? (
            <MascotNote mood="cheer" tone="win" size={62} title={tx("appr.nothingWaitingOnYouPh", "Nothing waiting on you")}
              body="Every order has been dealt with." />
          ) : null}
          {orders.map((o) => (
            <div key={o.id} className="card gap-3">
              <div className="row gap-3">
                <div className="f1">
                  <div className="fs-small w-500"><DoctorLink id={o.doctor?.id} name={o.doctor?.name ?? "?"} /></div>
                  <div className="small muted">by {o.createdByName} · {dmy(o.createdAt)} {hm(o.createdAt)}</div>
                </div>
                {o.isSample
                  ? <span className="tag" style={{ background: "var(--c-violet-soft)", color: "var(--c-violet-deep)" }}>FREE SAMPLE</span>
                  : <span className="hnum fs-lead">{money(o.total)}</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {o.items.map((it: any) => (
                  <div key={it.productId} className="row gap-2">
                    <span className="f1">{it.qty} × {it.productName}</span>
                    <input
                      className="input"
                      defaultValue={it.price}
                      onChange={(e) => setPrices((p) => ({ ...p, [`${o.id}-${it.productId}`]: e.target.value }))}
                      style={{ width: 76, minHeight: 24, padding: "2px 6px", fontSize: 12 }}
                      inputMode="numeric"
                    />
                    <span className="small muted">IQD</span>
                    <span style={{ width: 64, textAlign: "right" }}>{money(it.qty * (parseFloat(prices[`${o.id}-${it.productId}`] ?? "") || it.price))}</span>
                  </div>
                ))}
              </div>
              {o.items.some((it: any) => it.price !== it.listPrice) ? (
                <div className="small muted">
                  {o.items.filter((it: any) => it.price !== it.listPrice).map((it: any) =>
                    `${it.productName} at ${money(it.price)} (base ${money(it.listPrice)})`).join(" · ")} — quantity tier pricing; you can still adjust.
                </div>
              ) : null}
              <div className="two">
                <button className="btn btn-primary" style={{ padding: 11 }} onClick={() => decideOrder(o, "approve")}>{tx("appr.approve", "Approve")}</button>
                <button className="btn btn-secondary" style={{ padding: 11 }} onClick={() => decideOrder(o, "reject")}>{tx("appr.reject", "Reject…")}</button>
              </div>
            </div>
          ))}
          <div className="hint mt-auto">
            You or the owner approve; approved orders go to the accountant for invoicing. Every price edit is snapshotted.
          </div>
        </>
      ) : null}

      {tab === "plans" ? (
        <>
          {pendingPlans.length === 0 ? <div className="card muted">{tx("appr.noPlansWaiting", "No plans waiting.")}</div> : null}
          {pendingPlans.map((p) => (
            <div key={p.id} className="card gap-3">
              <div className="row gap-3">
                <div className="f1">
                  <div className="fs-small w-500">{p.userName}</div>
                  <div className="small muted">week of Sat {dm(p.weekStart)} · {p.totalVisits} visits planned</div>
                </div>
                <span className="hnum" style={{ fontSize: 18, color: "var(--color-accent-700)" }}>{p.totalVisits}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "var(--color-neutral-700)" }}>
                {p.days.map((d: any) => (
                  <div key={d.day} style={{ display: "flex", gap: 8 }}>
                    <b className="hnum" style={{ width: 34, flex: "none" }}>{d.day}</b>
                    <div className="f1min">
                      <div>
                        {d.cityLabel || d.area || <span className="muted">—</span>}
                        {d.jointWithName ? <span style={{ color: "var(--color-accent-700)" }}> · with {d.jointWithName}</span> : null}
                        {d.note ? <span style={{ color: "var(--color-accent-700)" }}> ({d.note})</span> : null}
                      </div>
                      {d.doctorNames?.length ? <div className="small muted">{d.doctorNames.join(" · ")}{d.backupNames?.length ? ` (+${d.backupNames.length} backup)` : ""}</div> : null}
                    </div>
                    <span>{d.doctorIds?.length || d.visits || ""}</span>
                  </div>
                ))}
              </div>
              {p.attachment ? <div className="small muted">📎 {p.attachment}</div> : null}
              <div className="two">
                <button className="btn btn-primary" style={{ padding: 11 }} onClick={() => decidePlan(p, "approve")}>{tx("appr.approve", "Approve")}</button>
                <button className="btn btn-secondary" style={{ padding: 11 }} onClick={() => decidePlan(p, "return")}>{tx("appr.return", "Return…")}</button>
              </div>
            </div>
          ))}
          {decidedPlans.map((p) => (
            <div key={p.id} className="listrow py-2">
              <div className="f1">
                <div className="fs-small">{p.userName} · week of {dm(p.weekStart)}</div>
                <div className="small muted">{p.totalVisits} visits</div>
              </div>
              <span className={`tag ${p.status === "approved" ? "tag-ok" : "tag-hot"}`}>{p.status === "approved" ? "Approved" : "Returned"}</span>
            </div>
          ))}
          <div className="hint mt-auto">
            Returned plans go back to the rep with your note. Approved plans become their route.
          </div>
        </>
      ) : null}

      {tab === "leaves" ? (
        <>
          {pendingLeaves.length === 0 ? <div className="card muted">{tx("appr.noLeaveRequestsWaiting", "No leave requests waiting.")}</div> : null}
          {pendingLeaves.map((l) => (
            <div key={l.id} className="card gap-3">
              <div className="f1">
                <div className="fs-small w-500">{l.userName} · {l.userCity[0]?.toUpperCase()}{l.userCity.slice(1)}</div>
                <div className="small muted">{l.type[0].toUpperCase() + l.type.slice(1)} · {dm(l.start)} → {dm(l.end)}</div>
              </div>
              {l.reason ? <div style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>&quot;{l.reason}&quot;</div> : null}
              <div className="two">
                <button className="btn btn-primary" style={{ padding: 9 }} onClick={() => decideLeave(l, "approve")}>{tx("appr.approve", "Approve")}</button>
                <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => decideLeave(l, "reject")}>{tx("appr.reject", "Reject…")}</button>
              </div>
            </div>
          ))}
          <div className="stack-2">
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("appr.decidedRecently", "Decided recently")}</h6>
            {leaves.filter((l) => l.status !== "pending").slice(0, 5).map((l) => (
              <div key={l.id} className="listrow py-2">
                <div className="f1">
                  <div className="fs-small">{l.userName} · {dm(l.start)} → {dm(l.end)}</div>
                  <div className="small muted">{l.type}</div>
                </div>
                <span className={`tag ${l.status === "approved" ? "tag-ok" : "tag-hot"}`}>{l.status}</span>
              </div>
            ))}
          </div>
          <div className="hint mt-auto">
            {me.role === "supervisor" ? "You approve rep leaves; the owner approves yours and the accountant's." : "You approve everyone below you."}
            {" "}Approved days are excluded from visit minimums.
          </div>
        </>
      ) : null}
    </Screen>
  );
}

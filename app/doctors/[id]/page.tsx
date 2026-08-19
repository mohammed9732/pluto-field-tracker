"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, hm, money } from "@/lib/fmt";
import { getPosition } from "@/lib/geo";

const STATUS_TAG: Record<string, [string, string]> = {
  pending: ["Pending", "tag-warn"], approved: ["Approved", "tag-ok"],
  invoiced: ["Invoiced", "tag-chat"], rejected: ["Rejected", "tag-hot"],
};
const OUTCOME: Record<string, string> = { order: "Order", follow_up: "Follow-up", payment: "Payment" };

export default function DoctorProfile() {
  const me = useMe();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState("");
  const [tab, setTab] = useState<"history" | "orders" | "money">("history");

  const load = useCallback(() => {
    api(`/api/doctors?id=${id}`).then(setData).catch((e: any) => setFailed(e?.message || "Could not open this doctor"));
  }, [id]);
  useEffect(load, [load]);

  // Reps are scoped to their own city, so a stale link to another city's doctor
  // lands here. Say so and offer the way back instead of spinning forever.
  if (me && failed) {
    return (
      <Screen me={me}>
        <div className="card" style={{ gap: 10 }}>
          <h4 style={{ margin: 0 }}>Doctor not available</h4>
          <div className="small muted">
            This doctor is not on your list. Reps only see doctors in their own city —
            ask your supervisor if you think that is wrong.
          </div>
          <Link className="btn btn-secondary" href="/doctors" style={{ padding: 9, textAlign: "center" }}>
            Back to my doctors
          </Link>
        </div>
      </Screen>
    );
  }

  if (!me || !data) return <Spinner />;
  const d = data.doctor;
  const canEditPin = me.role === "supervisor" || me.role === "admin";

  async function setPin() {
    const p = await getPosition();
    if (p.lat == null) { alert("GPS unavailable right now."); return; }
    await api("/api/doctors", { json: { action: "setLocation", id: d.id, lat: p.lat, lng: p.lng } });
    load();
  }

  return (
    <Screen me={me}>
      <PageHead title={d.name} back="back" right={<span className={`tag ${d.class === "A" ? "tag-accent" : "tag-neutral"}`}>Class {d.class}</span>} />
      <div className="card" style={{ gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{d.clinic}</div>
        <div className="small muted">{d.specialty} · {d.area}{d.address ? ` · ${d.address}` : ""}</div>
        {d.phone ? <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="small">{d.phone}</a> : null}
        <div className="row" style={{ gap: 6 }}>
          <Icon d={paths.pinDot} size={14} stroke={d.lat != null ? "var(--color-accent)" : "var(--color-neutral-400)"} />
          <span className="small muted" style={{ flex: 1 }}>{d.lat != null ? "Clinic pin saved" : "No clinic pin yet"}</span>
          {(d.lat == null || canEditPin) ? (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={setPin}>{d.lat == null ? "Set location" : "Correct pin"}</button>
          ) : null}
        </div>
      </div>

      {data.potentialMonthly > 0 ? (
        <div className="card" style={{ gap: 6 }}>
          <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
            <h6 style={{ margin: 0, flex: 1 }}>This month vs potential</h6>
            <span className="hnum" style={{ fontSize: 18 }}>{money(data.monthValue)}</span>
            <span className="small muted">of {money(data.potentialMonthly)}</span>
          </div>
          <div className="meter">
            <div className="fill" style={{
              width: `${Math.min(100, Math.round((data.monthValue / data.potentialMonthly) * 100))}%`,
              background: data.monthValue >= data.potentialMonthly ? "var(--c-green)" : undefined,
            }} />
          </div>
          <div className="small muted">
            {Math.round((data.monthValue / data.potentialMonthly) * 100)}% of what this doctor should buy in a month.
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Lifetime sales</div>
          <div className="hnum" style={{ fontSize: 20 }}>{money(data.lifetimeValue)}</div>
        </div>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-green-deep)" }}>Collected</div>
          <div className="hnum" style={{ fontSize: 20 }}>{money(data.totalCollected)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: data.lastOrderItems ? "1fr 1fr" : "1fr", gap: 8 }}>
        <Link href={`/visit?doctorId=${d.id}`} className="btn btn-primary" style={{ padding: 11, fontSize: 13 }}>＋ Log visit</Link>
        {data.lastOrderItems ? (
          <Link href={`/order?doctorId=${d.id}&reorder=1`} className="btn btn-secondary" style={{ padding: 11, fontSize: 13 }}>Reorder last</Link>
        ) : null}
      </div>

      {data.competitors?.length ? (
        <div className="card" style={{ gap: 6 }}>
          <h6 style={{ margin: 0 }}>Competitors at this clinic</h6>
          {data.competitors.slice(0, 4).map((c: any) => (
            <div key={c.id} className="small" style={{ color: "var(--color-neutral-700)" }}>
              <b>{c.competitor}</b>{c.product ? ` · ${c.product}` : ""}{c.price ? ` · ${money(c.price)}` : ""}
              {c.note ? ` — ${c.note}` : ""} <span className="muted">({c.byName}, {dmy(c.ts)})</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="seg" style={{ width: "100%" }}>
        {([["history", `Visits · ${data.visits.length}`], ["orders", `Orders · ${data.orders.length}`], ["money", "Payments"]] as const).map(([t, label]) => (
          <label key={t} className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="dtab" checked={tab === t} onChange={() => setTab(t)} />{label}
          </label>
        ))}
      </div>

      {tab === "history" ? (
        <>
          {Object.keys(data.visitCounts).length ? (
            <div className="small muted">Visited by: {Object.entries(data.visitCounts).map(([n, c]) => `${n} ×${c}`).join(" · ")}</div>
          ) : null}
          {data.visits.map((v: any) => (
            <div key={v.id} className="listrow" style={{ alignItems: "flex-start" }}>
              <div style={{ width: 74, flex: "none" }}>
                <div className="small" style={{ color: "var(--color-neutral-500)" }}>{dmy(v.date)}</div>
                <div className="small muted">{v.time}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{OUTCOME[v.outcome] ?? v.outcome} · <span className="muted">{v.byName}</span></div>
                {v.notes ? <div className="small muted">{v.notes}</div> : null}
                {v.photo ? <img src={`/api/files?id=${v.photo}`} alt="visit" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 4, maxHeight: 140, objectFit: "cover" }} /> : null}
              </div>
            </div>
          ))}
          {data.visits.length === 0 ? <div className="small muted">No visits yet.</div> : null}
        </>
      ) : null}

      {tab === "orders" ? (
        <>
          {data.orders.map((o: any) => (
            <div key={o.id} className="listrow">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{dmy(o.createdAt)} · {o.items.map((it: any) => `${it.qty}× ${it.name}`).join(", ")}</div>
                <div className="small muted">{o.byName}{o.invoicePdfName ? " · invoice attached" : ""}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span className="hnum" style={{ fontSize: 14 }}>{money(o.total)}</span>
                <span className={`tag ${STATUS_TAG[o.status][1]}`}>{STATUS_TAG[o.status][0]}</span>
              </div>
            </div>
          ))}
          {data.orders.length === 0 ? <div className="small muted">No orders yet.</div> : null}
        </>
      ) : null}

      {tab === "money" ? (
        <>
          {data.payments.map((p: any) => (
            <div key={p.id} className="listrow">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{p.method === "cash" ? "Cash" : "Transfer"}{p.note ? ` · ${p.note}` : ""}</div>
                <div className="small muted">{dmy(p.ts)} {hm(p.ts)} · {p.byName}</div>
              </div>
              <span className="hnum" style={{ fontSize: 14 }}>{money(p.amount)}</span>
            </div>
          ))}
          {data.payments.length === 0 ? <div className="small muted">No payments recorded.</div> : null}
        </>
      ) : null}
    </Screen>
  );
}

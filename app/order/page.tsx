"use client";
import { enqueue, isOffline, newRef } from "@/lib/outbox";
import { useT } from "@/lib/i18n";
import { useTerms, lower } from "@/lib/terms";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { DoctorPicker, DoctorCard, Doc } from "@/components/DoctorPicker";
import { api, money } from "@/lib/fmt";

interface Line { productId: number; name: string; unit: string; listPrice: number; tiers: { minQty: number; price: number }[]; price: string; qty: number }

// Tier price for a quantity — matches the server's rule.
function tierPrice(l: Line, qty: number): number {
  let price = l.listPrice;
  for (const t of l.tiers) if (qty >= t.minQty && t.price < price) price = t.price;
  return price;
}

function NewOrderInner() {
  const tx = useT();
  const me = useMe();
  const t = useTerms();
  const router = useRouter();
  const params = useSearchParams();
  const [doctor, setDoctor] = useState<Doc | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [canEditPrice, setCanEditPrice] = useState(false);
  const [samplesOn, setSamplesOn] = useState(false);
  const [isSample, setIsSample] = useState(false);

  useEffect(() => {
    api("/api/settings").then((r: any) => { setCanEditPrice(!!r.settings.repPriceEdit); setSamplesOn(!!r.settings.samplesEnabled); }).catch(() => {});
    const docId = params.get("doctorId");
    const reorder = params.get("reorder");
    api<{ products: any[] }>("/api/targets").then(async (r) => {
      let lines: Line[] = r.products.map((p) => ({
        productId: p.id, name: p.name, unit: p.unit, listPrice: p.unitPrice,
        tiers: p.tiers ?? [], price: "", qty: 0,
      }));
      if (docId && reorder) {
        try {
          const prof = await api<any>(`/api/doctors?id=${docId}`);
          for (const it of prof.lastOrderItems ?? []) {
            lines = lines.map((l) => (l.productId === it.productId ? { ...l, qty: it.qty } : l));
          }
        } catch {}
      }
      setLines(lines);
    }).catch(() => {});
    if (docId) {
      api<{ doctors: Doc[] }>("/api/doctors").then((r) => {
        const d = r.doctors.find((x) => x.id === Number(docId));
        if (d) setDoctor(d);
      }).catch(() => {});
    }
  }, [params]);

  if (!me) return <Spinner />;
  // The server refuses a rep's order at a red customer; say so up front
  // rather than letting them build a basket that bounces. Supervisors and
  // the owner pass — the banner tells them they are ordering past the limit.
  const ceilingRed = (doctor as any)?.ceiling?.level === "red";
  const repBlocked = ceilingRed && me.role === "rep";

  const effective = (l: Line) => (isSample ? 0 : l.price.trim() !== "" ? parseFloat(l.price.replace(/,/g, "")) || 0 : tierPrice(l, l.qty));
  const total = lines.reduce((s, l) => s + l.qty * effective(l), 0);

  function bump(i: number, delta: number) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, qty: Math.max(0, l.qty + delta) } : l)));
  }

  async function submit() {
    setErr("");
    if (!doctor) { setErr(`Pick a ${lower(t.doctor)}`); return; }
    if (lines.every((l) => l.qty === 0)) { setErr("Add at least one product"); return; }
    setBusy(true);
    try {
      const body = {
        action: "create", doctorId: doctor.id, isSample, clientRef: newRef(),
        items: lines.filter((l) => l.qty > 0).map((l) => ({
          productId: l.productId, qty: l.qty,
          price: l.price.trim() !== "" ? parseFloat(l.price.replace(/,/g, "")) : null,
        })),
      };
      try {
        await api("/api/orders", { json: body });
      } catch (netErr) {
        if (!isOffline(netErr)) throw netErr;
        enqueue("/api/orders", body, `Order — ${doctor.name}`);
        alert("No signal. The order is saved on your phone and will send itself as soon as you are back online.");
      }
      router.push("/orders");
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Screen me={me}>
      <PageHead title={tx("neworder.newOrderPh", "New order")} back="back" />
      {!doctor ? (
        <DoctorPicker onPick={setDoctor} allowAdd />
      ) : (
        <>
          <DoctorCard doctor={doctor} onChange={() => setDoctor(null)} />
          {ceilingRed ? (
            <div className="card" style={{ borderColor: "var(--c-coral)", gap: 4 }}>
              <div className="fs-small w-500" style={{ color: "var(--c-coral-deep)" }}>
                {tx("neworder.ceilingReached", "This customer has reached their sales ceiling.")}
              </div>
              <div className="small muted">
                {me.role === "rep"
                  ? tx("neworder.ceilingRep", "It reopens when they pay down their balance — or ask your supervisor.")
                  : tx("neworder.ceilingOverride", "You can still place this order — it goes past the limit knowingly.")}
              </div>
            </div>
          ) : null}
          {samplesOn ? (
            <label className="row" style={{
              gap: 10, padding: "10px 12px", borderRadius: 14, cursor: "pointer",
              border: `1px solid ${isSample ? "var(--c-violet)" : "var(--color-divider)"}`,
              background: isSample ? "var(--c-violet-soft)" : undefined,
            }}>
              <input type="checkbox" checked={isSample} onChange={(e) => setIsSample(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--c-violet)" }} />
              <div className="f1">
                <div style={{ fontSize: 13, fontWeight: 500, color: isSample ? "var(--c-violet-deep)" : undefined }}>{tx("neworder.freeSample", "Free sample")}</div>
                <div className="small" style={{ color: isSample ? "var(--c-violet-deep)" : "var(--color-neutral-600)" }}>
                  Price is 0 · stock still leaves the warehouse · does not count toward targets
                </div>
              </div>
            </label>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {lines.map((l, i) => (
              <div key={l.productId} className="listrow" style={{ padding: "10px 0" }}>
                <div className="f1min">
                  <div className="fs-small w-500">{l.name}</div>
                  <div className="row" style={{ gap: 5, fontSize: 12, color: "var(--color-neutral-600)" }}>
                    {canEditPrice ? (
                      <input
                        className="input"
                        value={l.price}
                        placeholder={String(tierPrice(l, l.qty).toLocaleString())}
                        onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                        style={{ width: 74, minHeight: 24, padding: "2px 6px", fontSize: 12 }}
                        inputMode="numeric"
                      />
                    ) : (
                      <b style={{ color: isSample ? "var(--c-violet-deep)" : l.qty > 0 ? "var(--color-accent-700)" : "var(--color-neutral-600)" }}>
                        {isSample ? "FREE" : tierPrice(l, l.qty).toLocaleString()}
                      </b>
                    )}
                    <span>IQD / {l.unit}{l.tiers.length ? ` · ${l.tiers.map((t) => `${t.minQty}+ ${t.price.toLocaleString()}`).join(" · ")}` : ""}</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-icon" style={{ }} onClick={() => bump(i, -1)}>−</button>
                <span className="hnum" style={{ width: 28, textAlign: "center", fontSize: 18, color: l.qty > 0 ? "var(--color-accent-700)" : "var(--color-neutral-400)" }}>{l.qty}</span>
                <button className="btn btn-secondary btn-icon" style={{ }} onClick={() => bump(i, 1)}>＋</button>
              </div>
            ))}
          </div>
          <div className="row" style={{ alignItems: "baseline", marginTop: "auto" }}>
            <span style={{ flex: 1, fontSize: 13, color: "var(--color-neutral-600)" }}>{isSample ? "Sample request — no charge" : "Order total — prices follow the quantity tiers"}</span>
            <span className="hnum fs-figure">{money(total)}</span>
          </div>
          {err ? <div className="tag tag-hot self-start">{err}</div> : null}
          <button className="btn btn-primary btn-block" style={{ padding: 13 }} onClick={submit} disabled={busy || repBlocked}>
            {busy ? "Sending…" : isSample ? "Send sample request for approval" : "Send for approval"}
          </button>
          <div className="hint" style={{ textAlign: "center" }}>
            Goes to the supervisor &amp; owner for approval, then to the accountant for invoicing
          </div>
        </>
      )}
    </Screen>
  );
}

export default function NewOrder() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewOrderInner />
    </Suspense>
  );
}

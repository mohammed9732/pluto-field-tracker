"use client";
import { enqueue, isOffline, newRef } from "@/lib/outbox";
import { useTerms, lower } from "@/lib/terms";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { DoctorPicker, DoctorCard, Doc } from "@/components/DoctorPicker";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, money } from "@/lib/fmt";
import { getPosition } from "@/lib/geo";

function CollectPaymentInner() {
  const me = useMe();
  const t = useTerms();
  const router = useRouter();
  const params = useSearchParams();
  const [doctor, setDoctor] = useState<Doc | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    const docId = params.get("doctorId");
    if (docId) {
      api<{ doctors: Doc[] }>("/api/doctors").then((r) => {
        const d = r.doctors.find((x) => x.id === Number(docId));
        if (d) setDoctor(d);
      }).catch(() => {});
    }
  }, [params]);

  if (!me) return <Spinner />;

  async function attachPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
      if (r.id) setPhoto({ id: r.id, name: file.name });
      else setErr("The photo did not upload. Try again.");
    } catch {
      // Photos are too big to hold on the phone, so unlike a visit or an order a
      // payment genuinely cannot be recorded without signal. Say so plainly
      // rather than letting the rep tap Record and wonder why nothing happens.
      setErr("No signal, so the receipt photo cannot upload. Step outside and try again — or log a visit now and record the payment once you have signal.");
    }
  }

  async function record() {
    setErr("");
    if (!doctor) { setErr(`Pick a ${lower(t.doctor)}`); return; }
    const amt = Math.round(Number(String(amount).replace(/,/g, "")));
    if (!(amt > 0)) { setErr("Enter the amount collected"); return; }
    if (!photo) { setErr("Take a photo of the signed receipt first"); return; }
    setBusy(true);
    try {
      const p = await getPosition();
      const body = {
        doctorId: doctor.id, amount: amt, method, note,
        photo: photo.id, lat: p.lat, lng: p.lng, clientRef: newRef(),
      };
      // The photo is already on the server by this point, so the payment itself
      // is small enough to queue if the connection drops between the two.
      try {
        const r = await api("/api/payments", { json: body });
        setDone(r.payment);
      } catch (netErr) {
        if (!isOffline(netErr)) throw netErr;
        enqueue("/api/payments", body, `Payment — ${doctor.name}`);
        alert("Signal dropped. The receipt photo is already uploaded and the payment will send itself the moment you are back online.");
        router.push("/orders");
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen me={me}>
        <div className="row">
          <h4 style={{ margin: 0, flex: 1 }}>Payment recorded</h4>
          <span className="tag tag-ok">Saved</span>
        </div>
        <div className="card" style={{ gap: 8 }}>
          <div className="row" style={{ alignItems: "baseline" }}>
            <span style={{ flex: 1, fontSize: 13, color: "var(--color-neutral-600)" }}>Amount collected</span>
            <span className="hnum" style={{ fontSize: 28 }}>{money(done.amount)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}>
            <div style={{ display: "flex" }}><span style={{ width: 92, color: "var(--color-neutral-600)" }}>From</span><b>{done.doctorName}</b></div>
            <div style={{ display: "flex" }}><span style={{ width: 92, color: "var(--color-neutral-600)" }}>Clinic</span><span>{done.clinic}</span></div>
            <div style={{ display: "flex" }}><span style={{ width: 92, color: "var(--color-neutral-600)" }}>Method</span><span>{done.method === "cash" ? "Cash" : "Transfer"}</span></div>
            <div style={{ display: "flex" }}><span style={{ width: 92, color: "var(--color-neutral-600)" }}>Collected by</span><span>{done.collectedByName} · {dmy(done.ts)} {done.ts.slice(11, 16)}</span></div>
            <div style={{ display: "flex" }}><span style={{ width: 92, color: "var(--color-neutral-600)" }}>Reference</span><span>{done.ref}</span></div>
          </div>
          {done.photo ? <img src={`/api/files?id=${done.photo}`} alt="signed receipt" style={{ maxWidth: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }} /> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn btn-secondary" style={{ padding: 11 }} onClick={() => { setDone(null); setDoctor(null); setAmount(""); setNote(""); setPhoto(null); }}>Record another</button>
          <button className="btn btn-primary" style={{ padding: 11 }} onClick={() => router.push("/orders?tab=payments")}>Done</button>
        </div>
        <div className="hint" style={{ textAlign: "center", marginTop: "auto" }}>
          The accountant sees this immediately and enters it in the accounting system. Balances stay in the ERP — the app only records what was collected.
        </div>
      </Screen>
    );
  }

  return (
    <Screen me={me}>
      <PageHead title="Record payment" back="back" right={<span className="hint">GPS pinned</span>} />
      {!doctor ? (
        <DoctorPicker onPick={setDoctor} />
      ) : (
        <>
          <DoctorCard doctor={doctor} onChange={() => setDoctor(null)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Amount collected (IQD)</label>
              <input className="input hnum" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="1,000,000" style={{ fontSize: 17 }} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Method</label>
              <div className="seg" style={{ width: "100%" }}>
                <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
                  <input type="radio" name="pm" checked={method === "cash"} onChange={() => setMethod("cash")} />Cash
                </label>
                <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
                  <input type="radio" name="pm" checked={method === "transfer"} onChange={() => setMethod("transfer")} />Transfer
                </label>
              </div>
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. part payment for July supply" />
          </div>
          <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer", border: `1px solid ${photo ? "var(--c-green)" : "var(--color-divider)"}`, borderRadius: 14, padding: "10px 12px" }}>
            <Icon d="M21 15l-5-5L5 21M3 5h18v14H3Z" size={16} stroke={photo ? "var(--c-green-deep)" : "var(--color-neutral-500)"} />
            <span style={{ flex: 1, color: photo ? "var(--c-green-deep)" : "var(--color-neutral-600)" }}>
              {photo ? `Signed receipt attached — ${photo.name}` : "Photo of the signed receipt (required)"}
            </span>
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && attachPhoto(e.target.files[0])} />
          </label>
          {err ? <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>{err}</div> : null}
          <button className="btn btn-primary btn-block" style={{ padding: 13, marginTop: "auto" }} onClick={record} disabled={busy}>
            {busy ? "Recording…" : "Record payment"}
          </button>
          <div className="hint" style={{ textAlign: "center" }}>
            Logged with GPS + time. The accountant enters it in the accounting system — the app does not track invoice balances.
          </div>
        </>
      )}
    </Screen>
  );
}

export default function CollectPayment() {
  return (
    <Suspense fallback={<Spinner />}>
      <CollectPaymentInner />
    </Suspense>
  );
}

"use client";
import { RecordHistory } from "@/components/RecordHistory";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Screen, useMe, Spinner, PageHead } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, groupDigits, hm, money, ungroup } from "@/lib/fmt";
import { getPosition } from "@/lib/geo";
import { useT } from "@/lib/i18n";

const STATUS_TAG: Record<string, [string, string]> = {
  pending: ["Pending", "tag-warn"], approved: ["Approved", "tag-ok"],
  invoiced: ["Invoiced", "tag-chat"], rejected: ["Rejected", "tag-hot"],
};
/* Iraqi numbers get written every which way — 0750…, +964 750…, 00964 750….
 * WhatsApp wants the international form with no punctuation and no leading
 * zero, so normalise rather than trusting what was typed. */
function waNumber(raw: string): string {
  const digits = String(raw).replace(/[^\d]/g, "");
  if (digits.startsWith("00964")) return digits.slice(2);
  if (digits.startsWith("964")) return digits;
  return "964" + digits.replace(/^0+/, "");
}

/* A phone number as a row rather than a line of text.
 *
 * Tapping anywhere on the row dials. WhatsApp is deliberately a separate
 * control with its own 44px box: putting it inside the dial target would mean
 * a mis-tap costs you a phone call to a doctor. */
function ContactRow({ label, number }: { label: string; number: string }) {
  const tx = useT();
  return (
    <div className="row" style={{ gap: "var(--sp-2)", alignItems: "center" }}>
      <a className="rowlink f1min" href={`tel:${number.replace(/\s/g, "")}`}>
        {/* Handset, drawn inline — the icon set has no phone glyph. */}
        <Icon d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 1-2Z"
          size={17} stroke="var(--color-accent)" />
        <div className="f1min">
          <div className="hnum" style={{ fontSize: 13, fontWeight: 600 }}>{number}</div>
          <div className="small muted">{label}</div>
        </div>
      </a>
      <a href={`https://wa.me/${waNumber(number)}`} target="_blank" rel="noreferrer"
         className="btn btn-secondary"
         style={{ fontSize: 12, padding: "0 14px", flex: "none" }}>
        WhatsApp
      </a>
    </div>
  );
}

const OUTCOME: Record<string, string> = { order: "Order", follow_up: "Follow-up", payment: "Payment" };

export default function DoctorProfile() {
  const tx = useT();
  const me = useMe();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState("");
  const [tab, setTab] = useState<"history" | "orders" | "money">("history");
  const [note, setNote] = useState<string | null>(null); // null until loaded
  const [noteSaved, setNoteSaved] = useState(false);
  const [ceilingDraft, setCeilingDraft] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [editErr, setEditErr] = useState("");
  const t = useT();

  const load = useCallback(() => {
    api(`/api/doctors?id=${id}`).then(setData).catch((e: any) => setFailed(e?.message || "Could not open this doctor"));
  }, [id]);
  useEffect(load, [load]);
  // Seed the note box once, from whatever the server had. Re-seeding on every
  // refresh would wipe out what the person is halfway through typing.
  useEffect(() => { if (data && note === null) setNote(data.privateNote?.body ?? ""); }, [data, note]);

  // Reps are scoped to their own city, so a stale link to another city's doctor
  // lands here. Say so and offer the way back instead of spinning forever.
  if (me && failed) {
    return (
      <Screen me={me}>
        <div className="card gap-3">
          <h4 className="m0">{tx("docp.doctorNotAvailable", "Doctor not available")}</h4>
          <div className="small muted">
            This doctor is not on your list. Reps only see doctors in their own city —
            ask your supervisor if you think that is wrong.
          </div>
          <Link className="btn btn-secondary" href="/doctors" style={{ padding: 9, textAlign: "center" }}>
            {tx("docp.backToMyDoctors", "Back to my doctors")}
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
      <PageHead title={d.name} back="back" right={
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className={`tag ${d.class === "A" ? "tag-accent" : "tag-neutral"}`}>Class {d.class}</span>
          {canEditPin ? (
            <button className="btn btn-ghost fs-caption"
              onClick={() => { setEditErr(""); setEdit(edit ? null : { ...d }); }}>
              {edit ? t("common.cancel", "Cancel") : t("common.edit", "Edit")}
            </button>
          ) : null}
        </div>
      } />

      {/* Details change: a clinic moves, a doctor's class is revised, the
          secretary's number finally gets asked for. Every field here writes a
          line to the record's history, so the change is answerable later. */}
      {edit ? (
        <div className="card gap-3">
          <h6 className="m0">{t("doctor.editDetails", "Edit details")}</h6>
          <div className="two-col gap-3">
            <div className="field m0"><label>{t("common.name", "Name")}</label>
              <input className="input" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="field m0"><label>{t("doctor.clinic", "Clinic")}</label>
              <input className="input" value={edit.clinic ?? ""} onChange={(e) => setEdit({ ...edit, clinic: e.target.value })} /></div>
            <div className="field m0"><label>{t("common.phone", "Phone")}</label>
              <input className="input hnum" inputMode="tel" value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="field m0"><label>{t("doctor.secretary", "Secretary phone")}</label>
              <input className="input hnum" inputMode="tel" value={edit.secretaryPhone ?? ""} onChange={(e) => setEdit({ ...edit, secretaryPhone: e.target.value })} /></div>
            <div className="field m0"><label>{t("doctor.specialty", "Specialty")}</label>
              <input className="input" value={edit.specialty ?? ""} onChange={(e) => setEdit({ ...edit, specialty: e.target.value })} /></div>
            <div className="field m0"><label>{t("doctor.area", "Area")}</label>
              <input className="input" value={edit.area ?? ""} onChange={(e) => setEdit({ ...edit, area: e.target.value })} /></div>
            <div className="field m0"><label>{t("doctor.class", "Class")}</label>
              <select className="input" value={edit.class ?? "B"} onChange={(e) => setEdit({ ...edit, class: e.target.value })}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select></div>
            <div className="field m0"><label>{t("doctor.potential", "Monthly potential")}</label>
              <input className="input hnum" inputMode="numeric" value={groupDigits(String(edit.potentialMonthly ?? ""))}
                onChange={(e) => setEdit({ ...edit, potentialMonthly: ungroup(e.target.value) })} /></div>
          </div>
          <div className="field m0"><label>{t("doctor.address", "Address")}</label>
            <input className="input" value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
          {editErr ? <div className="tag tag-hot self-start">{editErr}</div> : null}
          <div className="two">
            <button className="btn btn-primary p-3"
              onClick={async () => {
                setEditErr("");
                try {
                  await api("/api/doctors", { json: {
                    action: "update", id: d.id,
                    name: edit.name, clinic: edit.clinic, phone: edit.phone,
                    secretaryPhone: edit.secretaryPhone, specialty: edit.specialty,
                    area: edit.area, address: edit.address, class: edit.class,
                    potentialMonthly: Number(edit.potentialMonthly) || 0,
                  } });
                  setEdit(null);
                  load();
                } catch (e: any) { setEditErr(e?.message || "Could not save"); }
              }}>
              {t("common.save", "Save")}
            </button>
            <button className="btn btn-secondary p-3" onClick={() => setEdit(null)}>
              {t("common.cancel", "Cancel")}
            </button>
          </div>
        </div>
      ) : null}
      <div className="card gap-2">
        <div className="fs-small w-500">{d.clinic}</div>
        <div className="small muted">{d.specialty} · {d.area}{d.address ? ` · ${d.address}` : ""}</div>
        {/* One row per number, each row a 44px call target in its own right.
            These were previously three links in a 19px-tall strip, which is
            not something you can hit reliably standing in a corridor. The
            secretary is often the person who actually answers and books the
            appointment, so their number gets equal billing rather than being
            squeezed onto the end of a line. */}
        {d.phone ? <ContactRow label={t("common.phone", "Doctor")} number={d.phone} /> : null}
        {d.secretaryPhone ? <ContactRow label={t("doctor.secretary", "Secretary")} number={String(d.secretaryPhone)} /> : null}
        <div className="row gap-2">
          <Icon d={paths.pinDot} size={14} stroke={d.lat != null ? "var(--color-accent)" : "var(--color-neutral-400)"} />
          <span className="small muted f1">{d.lat != null ? "Clinic pin saved" : "No clinic pin yet"}</span>
          {(d.lat == null || canEditPin) ? (
            <button className="btn btn-ghost fs-caption" onClick={setPin}>{d.lat == null ? "Set location" : "Correct pin"}</button>
          ) : null}
        </div>
        {/* Directions. Both apps are in daily use here and reps are split
            between them, so neither is imposed. With a pin we hand over exact
            coordinates; without one, the best we can do is hand over the
            address as a search — which is still better than retyping it. */}
        <div className="two">
          <a className="btn btn-secondary" style={{ padding: 9, fontSize: 12 }} target="_blank" rel="noreferrer"
             href={d.lat != null
               ? `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`
               : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.clinic, d.address, d.area, d.city].filter(Boolean).join(", "))}`}>
            {t("doctor.openInMaps", "Google Maps")}
          </a>
          <a className="btn btn-secondary" style={{ padding: 9, fontSize: 12 }} target="_blank" rel="noreferrer"
             href={d.lat != null
               ? `https://www.waze.com/ul?ll=${d.lat},${d.lng}&navigate=yes`
               : `https://www.waze.com/ul?q=${encodeURIComponent([d.clinic, d.address, d.area, d.city].filter(Boolean).join(", "))}`}>
            {t("doctor.openInWaze", "Waze")}
          </a>
        </div>
      </div>

      {/* The ceiling. The number is deliberately visible to everyone — the
          rep should know the wall exists before the doctor asks for one more
          box, not discover it when the order bounces. */}
      {(data.ceiling?.ceiling > 0 || data.canSetCeiling) ? (
        <div className="card" style={{ gap: 6, borderColor: data.ceiling?.level === "red" ? "var(--c-coral)" : data.ceiling?.level === "amber" ? "var(--c-amber)" : undefined }}>
          <div className="row items-base gap-2">
            <h6 className="m0 f1">{t("doctor.monthlyCeiling", "Monthly ceiling")}</h6>
            {data.ceiling?.ceiling > 0 ? (
              <>
                <span className="hnum fs-lead">{money(data.ceiling.used)}</span>
                <span className="small muted">/ {money(data.ceiling.ceiling)}</span>
              </>
            ) : <span className="small muted">{t("doctor.noCeiling", "not set")}</span>}
          </div>
          {data.ceiling?.ceiling > 0 ? (
            <>
              <div className="meter">
                <div className="fill" style={{
                  width: `${Math.min(100, data.ceiling.pct)}%`,
                  background: data.ceiling.level === "red" ? "var(--c-coral)" : data.ceiling.level === "amber" ? "var(--c-amber)" : undefined,
                }} />
              </div>
              {data.ceiling.level === "red" ? (
                <div className="small" style={{ color: "var(--c-coral-deep)", fontWeight: 600 }}>
                  {t("doctor.ceilingReached", "Ceiling reached — ordering is closed for this month.")}
                </div>
              ) : data.ceiling.level === "amber" ? (
                <div className="small" style={{ color: "var(--c-amber-deep)" }}>
                  {t("doctor.ceilingNear", "Getting close to the ceiling — plan the remaining room.")}
                </div>
              ) : null}
            </>
          ) : null}
          {data.canSetCeiling ? (
            <div className="row gap-2" style={{ alignItems: "center" }}>
              <input className="input hnum" inputMode="numeric" placeholder="5,000,000"
                value={ceilingDraft ?? groupDigits(String(data.ceiling?.ceiling || ""))}
                onChange={(e) => setCeilingDraft(groupDigits(e.target.value))}
                style={{ flex: 1 }} />
              <button className="btn btn-secondary" style={{ flex: "none", fontSize: 12.5, padding: "0 16px" }}
                onClick={async () => {
                  await api("/api/doctors", { json: { action: "setCeiling", doctorId: d.id, ceiling: ungroup(ceilingDraft ?? "") } });
                  setCeilingDraft(null);
                  load();
                }}>
                {t("common.save", "Save")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {data.potentialMonthly > 0 ? (
        <div className="card gap-2">
          <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
            <h6 className="m0 f1">{tx("docp.thisMonthVsPotential", "This month vs potential")}</h6>
            <span className="hnum fs-lead">{money(data.monthValue)}</span>
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

      <div className="two-3">
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>{tx("docp.lifetimeSales", "Lifetime sales")}</div>
          <div className="hnum" style={{ fontSize: 22 }}>{money(data.lifetimeValue)}</div>
        </div>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-green-deep)" }}>{tx("docp.collected", "Collected")}</div>
          <div className="hnum" style={{ fontSize: 22 }}>{money(data.totalCollected)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: data.lastOrderItems ? "1fr 1fr" : "1fr", gap: 8 }}>
        <Link href={`/visit?doctorId=${d.id}`} className="btn btn-primary" style={{ padding: 11, fontSize: 13 }}>＋ Log visit</Link>
        {data.lastOrderItems ? (
          <Link href={`/order?doctorId=${d.id}&reorder=1`} className="btn btn-secondary" style={{ padding: 11, fontSize: 13 }}>{tx("docp.reorderLast", "Reorder last")}</Link>
        ) : null}
      </div>

      {data.competitors?.length ? (
        <div className="card gap-2">
          <h6 className="m0">{tx("docp.competitorsAtThisClinic", "Competitors at this clinic")}</h6>
          {data.competitors.slice(0, 4).map((c: any) => (
            <div key={c.id} className="small" style={{ color: "var(--color-neutral-700)" }}>
              <b>{c.competitor}</b>{c.product ? ` · ${c.product}` : ""}{c.price ? ` · ${money(c.price)}` : ""}
              {c.note ? ` — ${c.note}` : ""} <span className="muted">({c.byName}, {dmy(c.ts)})</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* A private scratchpad. The server only ever returns the signed-in
          person's own note, so this is not a permission the UI is enforcing. */}
      <div className="card gap-2">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <h6 className="m0 f1">{t("doctor.privateNote", "My private note")}</h6>
          <span className="small muted">{t("doctor.privateNoteHint", "only you can see this")}</span>
        </div>
        <textarea
          className="input"
          rows={3}
          style={{ resize: "vertical" }}
          placeholder={t("doctor.privateNotePlaceholder", "Prefers early mornings · always asks about the discount · secretary is the gatekeeper")}
          value={note ?? ""}
          onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
        />
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          {noteSaved ? <span className="small" style={{ color: "var(--c-green-deep)" }}>{t("common.saved", "Saved")}</span> : <span />}
          <button className="btn btn-secondary" style={{ marginInlineStart: "auto", fontSize: 12, padding: "6px 14px" }}
            onClick={async () => {
              await api("/api/doctors", { json: { action: "privateNote", doctorId: d.id, body: note ?? "" } });
              setNoteSaved(true);
            }}>
            {t("common.save", "Save")}
          </button>
        </div>
      </div>

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
              <div className="f1min">
                <div className="fs-small">{OUTCOME[v.outcome] ?? v.outcome} · <span className="muted">{v.byName}</span></div>
                {v.notes ? <div className="small muted">{v.notes}</div> : null}
                {v.photo ? <img src={`/api/files?id=${v.photo}`} alt={tx("docp.visitPh", "visit")} style={{ maxWidth: "100%", borderRadius: 10, marginTop: 4, maxHeight: 140, objectFit: "cover" }} /> : null}
              </div>
            </div>
          ))}
          {data.visits.length === 0 ? <div className="small muted">{tx("docp.noVisitsYet", "No visits yet.")}</div> : null}
        </>
      ) : null}

      {tab === "orders" ? (
        <>
          {data.orders.map((o: any) => (
            <div key={o.id} className="listrow">
              <div className="f1min">
                <div className="fs-small">{dmy(o.createdAt)} · {o.items.map((it: any) => `${it.qty}× ${it.name}`).join(", ")}</div>
                <div className="small muted">{o.byName}{o.invoicePdfName ? " · invoice attached" : ""}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span className="hnum fs-body">{money(o.total)}</span>
                <span className={`tag ${STATUS_TAG[o.status][1]}`}>{STATUS_TAG[o.status][0]}</span>
              </div>
            </div>
          ))}
          {data.orders.length === 0 ? <div className="small muted">{tx("docp.noOrdersYet", "No orders yet.")}</div> : null}
        </>
      ) : null}

      {tab === "money" ? (
        <>
          {data.payments.map((p: any) => (
            <div key={p.id} className="listrow">
              <div className="f1">
                <div className="fs-small">{p.method === "cash" ? "Cash" : "Transfer"}{p.note ? ` · ${p.note}` : ""}</div>
                <div className="small muted">{dmy(p.ts)} {hm(p.ts)} · {p.byName}</div>
              </div>
              <span className="hnum fs-body">{money(p.amount)}</span>
            </div>
          ))}
          {data.payments.length === 0 ? <div className="small muted">{tx("docp.noPaymentsRecorded", "No payments recorded.")}</div> : null}
        </>
      ) : null}
      <RecordHistory entity="doctor" id={d.id} />
    </Screen>
  );
}

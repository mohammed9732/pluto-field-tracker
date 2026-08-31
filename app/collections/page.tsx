"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner, PageHead, useRefresh } from "@/components/Shell";
import { api, dmy, money } from "@/lib/fmt";
import { useT } from "@/lib/i18n";

/* The rep's collection list — what the accountant has asked them to bring in.
 *
 * Each due item is one tap from the payment screen, pre-filled with the
 * customer and the expected amount, so recording the money is the easy path
 * and skipping the schedule is the awkward one.
 */
export default function CollectionsPage() {
  const me = useMe();
  const tx = useT();
  const [data, setData] = useState<any>(null);

  const load = useCallback(() => { api("/api/collections").then(setData).catch(() => {}); }, []);
  useEffect(load, [load]);
  useRefresh(load);

  if (!me || !data) return <Spinner />;

  const Item = ({ c, actionable }: { c: any; actionable: boolean }) => (
    <div className="listrow" style={{ alignItems: "center", gap: 10 }}>
      <div className="f1min">
        <div className="fs-small w-500">{c.doctorName}</div>
        <div className="small muted">
          {dmy(c.date)}{c.invoiceNo ? ` · ${tx("coll.invoice", "invoice")} ${c.invoiceNo}` : ""}
          {c.note ? ` — ${c.note}` : ""}
        </div>
        {c.status === "done" ? (
          <div className="small" style={{ color: c.shortfall ? "var(--c-amber-deep)" : "var(--c-green-deep)" }}>
            {c.shortfall
              ? tx("coll.shortfallLine", "Collected {a} of {b}")
                  .replace("{a}", money(c.collectedAmount ?? 0)).replace("{b}", money(c.amount))
              : tx("coll.collectedFull", "Collected in full")}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span className="hnum" style={{ fontSize: 15, fontWeight: 700 }}>{money(c.amount)}</span>
        {actionable ? (
          <Link className="btn btn-primary" style={{ fontSize: 12.5, padding: "0 16px" }}
            href={`/pay?doctorId=${c.doctorId}&amount=${c.amount}`}>
            {tx("coll.collect", "Collect")}
          </Link>
        ) : null}
      </div>
    </div>
  );

  return (
    <Screen me={me}>
      <PageHead title={tx("coll.title", "Collections")} back="back" />

      <div className="card" style={{ gap: 6 }}>
        <h6 className="m0">{tx("coll.dueNow", "Due now")}</h6>
        {data.today.length === 0 ? (
          <div className="small muted">{tx("coll.nothingDue", "Nothing due — all caught up.")}</div>
        ) : data.today.map((c: any) => <Item key={c.id} c={c} actionable />)}
      </div>

      {data.upcoming.length ? (
        <div className="card" style={{ gap: 6 }}>
          <h6 className="m0">{tx("coll.upcoming", "Coming up")}</h6>
          {data.upcoming.map((c: any) => <Item key={c.id} c={c} actionable={false} />)}
        </div>
      ) : null}

      {data.done.length ? (
        <div className="card" style={{ gap: 6 }}>
          <h6 className="m0">{tx("coll.recent", "Recently collected")}</h6>
          {data.done.map((c: any) => <Item key={c.id} c={c} actionable={false} />)}
        </div>
      ) : null}

      <div className="hint">
        {tx("coll.hint", "These are set by the accountant. Recording a payment for the customer ticks the item off automatically — collect what you can; the accountant sees any difference.")}
      </div>
    </Screen>
  );
}

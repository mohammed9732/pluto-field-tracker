"use client";
import { term, useTerms } from "@/lib/terms";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, hm, money, money0, monthName } from "@/lib/fmt";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

export default function AcctDashboard() {
  const tx = useT();
  const me = useMe();
  const t = useTerms();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  

  const load = useCallback(() => {
    api("/api/acctdash").then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const k = data.kpis;

  async function logout() {
    await api("/api/auth/logout", { json: {} });
    router.replace("/login");
  }

  return (
    <Screen me={me} wide>
      <div className="row">
        <h4 className="m0 f1">{tx("acct.moneyFor", "Money")} — {monthName(data.period)}</h4>
        <button className="btn btn-secondary btn-icon" style={{ }} onClick={logout} title={tx("acct.signOutPh", "Sign out")}>
          <Icon d={paths.logout} size={17} />
        </button>
      </div>

      <div className="two-3">
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>{tx("acct.salesMtd", "Sales MTD")}</div>
          <div className="hnum fs-lead">{money0(k.salesMTD)}</div>
        </div>
        <div className="blueprint" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-green-deep)" }}>{tx("acct.collectedMtd", "Collected MTD")}</div>
          <div className="hnum fs-lead">{money0(k.collectedMTD)}</div>
          <div className="small muted">{tx("acct.today", "today")} {money0(k.collectedToday)}</div>
        </div>
        <Link href="/acct/queue" className="blueprint" style={{ padding: 12, textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-coral-deep)" }}>{tx("acct.invoiceQueue", "Invoice queue")}</div>
          <div className="hnum fs-lead">{k.queueCount} {tx("acct.waiting", "waiting")} →</div>
        </Link>
      </div>


      {/* The lists that used to live here — received payments and the cash
          check — moved to Money in, where the schedule already was. One page
          for money coming in, instead of the same word meaning two things. */}
      <a href="/acct/collections" className="card" style={{ flexDirection: "row", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
        <div className="f1min">
          <div className="fs-small w-700">{tx("coll.moneyIn", "Money in")} →</div>
          <div className="small muted">{tx("acct.moneyInSub", "Schedule, received payments, and the cash check — with totals.")}</div>
        </div>
        <span className="hnum fs-lead">{money(k.collectedMTD)}</span>
      </a>

      {true ? (
        <>
          <div className="hint">{tx("acct.thisMonthPerPerson", "This month per person — full detail on the")} <Link href="/acct/payroll">{tx("acct.payroll", "Payroll")}</Link> and <Link href="/spendings">{tx("acct.spendings", "Spendings")}</Link> pages.</div>
          <table className="table fs-caption">
            <thead><tr><th>{tx("acct.person", "Person")}</th><th className="ta-r">{tx("acct.base", "Base")}</th><th className="ta-r">{tx("acct.commission", "Commission")}</th><th className="ta-r">{tx("acct.spendings", "Spendings")}</th><th className="ta-r">{tx("acct.deducted", "Deducted")}</th><th></th></tr></thead>
            <tbody>
              {data.people.map((p: any) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="ta-r">{money0(p.base)}</td>
                  <td style={{ textAlign: "right", color: "var(--c-green-deep)" }}>{p.commission ? money0(p.commission) : "—"}</td>
                  <td className="ta-r">{p.spendings ? money0(p.spendings) : "—"}</td>
                  <td style={{ textAlign: "right", color: p.deducted ? "var(--c-coral-deep)" : undefined }}>{p.deducted ? money0(p.deducted) : "—"}</td>
                  <td className="ta-r">{p.paid ? <span className="tag tag-ok">{tx("acct.paid", "Paid")}</span> : <span className="tag tag-warn">{tx("acct.due", "Due")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
        <Link href="/acct/payouts" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{tx("acct.quarterlyPayouts", "Quarterly payouts")}</Link>
        <Link href="/tasks" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{tx("acct.tasks", "Tasks")}</Link>
        <Link href="/doctors" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{term(t, "doctorPlural", "nav.doctors")}</Link>
        <Link href="/catalog" className="btn btn-secondary" style={{ padding: 10, fontSize: 13 }}>{tx("acct.products", "Products")}</Link>
      </div>
    </Screen>
  );
}

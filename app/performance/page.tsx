"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { PerformanceView } from "@/components/PerformanceView";
import { api, monthName } from "@/lib/fmt";

export default function Performance() {
  const tx = useT();
  const me = useMe();
  const [team, setTeam] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (me && (me.role === "supervisor" || me.role === "admin")) {
      api("/api/team").then((r: any) => setTeam(r.rows)).catch(() => {});
      setUserId((u) => u ?? me.id);
    } else if (me) setUserId(me.id);
  }, [me]);

  const load = useCallback(() => {
    if (!userId) return;
    api(`/api/performance?userId=${userId}`).then(setData).catch(() => {});
  }, [userId]);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  if (!data.enabled) {
    return <Screen me={me}><div className="card muted">{tx("perf.performanceIsSwitchedOff", "Performance is switched off by the admin.")}</div></Screen>;
  }

  return (
    <Screen me={me} wide={me.role === "admin"}>
      <div>
        <h4 style={{ margin: "0 0 2px" }}>{tx("perf.performance", "Performance")}</h4>
        <div className="small muted fs-caption">{data.name} · {monthName(data.period)}</div>
      </div>
      {me.role === "supervisor" || me.role === "admin" ? (
        <div className="seg" style={{ width: "100%", overflowX: "auto" }}>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}>
            <input type="radio" name="perf" checked={userId === me.id} onChange={() => setUserId(me.id)} />Me
          </label>
          {team.map((r) => (
            <label key={r.userId} className="seg-opt" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}>
              <input type="radio" name="perf" checked={userId === r.userId} onChange={() => setUserId(r.userId)} />
              {r.name.split(" ")[0]}
            </label>
          ))}
        </div>
      ) : null}
      <PerformanceView data={data} />
    </Screen>
  );
}

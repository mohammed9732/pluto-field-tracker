"use client";
import { hm } from "@/lib/fmt";

// Schematic map — geo tiles come later; pins are projected into the box.
export function SchematicMap({ checkins, visits, pings, height = 270 }: { checkins: any[]; visits: any[]; pings: any[]; height?: number }) {
  const pts: { lat: number; lng: number }[] = [
    ...checkins.filter((c) => c.lat != null),
    ...visits.filter((v) => v.lat != null),
    ...pings,
  ];
  if (pts.length === 0) {
    return (
      <div className="mapgrid" style={{ height, display: "grid", placeItems: "center" }}>
        <span className="small muted">No GPS points yet today</span>
      </div>
    );
  }
  let minLat = Math.min(...pts.map((p) => p.lat));
  let maxLat = Math.max(...pts.map((p) => p.lat));
  let minLng = Math.min(...pts.map((p) => p.lng));
  let maxLng = Math.max(...pts.map((p) => p.lng));
  const padLat = Math.max(0.004, (maxLat - minLat) * 0.2);
  const padLng = Math.max(0.004, (maxLng - minLng) * 0.2);
  minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng;
  const X = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;
  const Y = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * 100;

  const trail = pings.map((p) => `${X(p.lng)},${Y(p.lat)}`).join(" ");
  const last = pings[pings.length - 1];

  return (
    <div className="mapgrid" style={{ height }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {trail ? <polyline points={trail} fill="none" stroke="var(--color-accent)" strokeWidth="0.5" strokeDasharray="2 1.6" /> : null}
      </svg>
      {checkins.filter((c) => c.lat != null).map((c) => (
        <div key={c.id} style={{ position: "absolute", left: `calc(${X(c.lng)}% - 13px)`, top: `calc(${Y(c.lat)}% - 13px)`, width: 26, height: 26, background: "var(--color-accent)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-heading)", fontSize: 11, borderRadius: 6 }}>
          {c.type === "in" ? "IN" : "OUT"}
        </div>
      ))}
      {pings.map((p) => (
        <div key={p.id} style={{ position: "absolute", left: `calc(${X(p.lng)}% - 4.5px)`, top: `calc(${Y(p.lat)}% - 4.5px)`, width: 9, height: 9, borderRadius: "50%", border: "1.5px solid var(--color-accent-400)", background: "var(--color-neutral-100)" }} />
      ))}
      {visits.filter((v) => v.lat != null).map((v, i) => (
        <div key={v.id} title={v.doctor?.name} style={{ position: "absolute", left: `calc(${X(v.lng)}% - 12px)`, top: `calc(${Y(v.lat)}% - 12px)`, width: 24, height: 24, border: "1.5px solid var(--color-accent)", background: "var(--color-neutral-100)", color: "var(--color-accent-700)", display: "grid", placeItems: "center", fontFamily: "var(--font-heading)", fontSize: 12, borderRadius: 6 }}>
          {i + 1}
        </div>
      ))}
      {last ? (
        <div style={{ position: "absolute", left: `${X(last.lng)}%`, top: `${Y(last.lat)}%`, display: "flex", alignItems: "center", gap: 6, transform: "translate(-6px,-6px)" }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--color-accent)", boxShadow: "0 0 0 4px var(--color-accent-200)" }} />
          <span style={{ fontSize: 10, background: "var(--color-neutral-100)", border: "1px solid var(--color-accent-300)", color: "var(--color-accent-800)", padding: "2px 5px", whiteSpace: "nowrap" }}>{hm(last.ts)}</span>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 10, bottom: 8, display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10, color: "var(--color-neutral-600)", background: "var(--color-neutral-100)", padding: "5px 7px", border: "1px solid var(--color-divider)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, background: "var(--color-accent)", display: "inline-block" }} />Check-in/out</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, border: "1.5px solid var(--color-accent)", display: "inline-block" }} />Clinic visit</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, borderTop: "1.5px dashed var(--color-accent)", display: "inline-block" }} />Movement</span>
      </div>
      <div style={{ position: "absolute", right: 12, top: 8, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--color-neutral-500)" }}>Schematic</div>
    </div>
  );
}

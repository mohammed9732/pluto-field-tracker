"use client";

const PALETTE = ["#2f6fe0", "#98bffb", "#12a06a", "#f0a72a", "#7a5cf0", "#ff6a3d", "#9a9488"];

export function PieChart({ data, size = 150 }: { data: { label: string; value: number }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <div className="small muted">No data yet.</div>;
  let angle = -90;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const slices = data.filter((d) => d.value > 0).map((d, i) => {
    const sweep = (d.value / total) * 360;
    const a0 = (angle * Math.PI) / 180;
    const a1 = ((angle + sweep) * Math.PI) / 180;
    angle += sweep;
    const large = sweep > 180 ? 1 : 0;
    const path = sweep >= 359.9
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
    return { path, color: PALETTE[i % PALETTE.length], label: d.label, value: d.value, pct: Math.round((d.value / total) * 100) };
  });
  return (
    <div className="row" style={{ gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="var(--color-neutral-100)" strokeWidth="1.5" />)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {slices.map((s, i) => (
          <div key={i} className="row" style={{ gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: "none" }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <b>{s.pct}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data, height = 150, format }: { data: { label: string; value: number; color?: string }[]; height?: number; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: height + 34, paddingTop: 4 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
          <span className="hnum" style={{ fontSize: 11 }}>{format ? format(d.value) : d.value.toLocaleString()}</span>
          <div style={{ width: "100%", maxWidth: 46, height: Math.max(3, (d.value / max) * height), background: d.color ?? PALETTE[i % PALETTE.length], borderRadius: "6px 6px 0 0" }} />
          <span className="small muted" style={{ fontSize: 10, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

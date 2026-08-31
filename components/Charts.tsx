"use client";
import { useState } from "react";
import { tr } from "@/lib/i18n";

/* The dashboard charts — hand-rolled SVG, no library.
 *
 * Rules baked in (they are the difference between a chart and decoration):
 * one y-axis only; two series at most, drawn in the app's accent blue and
 * money green (the pair passes colorblind validation at ΔE 24); values and
 * labels wear text colors, never the series color; the grid is recessive;
 * a legend names the lines and the hover layer answers "how much, exactly".
 * The plot is deliberately LTR even in Arabic — time reads left to right on
 * every chart the team has ever seen, and the numerals are Latin anyway.
 */

const compact = (v: number): string =>
  v >= 1e9 ? (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B"
  : v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
  : v >= 1e3 ? Math.round(v / 1e3) + "K"
  : String(Math.round(v));

export type LineSeries = { key: string; name: string; color: string };

export function MoneyLine({ rows, series, height = 200 }: {
  rows: { label: string; [k: string]: any }[];
  series: LineSeries[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = height, padL = 46, padR = 16, padT = 12, padB = 26;
  const n = rows.length;
  if (!n) return null;
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0)));
  // Round the axis top up to a clean step so the ticks read as real numbers.
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / (pow / 2)) * (pow / 2);
  const x = (i: number) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div dir="ltr" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - padL) / (W - padL - padR)) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, i)));
        }}
        onMouseLeave={() => setHover(null)}>
        {/* recessive grid: three lines, no box */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(top * f)} y2={y(top * f)}
              stroke="var(--color-divider)" strokeWidth={1} />
            <text x={padL - 6} y={y(top * f) + 4} textAnchor="end"
              style={{ font: "600 11px Barlow, system-ui", fill: "var(--color-neutral-500)" }}>
              {compact(top * f)}
            </text>
          </g>
        ))}
        {/* month labels, thinned so they never collide */}
        {rows.map((r, i) => (i % labelEvery === 0 || i === n - 1) ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle"
            style={{ font: "500 11px Barlow, system-ui", fill: "var(--color-neutral-500)" }}>{r.label}</text>
        ) : null)}
        {/* hover crosshair under the lines */}
        {hover != null ? (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB}
            stroke="var(--color-neutral-400)" strokeWidth={1} strokeDasharray="3 3" />
        ) : null}
        {series.map((s) => (
          <polyline key={s.key} fill="none" stroke={s.color} strokeWidth={2}
            strokeLinejoin="round" strokeLinecap="round"
            points={rows.map((r, i) => `${x(i)},${y(Number(r[s.key]) || 0)}`).join(" ")} />
        ))}
        {/* hover dots: 2px surface ring so they sit clear of both lines */}
        {hover != null ? series.map((s) => (
          <circle key={s.key} cx={x(hover)} cy={y(Number(rows[hover][s.key]) || 0)} r={4.5}
            fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />
        )) : null}
      </svg>
      {hover != null ? (
        <div style={{
          position: "absolute", top: 0, left: `${(x(hover) / W) * 100}%`,
          transform: `translateX(${hover > n / 2 ? "-105%" : "8px"})`,
          background: "var(--color-surface)", border: "1px solid var(--color-divider)",
          borderRadius: 10, padding: "6px 10px", pointerEvents: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,.08)", whiteSpace: "nowrap", zIndex: 5,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-neutral-500)" }}>{rows[hover].label}</div>
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ color: "var(--color-neutral-600)" }}>{s.name}</span>
              <b className="hnum" style={{ marginLeft: "auto", paddingLeft: 8 }}>{(Number(rows[hover][s.key]) || 0).toLocaleString()}</b>
            </div>
          ))}
        </div>
      ) : null}
      {/* legend — always, so identity never rides on color alone */}
      <div style={{ display: "flex", gap: 16, paddingTop: 4, flexWrap: "wrap" }}>
        {series.map((s) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-neutral-600)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Horizontal magnitude bars — one hue, identity carried by the row label.
 * Rounded 4px data-end, 2px gaps, value in text ink at the end of the bar. */
export function HBars({ rows, color = "var(--color-accent)" }: {
  rows: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <div className="small muted">{tr("chart.noData", "Nothing this month yet.")}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="fs-caption" style={{ width: 110, color: "var(--color-neutral-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }} dir="ltr">
            <div style={{
              width: `${Math.max(1.5, (r.value / max) * 100)}%`, height: 14,
              background: color, borderRadius: 4, opacity: 0.9,
            }} />
            <span className="hnum fs-caption" style={{ fontWeight: 700 }}>{compact(r.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- legacy report charts (monthly report page) ------------------- */
import { useT } from "@/lib/i18n";
const PALETTE = [
  "var(--color-accent)",
  "var(--c-teal)",
  "var(--c-green)",
  "var(--c-amber)",
  "var(--c-violet)",
  "var(--c-coral)",
  "var(--c-pink)",
];

export function PieChart({ data, size = 150 }: { data: { label: string; value: number }[]; size?: number }) {
  const tx = useT();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <div className="small muted">{tx("chart.noDataYet", "No data yet.")}</div>;
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
        {slices.map((s, i) => <path key={i} d={s.path} strokeWidth="1.5"
            // style rather than the fill attribute: CSS variables are not reliably
            // resolved inside SVG presentation attributes across browsers.
            style={{ fill: s.color, stroke: "var(--color-surface)" }} />)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {slices.map((s, i) => (
          <div key={i} className="row" style={{ gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: "none" }} />
            <span className="f1">{s.label}</span>
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
          <span className="hnum fs-caption">{format ? format(d.value) : d.value.toLocaleString()}</span>
          <div style={{ width: "100%", maxWidth: 46, height: Math.max(3, (d.value / max) * height), background: d.color ?? PALETTE[i % PALETTE.length], borderRadius: "6px 6px 0 0" }} />
          <span className="small muted" style={{ fontSize: 12, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

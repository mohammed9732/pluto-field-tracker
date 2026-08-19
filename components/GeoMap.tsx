"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Real street map (OpenStreetMap tiles via Leaflet).
export function GeoMap({ checkins, visits, pings, height = 280 }: { checkins: any[]; visits: any[]; pings: any[]; height?: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !boxRef.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const pts: [number, number][] = [
        ...checkins.filter((c) => c.lat != null).map((c: any) => [c.lat, c.lng] as [number, number]),
        ...visits.filter((v) => v.lat != null).map((v: any) => [v.lat, v.lng] as [number, number]),
        ...pings.map((p: any) => [p.lat, p.lng] as [number, number]),
      ];
      const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true });
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      if (pts.length === 0) {
        map.setView([36.19, 44.01], 12); // Erbil default
      } else if (pts.length === 1) {
        map.setView(pts[0], 15);
      } else {
        map.fitBounds(L.latLngBounds(pts).pad(0.2));
      }

      // Ping trail
      const trail = pings.map((p: any) => [p.lat, p.lng] as [number, number]);
      if (trail.length > 1) L.polyline(trail, { color: "#2f6fe0", weight: 2.5, dashArray: "6 5", opacity: 0.8 }).addTo(map);
      for (const p of pings) {
        L.circleMarker([p.lat, p.lng], { radius: 4, color: "#639bf0", fillColor: "#fff", fillOpacity: 1, weight: 1.5 })
          .addTo(map).bindTooltip(p.ts?.slice(11, 16) ?? "");
      }
      // Check-in / out
      for (const c of checkins.filter((x: any) => x.lat != null)) {
        L.marker([c.lat, c.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:28px;height:28px;background:#2f6fe0;color:#fff;display:grid;place-items:center;font:600 11px Barlow,system-ui;border-radius:8px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${c.type === "in" ? "IN" : "OUT"}</div>`,
            iconSize: [28, 28], iconAnchor: [14, 14],
          }),
        }).addTo(map).bindTooltip(`${c.type === "in" ? "Check-in" : "Check-out"} ${c.ts?.slice(11, 16) ?? ""}`);
      }
      // Visits (numbered, highlighted) — tap opens navigation choices.
      visits.filter((v: any) => v.lat != null).forEach((v: any, i: number) => {
        L.marker([v.lat, v.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:30px;height:30px;background:#e6efff;color:#14336e;display:grid;place-items:center;font:600 13px Barlow,system-ui;border-radius:9px;border:2.5px solid #2f6fe0;box-shadow:0 0 0 4px rgba(47,111,224,.25),0 1px 4px rgba(0,0,0,.25)">${i + 1}</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15],
          }),
        }).addTo(map).bindPopup(
          `<div style="font:13px Barlow,system-ui;min-width:150px">
            <b>${v.doctor?.name ?? "Visit"}</b><br>${v.doctor?.clinic ?? ""} · ${v.time ?? ""}<br>
            <div style="margin-top:6px;display:flex;gap:10px">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}" target="_blank" rel="noopener">Google Maps</a>
              <a href="https://waze.com/ul?ll=${v.lat},${v.lng}&navigate=yes" target="_blank" rel="noopener">Waze</a>
            </div>
          </div>`
        );
      });
      // Current position = last ping
      const last = pings[pings.length - 1];
      if (last) {
        L.circleMarker([last.lat, last.lng], { radius: 8, color: "#2f6fe0", fillColor: "#2f6fe0", fillOpacity: 0.9, weight: 6, opacity: 0.25 })
          .addTo(map).bindTooltip(`Last ping ${last.ts?.slice(11, 16) ?? ""}`);
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [checkins, visits, pings]);

  return <div ref={boxRef} style={{ height, borderRadius: 16, border: "1px solid var(--color-divider)", overflow: "hidden", zIndex: 0 }} />;
}

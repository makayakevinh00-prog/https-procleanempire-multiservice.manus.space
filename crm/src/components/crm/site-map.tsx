"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPin = { lat: number; lng: number; title: string; sub?: string; color: "green" | "blue" | "orange" | "grey" | "red"; href?: string };
const COLORS = { green: "#16a34a", blue: "#1d6fe0", orange: "#f59e0b", grey: "#94a3b8", red: "#dc2626" };

/** Carte OpenStreetMap avec des repères colorés (sites et agents sur place). */
export function SiteMap({ pins, height = 360, zoom = 12 }: { pins: MapPin[]; height?: number; zoom?: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: any;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      const pts: [number, number][] = [];
      for (const p of pins) {
        const icon = L.divIcon({ className: "", html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${COLORS[p.color]};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></span>`, iconSize: [22, 22], iconAnchor: [11, 22] });
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
        m.bindPopup(`<b>${esc(p.title)}</b>${p.sub ? `<br>${esc(p.sub)}` : ""}${p.href ? `<br><a href="${p.href}">Ouvrir</a>` : ""}`);
        pts.push([p.lat, p.lng]);
      }
      if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
      else if (pts.length === 1) map.setView(pts[0], 15);
      else map.setView([48.95, 2.3], 9);
    })();
    return () => { map?.remove(); };
  }, [pins]);
  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-xl border" aria-label="Carte des sites" />;
}

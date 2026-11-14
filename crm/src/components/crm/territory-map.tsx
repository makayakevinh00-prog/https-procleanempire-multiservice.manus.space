"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type TerPoint = { id: string; lat: number; lng: number; name: string; sub: string; state: "cible" | "en_cours" | "client" };
export type TerCity = { city: string; lat: number; lng: number; total: number; clients: number; pct: number };
const COLOR = { cible: "#94a3b8", en_cours: "#f59e0b", client: "#16a34a" } as const;
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/** Carte du territoire : un point par établissement (gris = à prospecter, orange = en cours, vert = client) et un cercle par commune, d'autant plus vert qu'elle est couverte. */
export function TerritoryMap({ points, cities, zone, height = 560 }: { points: TerPoint[]; cities: TerCity[]; zone: string; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: any, dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      map = L.map(el.current, { preferCanvas: true, scrollWheelZoom: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      const canvas = L.canvas({ padding: 0.4 });
      for (const c of cities) {
        const col = c.pct >= 50 ? "#16a34a" : c.pct >= 10 ? "#84cc16" : c.pct > 0 ? "#f59e0b" : "#94a3b8";
        L.circle([c.lat, c.lng], { renderer: canvas, radius: 350 + Math.min(1800, Math.sqrt(c.total) * 120), color: col, weight: 1, fillColor: col, fillOpacity: 0.12 + Math.min(0.4, c.pct / 200) })
          .bindPopup(`<b>${esc(c.city)}</b><br>${c.clients} client(s) sur ${c.total} établissement(s) · ${String(c.pct).replace(".", ",")} %`).addTo(map);
      }
      // Les clients et les prospects en cours sont dessinés en dernier, donc par-dessus.
      const order = { cible: 0, en_cours: 1, client: 2 } as const;
      for (const p of [...points].sort((a, b) => order[a.state] - order[b.state])) {
        L.circleMarker([p.lat, p.lng], { renderer: canvas, radius: p.state === "cible" ? 4 : 7, color: "#ffffff", weight: p.state === "cible" ? 0.5 : 1.5, fillColor: COLOR[p.state], fillOpacity: p.state === "cible" ? 0.75 : 1 })
          .bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.sub)}<br><a href="/veille/territoire?zone=${encodeURIComponent(zone)}&fiche=${p.id}#fiche">Ouvrir la fiche</a>`).addTo(map);
      }
      const pts = points.map((p) => [p.lat, p.lng] as [number, number]);
      if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30] }); else if (pts.length === 1) map.setView(pts[0], 13); else map.setView([49.05, 2.2], 10);
    })();
    return () => { dead = true; map?.remove(); };
  }, [points, cities, zone]);
  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-xl border" aria-label="Carte du territoire commercial" />;
}

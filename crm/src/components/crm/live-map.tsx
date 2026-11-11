"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type LiveCleaner = { id: string; name: string; lat: number; lng: number; online: boolean; live: boolean; seen: string; goingTo?: { lat: number; lng: number; title: string } | null };
export type LiveJob = { id: string; lat: number; lng: number; title: string; sub: string; status: "ouverte" | "acceptee" | "a_verifier" };
export type LiveZone = { lat: number; lng: number; label: string; jobs: number; online: number };

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const dot = (color: string, size = 18, pulse = false) => `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);${pulse ? "animation:lm-pulse 1.6s infinite;" : ""}"></span>`;

/** Carte en direct : nettoyeurs (en ligne / hors ligne), où ils vont, ménages en attente ou acceptés, et zones d'affluence. */
export function LiveMap({ cleaners, jobs, zones, height = 520 }: { cleaners: LiveCleaner[]; jobs: LiveJob[]; zones: LiveZone[]; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<{ L: any; map: any; layer: any; fitted: boolean } | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      if (!state.current) {
        const L = (await import("leaflet")).default;
        if (dead || !el.current) return;
        const map = L.map(el.current, { scrollWheelZoom: true });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
        state.current = { L, map, layer: L.layerGroup().addTo(map), fitted: false };
        map.setView([48.95, 2.3], 10);
      }
      const { L, map, layer } = state.current;
      layer.clearLayers();
      const pts: [number, number][] = [];
      for (const z of zones) {                                         // affluence : cercle d'autant plus grand et rouge qu'il y a de ménages en attente
        const c = z.jobs >= 3 ? "#dc2626" : z.jobs >= 1 ? "#f59e0b" : "#3b82f6";
        L.circle([z.lat, z.lng], { radius: 1500 + z.jobs * 900, color: c, fillColor: c, fillOpacity: 0.18, weight: 1 }).bindPopup(`<b>${esc(z.label)}</b><br>${z.jobs} ménage(s) en attente<br>${z.online} nettoyeur(s) en ligne`).addTo(layer);
      }
      for (const j of jobs) {
        const color = j.status === "ouverte" ? "#dc2626" : j.status === "acceptee" ? "#1d6fe0" : "#f59e0b";
        L.marker([j.lat, j.lng], { icon: L.divIcon({ className: "", html: dot(color, 20, j.status === "ouverte"), iconSize: [20, 20], iconAnchor: [10, 10] }) }).bindPopup(`<b>${esc(j.title)}</b><br>${esc(j.sub)}`).addTo(layer);
        pts.push([j.lat, j.lng]);
      }
      for (const c of cleaners) {
        if (c.goingTo) L.polyline([[c.lat, c.lng], [c.goingTo.lat, c.goingTo.lng]], { color: "#1d6fe0", weight: 3, dashArray: "6 8", opacity: 0.8 }).bindPopup(`${esc(c.name)} → ${esc(c.goingTo.title)}`).addTo(layer);
        L.marker([c.lat, c.lng], { icon: L.divIcon({ className: "", html: dot(c.online ? "#16a34a" : "#94a3b8", 22), iconSize: [22, 22], iconAnchor: [11, 11] }) }).bindPopup(`<b>${esc(c.name)}</b><br>${c.online ? "En ligne" : "Hors ligne"}<br>${c.live ? "Position GPS en direct" : "Position : son adresse"} · ${esc(c.seen)}`).addTo(layer);
        pts.push([c.lat, c.lng]);
      }
      if (!state.current.fitted && pts.length) { state.current.fitted = true; if (pts.length > 1) map.fitBounds(pts, { padding: [50, 50], maxZoom: 13 }); else map.setView(pts[0], 12); }
    })();
    return () => { dead = true; };
  }, [cleaners, jobs, zones]);
  useEffect(() => () => { state.current?.map.remove(); state.current = null; }, []);
  return (
    <>
      <style>{"@keyframes lm-pulse{0%{box-shadow:0 0 0 0 rgba(220,38,38,.6)}70%{box-shadow:0 0 0 14px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}"}</style>
      <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-xl border" aria-label="Carte en direct des nettoyeurs et des ménages" />
    </>
  );
}

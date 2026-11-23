"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { adminLiveAction } from "@/app/actions/live";
import { bookingLiveAction, partnerLiveAction } from "@/app/actions/nettoyeur";
import type { LiveJob } from "@/lib/live";

const hm = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");
const slot = (a: string, b: string) => `${a.slice(0, 5).replace(":", " h ")} – ${b.slice(0, 5).replace(":", " h ")}`;

/** Phrase d'état d'un ménage : pas parti, en route (heure d'arrivée), sur place, en contrôle. */
export function liveLine(j: LiveJob, now = Date.now()): { tone: "wait" | "go" | "here" | "check"; title: string; sub: string } {
  const who = j.cleaner ?? "Le nettoyeur";
  if (j.status === "a_reprendre") return { tone: "check", title: `${who} reprend des points`, sub: "Le contrôle a relevé des points à refaire." };
  if (j.status === "a_verifier") return { tone: "check", title: `${who} a terminé`, sub: "Le résultat est en cours de contrôle." };
  if (j.arrived_at) return { tone: "here", title: `${who} est sur place`, sub: `Arrivée à ${hm(j.arrived_at)}. Le ménage est en cours.` };
  if (j.moving) {
    const left = j.eta_at ? Math.max(0, Math.round((new Date(j.eta_at).getTime() - now) / 60000)) : null;
    return { tone: "go", title: `${who} est en route`, sub: j.eta_at ? `Arrivée estimée à ${hm(j.eta_at)}${left != null ? ` (dans ${left} min)` : ""}${j.eta_traffic ? ", trafic compris" : ""}.` : "Heure d'arrivée en cours de calcul." };
  }
  return { tone: "wait", title: `${who} n'est pas encore parti`, sub: `Créneau prévu : ${slot(j.window_start, j.window_end)}. Le trajet s'affichera ici dès son départ.` };
}

function JobMap({ j }: { j: LiveJob }) {
  const box = useRef<HTMLDivElement>(null);
  const state = useRef<{ map: any; L: any; layer: any; fitted: boolean } | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !box.current || state.current) return;
      const map = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      state.current = { map, L, layer: L.layerGroup().addTo(map), fitted: false };
      draw();
    })();
    return () => { dead = true; state.current?.map.remove(); state.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const draw = () => {
    const s = state.current; if (!s) return;
    const { L, map, layer } = s;
    layer.clearLayers();
    const pts: [number, number][] = [];
    if (j.trail.length > 1) L.polyline(j.trail, { color: "#1d6fe0", weight: 4, opacity: 0.75 }).addTo(layer);
    if (j.dest) { pts.push(j.dest); L.circleMarker(j.dest, { radius: 9, color: "#fff", weight: 3, fillColor: "#1e3a6e", fillOpacity: 1 }).addTo(layer).bindTooltip("Logement", { direction: "top" }); }
    if (j.pos) { pts.push(j.pos); L.circleMarker(j.pos, { radius: 10, color: "#fff", weight: 3, fillColor: "#1d6fe0", fillOpacity: 1 }).addTo(layer).bindTooltip(j.cleaner ?? "Nettoyeur", { direction: "top", permanent: true }); }
    if (!pts.length) return;
    if (pts.length === 1) { if (!s.fitted) map.setView(pts[0], 14); }
    else map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 15, animate: s.fitted });
    s.fitted = true;
  };
  useEffect(draw); // à chaque nouvelle position
  return <div ref={box} className="h-64 w-full overflow-hidden rounded-2xl" role="img" aria-label={`Carte du trajet vers ${j.title}`} />;
}

/**
 * Suivi en direct des ménages du jour : phrase d'état, heure d'arrivée estimée et carte du trajet.
 * Se met à jour toutes les 10 secondes tant que l'onglet est visible. La position n'est montrée que pendant le trajet.
 */
export function LiveTracking({ mode, token, initial, showClient = false }: { mode: "booking" | "partner" | "admin"; token?: string; initial: LiveJob[]; showClient?: boolean }) {
  const [jobs, setJobs] = useState<LiveJob[]>(initial);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const next = mode === "admin" ? await adminLiveAction() : mode === "partner" ? await partnerLiveAction(token ?? "") : await bookingLiveAction(token ?? "");
      setJobs(next); setNow(Date.now());
    };
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [mode, token]);
  if (!jobs.length) return null;
  const dot = { wait: "bg-[#8a94a6]", go: "bg-[#1d6fe0]", here: "bg-[#1f9d6b]", check: "bg-[#d98a1f]" };
  return (
    <div className="space-y-3" aria-live="polite">
      {jobs.map((j) => {
        const l = liveLine(j, now);
        return (
          <section key={j.job} className="rounded-3xl border border-black/5 bg-[var(--a-card,#fff)] p-4 text-[var(--a-ink,#101828)]">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${dot[l.tone]} ${l.tone === "go" ? "animate-pulse" : ""}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--a-mute,#667085)]">{showClient && j.client ? `${j.client} · ` : ""}{j.title}</p>
                <p className="text-[18px] font-extrabold leading-snug">{showClient && j.cleaner_full ? l.title.replace(j.cleaner ?? "", j.cleaner_full) : l.title}</p>
                <p className="text-[14px] text-[var(--a-mute,#667085)]">{l.sub}</p>
              </div>
            </div>
            {(j.moving || j.arrived_at) && j.dest && <div className="mt-3"><JobMap j={j} /></div>}
            {j.moving && j.seen_at && <p className="mt-2 text-[12px] text-[var(--a-mute,#667085)]">Dernière position reçue à {hm(j.seen_at)}. Position partagée uniquement pendant le trajet.</p>}
          </section>
        );
      })}
    </div>
  );
}

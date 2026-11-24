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
  if (j.status === "a_reprendre") return { tone: "check", title: `${who} reprend des points`, sub: `Le contrôle a relevé des points à refaire.${j.rework_minutes ? ` Temps de reprise estimé : ${j.rework_minutes} min.` : ""}` };
  if (j.status === "a_verifier") return { tone: "check", title: `${who} a terminé`, sub: "Le résultat est en cours de contrôle." };
  if (j.arrived_at) return { tone: "here", title: `${who} est sur place`, sub: `Arrivée à ${hm(j.arrived_at)}. ${j.agent ? "La prestation" : "Le ménage"} est en cours.` };
  if (j.moving) {
    const left = j.eta_at ? Math.max(0, Math.round((new Date(j.eta_at).getTime() - now) / 60000)) : null;
    return { tone: "go", title: `${who} est en route`, sub: j.eta_at ? `Arrivée estimée à ${hm(j.eta_at)}${left != null ? ` (dans ${left} min)` : ""}${j.eta_traffic ? ", trafic compris" : j.mode === "transports" ? ", en transports (estimation)" : ""}.` : "Heure d'arrivée en cours de calcul." };
  }
  return { tone: "wait", title: `${who} n'est pas encore parti`, sub: `Créneau prévu : ${slot(j.window_start, j.window_end)}. Le trajet s'affichera ici dès son départ.` };
}

const dur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`);

/** Chrono du ménage : temps passé sur place depuis l'arrivée, durée prévue et heure de fin estimée. Avance tout seul. */
function OnSiteTimer({ j }: { j: LiveJob }) {
  const [now, setNow] = useState(() => Date.now());
  const running = !j.done_at && j.status === "acceptee";
  useEffect(() => { if (!running) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [running]);
  if (!j.arrived_at) return null;
  const start = new Date(j.arrived_at).getTime();
  const end = j.done_at ? new Date(j.done_at).getTime() : now;
  const sec = Math.max(0, Math.floor((end - start) / 1000));
  const clock = `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  // Durée estimée par l'analyse de la vidéo d'arrivée ; à défaut, la durée prévue au planning.
  const planned = j.est_minutes ?? (j.duration_hours ? Math.round(Number(j.duration_hours) * 60) : null);
  const left = planned != null ? planned - Math.floor(sec / 60) : null;
  const pct = planned ? Math.min(100, (sec / 60 / planned) * 100) : 0;
  return (
    <div className="mt-3 rounded-2xl bg-[var(--a-soft,#f0f4fc)] p-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--a-mute,#667085)]">{running ? "Sur place depuis" : "Temps passé sur place"}</p>
          <p className="num text-[28px] font-extrabold leading-none tabular-nums text-[var(--a-pri,#1e3a6e)]" role="timer" aria-live="off">{clock}</p>
        </div>
        {planned != null && (
          <p className="text-right text-[13px] text-[var(--a-mute,#667085)]">
            {j.est_minutes ? "Estimé par l'analyse" : "Prévu"} : {dur(planned)}<br />
            {running ? (left! > 0 ? <b className="text-[var(--a-ink,#101828)]">Fin estimée vers {hm(new Date(start + planned * 60000).toISOString())} (reste {dur(left!)})</b> : <b className="text-[#b45309]">Dépasse de {dur(-left!)}</b>) : null}
          </p>
        )}
      </div>
      {planned != null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><span className={`block h-full rounded-full ${left != null && left <= 0 ? "bg-[#d98a1f]" : "bg-[#1f9d6b]"}`} style={{ width: `${pct}%` }} /></div>}
    </div>
  );
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
    if (j.dest) { pts.push(j.dest); L.circleMarker(j.dest, { radius: 9, color: "#fff", weight: 3, fillColor: "#1e3a6e", fillOpacity: 1 }).addTo(layer).bindTooltip(j.agent ? "Site" : "Logement", { direction: "top" }); }
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
            <OnSiteTimer j={j} />
            {mode === "admin" && (j.status === "a_verifier" || j.status === "a_reprendre") && (
              <a href={`/nettoyeurs?tab=demandes#job-${j.job}`} className="mt-3 flex h-11 items-center justify-center rounded-full bg-[var(--a-pri,#1e3a6e)] px-5 text-[14px] font-extrabold text-white">Voir le compte rendu : tâches, captures, avis de l&apos;IA</a>
            )}
            {j.moving && j.dest && <div className="mt-3"><JobMap j={j} /></div>}
            {j.moving && j.seen_at && <p className="mt-2 text-[12px] text-[var(--a-mute,#667085)]">Dernière position reçue à {hm(j.seen_at)}. Position partagée uniquement pendant le trajet.</p>}
          </section>
        );
      })}
    </div>
  );
}

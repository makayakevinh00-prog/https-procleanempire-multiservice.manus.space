"use client";

import { useEffect, useRef, useState } from "react";
import { cleanerPingAction, cleanerTripAction, type CleanerTrip } from "@/app/actions/nettoyeur";

const hm = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");
/** À cette distance du logement (à vol d'oiseau), le nettoyeur est considéré comme arrivé. */
const ARRIVED_M = 120;

/**
 * « Je pars » : un seul bouton. Le trajet est alors partagé (position toutes les 15 secondes tant que l'application reste ouverte),
 * l'heure d'arrivée est calculée avec la circulation, et l'arrivée sur place est détectée toute seule (`onArrive`).
 */
export function TripPanel({ token, onArrive }: { token: string; onArrive?: () => void }) {
  const [trip, setTrip] = useState<CleanerTrip | null>(null);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState("");
  const [dist, setDist] = useState<number | null>(null);
  const lock = useRef<any>(null);
  const arrived = useRef(false);
  const cb = useRef(onArrive);
  cb.current = onArrive;
  const load = useRef(async () => {});
  useEffect(() => {
    let dead = false;
    load.current = async () => { const t = await cleanerTripAction(token); if (dead) return; setTrip(t); if (!t) setSharing(false); else if (localStorage.getItem(`pce:trajet:${t.job}`) === "1") setSharing(true); };
    void load.current();
    const i = setInterval(() => { if (document.visibilityState === "visible") void load.current(); }, 30_000);
    return () => { dead = true; clearInterval(i); };
  }, [token]);
  const tracking = sharing && !!trip;
  useEffect(() => {
    if (!tracking || !("geolocation" in navigator)) return;
    let last = 0, first = true;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last < 15_000) return;
        last = Date.now();
        void cleanerPingAction(token, p.coords.latitude, p.coords.longitude).then((r) => {
          if (!r) return;
          if (r.dist_m != null) setDist(r.dist_m);
          if (r.eta_minutes != null || first) { first = false; void load.current(); }
          // Sur place (position assez précise) : l'arrivée est pointée toute seule, une seule fois.
          if (r.dist_m != null && r.dist_m <= ARRIVED_M && p.coords.accuracy <= 100 && !arrived.current) { arrived.current = true; cb.current?.(); }
        });
      },
      (e) => { if (e.code === e.PERMISSION_DENIED) { setNote("Autorisez la localisation pour partager votre trajet."); setSharing(false); } },
      { enableHighAccuracy: true, maximumAge: 10_000 });
    // L'écran reste allumé pendant le trajet : un téléphone verrouillé n'envoie plus sa position.
    (navigator as any).wakeLock?.request("screen").then((l: any) => { lock.current = l; }).catch(() => undefined);
    return () => { navigator.geolocation.clearWatch(id); lock.current?.release?.().catch(() => undefined); lock.current = null; };
  }, [tracking, token]);
  if (!trip) return null;
  const start = () => { if (!("geolocation" in navigator)) { setNote("Ce téléphone ne donne pas sa position."); return; } localStorage.setItem(`pce:trajet:${trip.job}`, "1"); setNote(""); setSharing(true); };
  const stop = () => { localStorage.removeItem(`pce:trajet:${trip.job}`); setSharing(false); };
  const km = dist == null ? "" : dist < 1000 ? `${Math.max(50, Math.round(dist / 50) * 50)} m` : `${(dist / 1000).toFixed(1).replace(".", ",")} km`;
  if (!sharing) return (
    <section aria-live="polite">
      <button type="button" onClick={start} className="h-16 w-full rounded-full bg-[var(--a-pri)] text-[19px] font-extrabold text-white active:scale-[0.98]">Je pars</button>
      <p className="mt-2 text-center text-[13px] text-[var(--a-mute)]">Le client voit votre heure d&apos;arrivée. Sur place, la caméra s&apos;ouvre toute seule.</p>
      {note && <p role="status" className="mt-2 text-center text-[13px] font-semibold text-[var(--a-warn)]">{note}</p>}
    </section>
  );
  return (
    <section className="rounded-3xl bg-[var(--a-okbg)] p-5 text-center" aria-live="polite">
      <p className="text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-ok)]">En route</p>
      <p className="mt-1 text-[26px] font-extrabold leading-tight">{trip.eta_at ? `Arrivée à ${hm(trip.eta_at)}` : "Calcul du trajet…"}</p>
      <p className="mt-1 text-[14px] font-semibold text-[var(--a-mute)]">{[trip.eta_minutes != null ? `${trip.eta_minutes} min avec la circulation` : "", km ? `encore ${km}` : ""].filter(Boolean).join(" · ") || "Gardez l'application ouverte."}</p>
      <p className="mt-2 text-[13px] text-[var(--a-mute)]">Gardez l&apos;application ouverte : votre arrivée est détectée toute seule.</p>
      <button type="button" onClick={stop} className="mt-2 text-[13px] font-bold text-[var(--a-mute)] underline">Arrêter le partage</button>
      {note && <p role="status" className="mt-2 text-[13px] font-semibold text-[var(--a-warn)]">{note}</p>}
    </section>
  );
}

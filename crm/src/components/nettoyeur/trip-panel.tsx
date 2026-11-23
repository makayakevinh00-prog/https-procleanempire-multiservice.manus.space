"use client";

import { useEffect, useRef, useState } from "react";
import { cleanerPingAction, cleanerTripAction, type CleanerTrip } from "@/app/actions/nettoyeur";

const hm = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");

/**
 * Bandeau « Je pars » : le jour du ménage, le nettoyeur lance lui-même le partage de son trajet.
 * Sa position est alors envoyée toutes les 15 secondes, tant que l'application reste ouverte, et s'arrête à l'arrivée sur place.
 */
export function TripPanel({ token }: { token: string }) {
  const [trip, setTrip] = useState<CleanerTrip | null>(null);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState("");
  const lock = useRef<any>(null);
  useEffect(() => {
    let dead = false;
    const load = async () => { const t = await cleanerTripAction(token); if (dead) return; setTrip(t); if (!t) setSharing(false); else if (localStorage.getItem(`pce:trajet:${t.job}`) === "1") setSharing(true); };
    void load();
    const i = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => { dead = true; clearInterval(i); };
  }, [token]);
  useEffect(() => {
    if (!sharing || !trip || !("geolocation" in navigator)) return;
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      (p) => { if (Date.now() - last > 15_000) { last = Date.now(); void cleanerPingAction(token, p.coords.latitude, p.coords.longitude); } },
      (e) => { if (e.code === e.PERMISSION_DENIED) { setNote("Autorisez la localisation pour partager votre trajet."); setSharing(false); } },
      { enableHighAccuracy: true, maximumAge: 10_000 });
    // L'écran reste allumé pendant le trajet : un téléphone verrouillé n'envoie plus sa position.
    (navigator as any).wakeLock?.request("screen").then((l: any) => { lock.current = l; }).catch(() => undefined);
    return () => { navigator.geolocation.clearWatch(id); lock.current?.release?.().catch(() => undefined); lock.current = null; };
  }, [sharing, trip, token]);
  if (!trip) return null;
  const start = () => { if (!("geolocation" in navigator)) { setNote("Ce téléphone ne donne pas sa position."); return; } localStorage.setItem(`pce:trajet:${trip.job}`, "1"); setNote(""); setSharing(true); };
  const stop = () => { localStorage.removeItem(`pce:trajet:${trip.job}`); setSharing(false); };
  return (
    <section className={`mb-4 rounded-3xl p-4 ${sharing ? "bg-[var(--a-okbg)]" : "bg-[var(--a-card)]"}`} aria-live="polite">
      <p className="text-[12px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">Ménage de {trip.start.replace(":", " h ")}{trip.city ? ` · ${trip.city}` : ""}</p>
      <p className="mt-0.5 text-[18px] font-extrabold leading-snug">{sharing ? (trip.eta_at ? `Arrivée estimée à ${hm(trip.eta_at)}` : "Trajet partagé") : trip.title}</p>
      <p className="mt-1 text-[13px] text-[var(--a-mute)]">{sharing ? "Votre trajet est visible par ProClean et par le client jusqu'à votre arrivée. Gardez l'application ouverte." : "En partant, appuyez sur « Je pars » : le client voit votre trajet et votre heure d'arrivée. Rien n'est partagé avant, ni après votre arrivée."}</p>
      <div className="mt-3 flex gap-2">
        {sharing
          ? <button type="button" onClick={stop} className="h-12 flex-1 rounded-2xl border border-[var(--a-pri)] text-[15px] font-extrabold text-[var(--a-pri)]">Arrêter le partage</button>
          : <button type="button" onClick={start} className="h-12 flex-1 rounded-2xl bg-[var(--a-pri)] text-[16px] font-extrabold text-white active:scale-[0.98]">Je pars</button>}
      </div>
      {note && <p role="status" className="mt-2 text-[13px] font-semibold text-[var(--a-warn)]">{note}</p>}
    </section>
  );
}

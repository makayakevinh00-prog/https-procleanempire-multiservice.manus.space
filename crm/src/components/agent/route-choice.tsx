"use client";

import { useEffect, useState } from "react";
import { Car, TrainFront } from "lucide-react";

export type TravelMode = "voiture" | "transports";
export const modeKey = (id: string) => `pce:mode:${id}`;
/** Moyen de transport choisi pour ce trajet (gardé sur le téléphone). */
export function savedMode(id: string): TravelMode {
  try { return localStorage.getItem(modeKey(id)) === "transports" ? "transports" : "voiture"; } catch { return "voiture"; }
}

/**
 * Choix de l'itinéraire au départ : en voiture, Waze s'ouvre avec le trajet depuis la position du téléphone ;
 * en transports, Plans (iPhone) ou Google Maps (Android) propose le trajet le plus rapide.
 */
export function RouteChoice({ id, address, onPick }: { id: string; address: string; onPick?: (m: TravelMode) => void }) {
  const [mode, setMode] = useState<TravelMode | null>(null);
  const [ios, setIos] = useState(true);
  useEffect(() => {
    setIos(/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent));
    try { const m = localStorage.getItem(modeKey(id)); if (m === "voiture" || m === "transports") setMode(m); } catch { /* stockage indisponible */ }
  }, [id]);
  const q = encodeURIComponent(address);
  const waze = `https://waze.com/ul?q=${q}&navigate=yes`;
  const transit = ios ? `https://maps.apple.com/?daddr=${q}&dirflg=r` : `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit`;
  const pick = (m: TravelMode) => { setMode(m); try { localStorage.setItem(modeKey(id), m); } catch { /* sans effet */ } onPick?.(m); };
  const btn = (on: boolean) => `flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2 text-center text-[15px] font-extrabold active:scale-[0.98] ${on ? "border-[var(--a-pri)] bg-[var(--a-pri)] text-white" : "border-[var(--a-pri)] bg-[var(--a-card)] text-[var(--a-pri)]"}`;
  return (
    <div>
      <p className="mb-2 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">Votre itinéraire</p>
      <div className="flex gap-2">
        <a href={waze} target="_blank" rel="noopener noreferrer" onClick={() => pick("voiture")} className={btn(mode === "voiture")}><Car className="h-6 w-6" aria-hidden />En voiture · Waze</a>
        <a href={transit} target="_blank" rel="noopener noreferrer" onClick={() => pick("transports")} className={btn(mode === "transports")}><TrainFront className="h-6 w-6" aria-hidden />En transports · {ios ? "Plans" : "Maps"}</a>
      </div>
      <p className="mt-2 text-[12px] text-[var(--a-mute)]">Le trajet part de votre position. Revenez sur l&apos;application en arrivant : l&apos;arrivée se pointe toute seule.</p>
    </div>
  );
}

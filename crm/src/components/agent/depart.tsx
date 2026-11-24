"use client";

import { useState } from "react";
import { Car, TrainFront, X } from "lucide-react";
import { modeKey, routeLinks, type TravelMode } from "@/components/agent/route-choice";

/**
 * « Je pars » : un seul bouton. Il demande comment la personne s'y rend, ouvre Waze (voiture) ou Plans (transports)
 * avec le trajet depuis sa position, et passe la mission « en route » : le trajet est partagé, l'arrivée se pointe toute seule.
 */
export function DepartButton({ id, label, address, depart, className }: { id: string; label: string; address: string | null; depart: () => Promise<void> | void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = (m?: TravelMode) => { if (m) { try { localStorage.setItem(modeKey(id), m); } catch { /* sans effet */ } } setBusy(true); setOpen(false); void depart(); };
  const links = address ? routeLinks(address) : null;
  const big = "flex min-h-[88px] flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl bg-[var(--a-pri)] px-3 py-3 text-center text-[16px] font-extrabold text-white active:scale-[0.98]";
  return (
    <>
      <button type="button" disabled={busy} onClick={() => (links ? setOpen(true) : go())} className={className ?? "h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white active:opacity-90 disabled:opacity-60"}>{busy ? "C'est parti…" : label}</button>
      {open && links && (
        <div className="fixed inset-0 z-50 flex items-end bg-white/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Comment y allez-vous ?" onClick={() => setOpen(false)}>
          <div className="w-full rounded-t-3xl border-t border-[var(--a-soft)] bg-[var(--a-card)] p-5 pb-8 shadow-[0_-12px_40px_rgba(16,24,40,0.12)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <b className="text-[20px]">Comment y allez-vous ?</b>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-full p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-3">
              <a href={links.waze} target="_blank" rel="noopener noreferrer" onClick={() => go("voiture")} className={big}><Car className="h-7 w-7" aria-hidden />En voiture<span className="text-[13px] font-semibold opacity-90">Ouvrir Waze</span></a>
              <a href={links.transit} target="_blank" rel="noopener noreferrer" onClick={() => go("transports")} className={big}><TrainFront className="h-7 w-7" aria-hidden />En transports<span className="text-[13px] font-semibold opacity-90">Trajet le plus rapide</span></a>
            </div>
            <button type="button" onClick={() => go()} className="mt-4 w-full text-center text-[14px] font-bold text-[var(--a-mute)] underline">Partir sans itinéraire</button>
            <p className="mt-3 text-center text-[12px] text-[var(--a-mute)]">Votre trajet est partagé jusqu&apos;à l&apos;arrivée, qui se pointe toute seule sur place.</p>
          </div>
        </div>
      )}
    </>
  );
}

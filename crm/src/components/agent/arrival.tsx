"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

type CheckIn = (lat: number | null, lng: number | null, acc: number | null) => Promise<{ error?: string } | void>;

const FIRST = [
  "Pointez en arrivant : l'application le fait avec votre position, rien d'autre à faire.",
  "AVANT de toucher à quoi que ce soit : une photo de chaque pièce, telle que vous la trouvez. C'est ce qui vous protège en cas de réclamation.",
  "Travaillez du haut vers le bas, du fond de la pièce vers la porte : poussières d'abord, sols en dernier.",
  "Cuisine et salle de bain en priorité : plans de travail, évier, plaques, douche, WC, miroirs, robinetterie sans traces.",
  "Si c'est un logement de location : literie refaite, linge propre en place, poubelles vidées, rien d'oublié par les voyageurs.",
  "Un objet cassé, une tache impossible, un oubli du client : signalez-le tout de suite avec une photo (bouton « Signaler un problème »).",
  "À la fin : une photo APRÈS de chaque pièce, puis cochez la check-list et terminez la mission.",
];
const SITE = [
  "Nouveau lieu pour vous : lisez l'accès et les consignes ci-dessous avant de commencer.",
  "Photos AVANT de chaque pièce avant de toucher à quoi que ce soit, puis photos APRÈS à la fin.",
  "Un doute, un dégât, un objet oublié : signalez-le avec une photo.",
];

/**
 * Arrivée sur place : à l'ouverture de la mission du jour, la localisation est demandée et l'arrivée est pointée toute seule
 * (le serveur vérifie que le téléphone est bien dans le rayon du site). Si la personne n'a jamais fait ce lieu (ou jamais travaillé),
 * un rappel des grandes lignes du process s'affiche une seule fois.
 */
export function ArrivalAssistant({ checkIn, auto, briefing, site, storeKey }: { checkIn: CheckIn; auto: boolean; briefing: "first" | "site" | null; site: string | null; storeKey: string }) {
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!briefing) return;
    try { if (localStorage.getItem(storeKey) === "1") return; } catch { /* stockage indisponible : on affiche */ }
    setOpen(true);
  }, [briefing, storeKey]);

  useEffect(() => {
    if (!auto || started.current || typeof navigator === "undefined" || !navigator.geolocation) return;
    started.current = true;
    navigator.geolocation.getCurrentPosition(
      (p) => { void checkIn(p.coords.latitude, p.coords.longitude, p.coords.accuracy).then((r) => { if (r && r.error) setMsg(r.error); }).catch(() => undefined); },
      (e) => setMsg(e.code === 1 ? "Localisation refusée : autorisez-la dans les réglages du téléphone pour que l'arrivée se pointe toute seule." : "Position introuvable pour le moment : utilisez le bouton « Arrivée » une fois sur place."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [auto, checkIn]);

  function close() { setOpen(false); try { localStorage.setItem(storeKey, "1"); } catch { /* sans effet */ } }
  const lines = briefing === "first" ? FIRST : SITE;

  return (
    <>
      {auto && !msg && <div role="status" className="flex items-center gap-2 rounded-2xl bg-[var(--a-soft)] p-3 text-[14px] font-bold text-[var(--a-pri)]"><MapPin className="h-5 w-5" />Localisation en cours : votre arrivée se pointe toute seule.</div>}
      {msg && <div role="status" className="rounded-2xl bg-[var(--a-warnbg)] p-3 text-[14px] font-semibold text-[var(--a-warn)]">{msg}</div>}
      {open && (
        <div className="rounded-2xl border-2 border-[var(--a-pri)] bg-[var(--a-card)] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <b className="text-[17px]">{briefing === "first" ? "Bienvenue ! L'essentiel à retenir" : `Première fois${site ? ` chez ${site}` : " sur ce lieu"}`}</b>
            <button type="button" onClick={close} aria-label="Fermer" className="rounded-full p-1"><X className="h-5 w-5" /></button>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px]">{lines.map((l) => <li key={l}>{l}</li>)}</ol>
          <button type="button" onClick={close} className="mt-3 h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">J&apos;ai compris</button>
        </div>
      )}
    </>
  );
}

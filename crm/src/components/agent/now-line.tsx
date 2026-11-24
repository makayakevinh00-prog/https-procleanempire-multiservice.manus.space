"use client";

import { useEffect, useRef, useState } from "react";

const parisMinutes = () => {
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  return Number(p.find((x) => x.type === "hour")?.value ?? 0) * 60 + Number(p.find((x) => x.type === "minute")?.value ?? 0);
};

/** Barre rouge de l'heure qu'il est sur la frise du jour : elle descend toute seule, et l'écran s'y place à l'ouverture (sauf si une carte « en cours » ou « prochain rendez-vous » est affichée au-dessus). */
export function NowLine({ firstHour, hours, row, scroll = true }: { firstHour: number; hours: number; row: number; scroll?: boolean }) {
  const [min, setMin] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  useEffect(() => {
    const tick = () => setMin(parisMinutes());
    tick();
    const i = setInterval(tick, 30_000);
    const vis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, []);
  useEffect(() => { if (scroll && min != null && !placed.current && ref.current) { placed.current = true; ref.current.scrollIntoView({ block: "center" }); } }, [min, scroll]);
  if (min == null) return null;
  const top = ((min - firstHour * 60) / 60) * row;
  if (top < 0 || top > hours * row) return null;
  const label = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  return (
    <div ref={ref} aria-label={`Il est ${label}`} className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: top - 9 }}>
      <span className="num rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white">{label}</span>
      <span className="h-[2px] flex-1 bg-[#dc2626]" />
    </div>
  );
}

/** « Dans 25 min », « dans 1 h 10 » : se met à jour tout seul. */
export function Countdown({ time }: { time: string }) {
  const [min, setMin] = useState<number | null>(null);
  useEffect(() => { const tick = () => setMin(parisMinutes()); tick(); const i = setInterval(tick, 30_000); return () => clearInterval(i); }, []);
  if (min == null) return null;
  const d = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) - min;
  if (d <= 0) return <>c&apos;est l&apos;heure</>;
  return <>dans {d >= 60 ? `${Math.floor(d / 60)} h ${String(d % 60).padStart(2, "0")}` : `${d} min`}</>;
}

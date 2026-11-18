"use client";

import { useEffect, useRef } from "react";

/** Effets du mode Jarvis : halo lumineux qui suit le curseur, onde au clic, cartes qui s'inclinent vers la souris. Inactif hors mode Jarvis et si l'on demande moins d'animations. */
export function HudFx() {
  const glow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const on = () => document.documentElement.dataset.hud === "on";
    const move = (e: PointerEvent) => {
      if (!on()) return;
      if (glow.current) glow.current.style.transform = `translate(${e.clientX - 160}px, ${e.clientY - 160}px)`;
      const card = (e.target as HTMLElement | null)?.closest?.(".bg-card") as HTMLElement | null;
      document.querySelectorAll<HTMLElement>(".hud-tilt").forEach((c) => { if (c !== card) { c.style.transform = ""; c.classList.remove("hud-tilt"); } });
      if (card && card.getBoundingClientRect().width < 700) {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add("hud-tilt");
        card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateZ(0)`;
      }
    };
    const click = (e: MouseEvent) => {
      if (!on()) return;
      const d = document.createElement("span");
      d.className = "hud-ripple"; d.style.left = `${e.clientX}px`; d.style.top = `${e.clientY}px`;
      document.body.appendChild(d); setTimeout(() => d.remove(), 700);
    };
    window.addEventListener("pointermove", move, { passive: true }); window.addEventListener("click", click);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("click", click); };
  }, []);
  return <div ref={glow} className="hud-glow" aria-hidden />;
}

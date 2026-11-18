"use client";

import { useEffect } from "react";

/**
 * Deux touches de vie pour tout le CRM, sans rien afficher :
 * le reflet des cartes suit la souris, et la « pièce qui s'allume » ne se joue qu'une fois par ouverture.
 */
export function Alive() {
  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const card = (e.target as Element | null)?.closest?.(".pce-card") as HTMLElement | null;
        if (!card) return;
        const box = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - box.left}px`);
        card.style.setProperty("--my", `${e.clientY - box.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    try { sessionStorage.setItem("pce-lit", "1"); } catch {}
    const off = window.setTimeout(() => document.documentElement.classList.remove("lights-on"), 1800);
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      window.clearTimeout(off);
    };
  }, []);
  return null;
}

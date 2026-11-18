"use client";

import { useEffect, useState } from "react";

/** Ouverture « en loupe » : une seule fois par session, seulement avec le style Vert dépoli (voir le CSS .intro-lens). */
export function IntroLens() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (document.documentElement.dataset.skin !== "verre" || sessionStorage.getItem("pce-intro") === "1") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      sessionStorage.setItem("pce-intro", "1");
      setOn(true);
    } catch { /* sans effet */ }
  }, []);
  if (!on) return null;
  return <div className="intro-lens" aria-hidden onAnimationEnd={(e) => { if (e.animationName === "lens-open") setOn(false); }} />;
}

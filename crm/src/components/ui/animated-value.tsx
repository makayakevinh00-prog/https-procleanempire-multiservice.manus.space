"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** « 12 480,50 € » → { pre: "", n: 12480.5, dec: 2, post: " €" }. Texte sans chiffre : pas d'animation. */
function parse(text: string) {
  const m = /^([^\d-]*)(-?\d[\d\s  ]*(?:,\d+)?)(.*)$/.exec(text);
  if (!m) return null;
  const raw = m[2].replace(/[\s  ]/g, "").replace(",", ".");
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return { pre: m[1], n, dec: (m[2].split(",")[1] ?? "").length, post: m[3] };
}

/** Un chiffre qui défile comme un compteur quand il apparaît ou change. Le texte final est toujours celui du serveur. */
export function AnimatedValue({ value, className }: { value: string | number; className?: string }) {
  const text = typeof value === "number" ? value.toLocaleString("fr-FR") : value;
  const [shown, setShown] = useState(text);
  const prev = useRef<number | null>(null);
  useIso(() => {
    const p = parse(text);
    if (!p || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(text); return; }
    const from = prev.current ?? 0, to = p.n, t0 = performance.now(), dur = 900;
    let raf = 0;
    const fmt = (v: number) => `${p.pre}${v.toLocaleString("fr-FR", { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec })}${p.post}`;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setShown(k < 1 ? fmt(from + (to - from) * e) : text);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setShown(fmt(from));
    raf = requestAnimationFrame(tick);
    prev.current = to;
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return <span className={`num ${className ?? ""}`} aria-label={text}>{shown}</span>;
}

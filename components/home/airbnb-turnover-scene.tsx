"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Box, Cleaner, FLOOR, H, P, SIZE, Sparkle, T, WALL_L, WALL_R, pts, type Tone } from "@/components/home/clean-room-scene";

/**
 * Scène animée « Ménage Airbnb » : un studio en coupe entre deux voyageurs.
 * 0 · Départ 11 h  : lit défait, serviettes au sol, restes sur la table
 * 1 · Ménage       : la femme de ménage passe, tout se range, le lit se fait
 * 2 · Arrivée 14 h : lit impeccable, 5 étoiles
 * Boucle toute seule (pause hors écran), cliquable ; dessin 100 % original en SVG.
 */

const DURATIONS = [3400, 6400, 4800];
const SWEEP = 5.8; // secondes de passage
const SLAB: Tone = { top: "#eceef3", left: "#d3d7e0", right: "#c2c7d3" };
const EDGE: Tone = { top: "#ffffff", left: "#dfe3ec", right: "#cdd2de" };
const LINEN: Tone = { top: "#fbfcff", left: "#d9dfec", right: "#c3cbdc" };
const BED_WOOD: Tone = { top: "#b88a5a", left: "#98703f", right: "#7b5830" };
const STEPS = [
  { h: "11 h", l: "Départ des voyageurs" },
  { h: "11 h – 14 h", l: "Ménage complet" },
  { h: "14 h", l: "Arrivée suivante" }
];

// Parcours sans traverser les meubles (lit à gauche/fond, cuisine à droite/fond, table, canapé).
const PATH: [number, number][] = [[8.8, 9.2], [2.6, 9.2], [2.6, 8.1], [8.8, 8.1], [8.8, 5.3], [6.2, 5.3], [6.2, 2.8], [8.8, 2.8], [5.6, 4.9], [2.4, 4.9], [2.4, 9.2], [8.8, 9.2]];

const DIRT: { x: number; y: number; r: number; t: number }[] = [
  { x: 8.2, y: 8.8, r: 0.8, t: 0.05 }, { x: 5.4, y: 9.0, r: 0.7, t: 0.14 }, { x: 3.2, y: 8.7, r: 0.9, t: 0.2 },
  { x: 5.2, y: 8.0, r: 0.8, t: 0.34 }, { x: 8.6, y: 6.6, r: 0.9, t: 0.42 }, { x: 7.0, y: 5.0, r: 0.7, t: 0.5 },
  { x: 7.4, y: 3.4, r: 0.8, t: 0.6 }, { x: 6.2, y: 3.8, r: 0.6, t: 0.66 }, { x: 4.6, y: 5.2, r: 0.8, t: 0.76 },
  { x: 3.0, y: 5.4, r: 0.7, t: 0.82 }, { x: 2.5, y: 7.4, r: 0.9, t: 0.9 }
];

function starPath(r: number) {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.44;
    p.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${p.join("L")}Z`;
}

export function AirbnbTurnoverScene() {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap, { amount: 0.3 });
  const [phase, setPhase] = useState(reduce ? 2 : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    const id = window.setTimeout(() => setPhase((p) => (p + 1) % 3), DURATIONS[phase]);
    return () => window.clearTimeout(id);
  }, [phase, inView, reduce]);

  const cleaning = phase === 1;
  const done = phase === 2;
  const messy = phase === 0;
  const xs = PATH.map(([x, y]) => P(x, y)[0]);
  const ys = PATH.map(([x, y]) => P(x, y)[1]);
  const fade = (delay = 0) => ({ duration: 0.7, delay: cleaning && !reduce ? delay : 0 });

  return (
    <div ref={wrap} className="relative flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <svg viewBox="0 0 660 590" className="h-full w-full" role="img" aria-label="Un logement Airbnb passe de l'état « départ des voyageurs » à l'état « prêt pour l'arrivée » grâce au ménage ProClean" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="ab-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="ab-soft" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="11" /></filter>
            <linearGradient id="ab-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8cc4ff" /><stop offset="1" stopColor="#e4f2ff" /></linearGradient>
            <linearGradient id="ab-shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.4" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
          </defs>

          {/* dalle + sol parquet clair */}
          {/* ombre portée douce sous la pièce */}
          <ellipse cx="330" cy="552" rx="210" ry="20" fill="#0b1b3a" opacity="0.14" filter="url(#ab-soft)" />
          <Box x={0} y={0} z={-0.7} w={SIZE} d={SIZE} h={0.7} tone={SLAB} />
          <polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, SIZE, 0], [0, SIZE, 0]])} fill="#e7d2ac" />
          <g transform={FLOOR} stroke="#d8bf94" strokeWidth="1">
            {Array.from({ length: SIZE - 1 }, (_, i) => <line key={i} x1="0" y1={i + 1} x2={SIZE} y2={i + 1} vectorEffect="non-scaling-stroke" />)}
          </g>
          <motion.polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, SIZE, 0], [0, SIZE, 0]])} fill="url(#ab-shine)" initial={false} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 1.2 }} />
          {/* tapis */}
          <g transform={FLOOR}><rect x="3.0" y="5.6" width="3.6" height="3.0" rx="0.25" fill="#9fb8e8" /><rect x="3.25" y="5.85" width="3.1" height="2.5" rx="0.15" fill="none" stroke="#fff" strokeWidth="0.1" opacity="0.7" /></g>

          {/* murs clairs en coupe */}
          <polygon points={pts([[0, 0, 0], [0, SIZE, 0], [0, SIZE, H], [0, 0, H]])} fill="#e6e9f1" />
          <polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, 0, H], [0, 0, H]])} fill="#f4f5f9" />
          <Box x={-0.5} y={-0.5} z={0} w={0.5} d={SIZE + 0.5} h={H} tone={EDGE} />
          <Box x={0} y={-0.5} z={0} w={SIZE} d={0.5} h={H} tone={EDGE} />
          <polygon points={pts([[0, 0, 0], [0, SIZE, 0], [0, SIZE, H], [0, 0, H]])} fill="#e6e9f1" />
          <polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, 0, H], [0, 0, H]])} fill="#f4f5f9" />

          {/* fenêtre de jour (mur gauche) + rideau */}
          <g transform={WALL_L}>
            <rect x="2.6" y="1.7" width="4.4" height="3.1" fill="url(#ab-sky)" />
            <ellipse cx="3.9" cy="4.1" rx="0.9" ry="0.28" fill="#fff" opacity="0.9" /><ellipse cx="5.8" cy="3.5" rx="0.7" ry="0.22" fill="#fff" opacity="0.8" />
            <rect x="2.6" y="1.7" width="4.4" height="3.1" fill="none" stroke="#9aa6bd" strokeWidth="0.16" />
            <line x1="4.8" y1="1.7" x2="4.8" y2="4.8" stroke="#9aa6bd" strokeWidth="0.1" />
            <rect x="2.35" y="1.5" width="0.9" height="3.6" fill="#ffffff" opacity="0.95" /><rect x="6.4" y="1.5" width="0.9" height="3.6" fill="#ffffff" opacity="0.95" />
          </g>
          {/* tête de lit + cadre (mur droit) */}
          <g transform={WALL_R}>
            <rect x="2.3" y="3.0" width="1.9" height="1.4" rx="0.08" fill="#ffffff" stroke="#8a95ab" strokeWidth="0.12" />
            <polygon points="2.45,3.15 3.1,3.95 3.55,3.45 3.9,3.95 4.05,3.15" fill="#8fb4ee" transform="translate(0 0)" />
            <rect x="6.0" y="3.6" width="2.7" height="1.1" rx="0.08" fill="#fff" stroke="#c4ccdc" strokeWidth="0.1" />
            <rect x="9.2" y="1.4" width="0.1" height="0.1" fill="none" />
          </g>

          {/* néon bleu sur l'arête des murs */}
          <g filter="url(#ab-glow)" fill="none" stroke="#4f8ff7" strokeWidth="2.2" opacity="0.55" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={pts([[0, SIZE, H], [0, 0, H], [SIZE, 0, H]])} />
          </g>
          <polyline points={pts([[0, SIZE, H], [0, 0, H], [SIZE, 0, H]])} fill="none" stroke="#7fb0ff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />

          {/* poussière au sol : s'efface au passage */}
          <g transform={FLOOR}>
            {DIRT.map((d, i) => (
              <motion.g key={i} initial={false} animate={{ opacity: messy ? 1 : 0 }} transition={cleaning && !reduce ? { duration: 0.7, delay: d.t * SWEEP + 0.4 } : { duration: 0.5 }}>
                <ellipse cx={d.x} cy={d.y} rx={d.r} ry={d.r * 0.7} fill="#8a6a45" opacity="0.5" />
                <ellipse cx={d.x + 0.15} cy={d.y - 0.1} rx={d.r * 0.55} ry={d.r * 0.4} fill="#6b4f30" opacity="0.45" />
              </motion.g>
            ))}
          </g>
          {/* ── Lit (contre le mur droit) ── */}
          <Box x={1.3} y={0.1} w={3.2} d={0.35} h={2.3} tone={BED_WOOD} />
          <Box x={1.4} y={0.4} w={3.0} d={4.1} h={0.55} tone={BED_WOOD} />
          <Box x={1.5} y={0.5} w={2.8} d={3.9} z={0.55} h={0.5} tone={LINEN} />
          {/* lit défait : couette froissée qui pend, oreillers de travers */}
          <motion.g initial={false} animate={{ opacity: messy ? 1 : 0 }} transition={fade(1.6)}>
            <polygon points={pts([[1.5, 1.8, 1.08], [4.3, 1.5, 1.08], [4.3, 4.1, 1.08], [1.7, 3.9, 1.08]])} fill="#8fa2c6" />
            <polygon points={pts([[4.3, 1.5, 1.08], [4.3, 4.1, 1.08], [4.3, 3.6, 0.35], [4.3, 2.1, 0.2]])} fill="#6f84ab" />
            <polyline points={pts([[1.9, 2.4, 1.1], [3.0, 2.8, 1.1], [4.0, 2.4, 1.1]])} fill="none" stroke="#6f84ab" strokeWidth="1.6" strokeLinecap="round" />
            <polyline points={pts([[2.0, 3.4, 1.1], [3.2, 3.1, 1.1], [4.1, 3.5, 1.1]])} fill="none" stroke="#6f84ab" strokeWidth="1.6" strokeLinecap="round" />
            <Box x={1.7} y={0.6} z={1.05} w={1.0} d={0.8} h={0.3} tone={LINEN} />
            <Box x={3.0} y={1.0} z={1.05} w={1.0} d={0.8} h={0.3} tone={T.white} />
          </motion.g>
          {/* lit fait : couette lisse, chemin de lit bleu, oreillers droits, serviette pliée */}
          <motion.g initial={false} animate={{ opacity: done || cleaning ? 1 : 0 }} transition={cleaning && !reduce ? { duration: 0.9, delay: 3.6 } : { duration: 0.6 }}>
            <Box x={1.45} y={1.7} z={1.05} w={2.9} d={2.75} h={0.28} tone={LINEN} />
            <Box x={1.45} y={3.1} z={1.33} w={2.9} d={0.75} h={0.05} tone={T.blue} />
            <Box x={1.8} y={0.55} z={1.05} w={1.0} d={0.8} h={0.32} tone={LINEN} />
            <Box x={3.1} y={0.55} z={1.05} w={1.0} d={0.8} h={0.32} tone={LINEN} />
            <Box x={2.3} y={3.2} z={1.38} w={1.3} d={0.5} h={0.14} tone={{ top: "#eaf2ff", left: "#c9d8f2", right: "#b2c4e6" }} />
          </motion.g>
          {/* table de chevet + lampe */}
          <Box x={4.8} y={0.2} w={0.9} d={0.9} h={1.0} tone={BED_WOOD} />
          <Box x={5.15} y={0.55} z={1.0} w={0.2} d={0.2} h={0.6} tone={T.grey} />
          {(() => { const [px, py] = P(5.25, 0.65, 1.8); return <><circle cx={px} cy={py} r={done ? 26 : 16} fill="#ffe8a8" opacity={done ? 0.35 : 0.15} /><circle cx={px} cy={py} r="8" fill="#fff3c8" /></>; })()}

          {/* ── Cuisine (mur droit) ── */}
          <Box x={6.2} y={0.2} w={2.6} d={1.3} h={1.7} tone={LINEN} />
          <Box x={6.1} y={0.15} z={1.7} w={2.8} d={1.4} h={0.12} tone={T.dark} />
          <Box x={6.6} y={0.5} z={1.82} w={0.6} d={0.55} h={0.5} tone={T.dark} />
          <Box x={9.0} y={0.2} w={0.9} d={1.2} h={3.5} tone={T.white} />
          <g transform={WALL_R}><rect x="6.2" y="3.5" width="2.5" height="1.1" rx="0.06" fill="#ffffff" stroke="#c4ccdc" strokeWidth="0.08" /></g>

          {/* ── Canapé (mur gauche) ── */}
          <Box x={0.4} y={5.6} w={1.6} d={3.0} h={0.8} tone={T.green} />
          <Box x={0.4} y={5.6} w={0.5} d={3.0} z={0.8} h={0.9} tone={T.green} />
          <Box x={0.4} y={5.4} w={1.6} d={0.35} h={1.2} tone={T.green} />
          <Box x={0.4} y={8.55} w={1.6} d={0.35} h={1.2} tone={T.green} />
          <Box x={1.0} y={6.6} z={0.8} w={0.7} d={0.8} h={0.5} tone={{ top: "#f5c9a0", left: "#e0ad7e", right: "#c98f60" }} />

          {/* ── Table basse ── */}
          <Box x={3.3} y={6.0} w={2.0} d={1.4} h={0.7} tone={T.white} />
          {/* restes (départ) */}
          <motion.g initial={false} animate={{ opacity: messy ? 1 : 0 }} transition={fade(2.4)}>
            <Box x={3.5} y={6.2} z={0.7} w={0.35} d={0.35} h={0.28} tone={T.white} />
            <Box x={3.55} y={6.25} z={0.98} w={0.25} d={0.25} h={0.02} tone={{ top: "#5a3a22", left: "#5a3a22", right: "#5a3a22" }} />
            <Box x={4.2} y={6.4} z={0.7} w={0.8} d={0.65} h={0.1} tone={T.box} />
            <Box x={4.35} y={6.5} z={0.8} w={0.2} d={0.2} h={0.35} tone={{ top: "#7bd08a", left: "#4fa860", right: "#3d8a4e" }} />
          </motion.g>
          {/* fleurs + panier d'accueil (prêt) */}
          <motion.g initial={false} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 0.8, delay: done ? 0.8 : 0 }}>
            <Box x={3.6} y={6.3} z={0.7} w={0.35} d={0.35} h={0.45} tone={T.blue} />
            {(() => { const [px, py] = P(3.78, 6.48, 1.35); return [[0, 0, "#ff8fab"], [-9, 5, "#ffd166"], [9, 4, "#ff8fab"], [0, -9, "#ffffff"]].map(([dx, dy, c], i) => <circle key={i} cx={px + (dx as number)} cy={py + (dy as number)} r="6" fill={c as string} />); })()}
            <Box x={4.4} y={6.35} z={0.7} w={0.7} d={0.6} h={0.22} tone={{ top: "#d9b07a", left: "#b88d58", right: "#9a7447" }} />
            <Box x={4.55} y={6.45} z={0.92} w={0.25} d={0.2} h={0.1} tone={T.white} />
          </motion.g>

          {/* serviettes + sac poubelle au sol (départ) */}
          <motion.g initial={false} animate={{ opacity: messy ? 1 : 0 }} transition={fade(1.9)}>
            <Box x={7.0} y={6.6} w={1.0} d={0.8} h={0.22} tone={T.white} />
            <Box x={7.2} y={6.7} z={0.22} w={0.7} d={0.6} h={0.16} tone={{ top: "#cfe0ff", left: "#aac3ee", right: "#90abd8" }} />
            {(() => { const [px, py] = P(8.7, 7.6, 0.45); return <><ellipse cx={px} cy={py + 8} rx="19" ry="8" fill="#000" opacity="0.2" /><path d={`M${px - 18} ${py + 6} q-2 -26 18 -28 q20 2 18 28 q-18 8 -36 0 Z`} fill="#2f3646" /><path d={`M${px - 5} ${py - 22} q5 -9 10 0`} stroke="#2f3646" strokeWidth="3" fill="none" /></>; })()}
          </motion.g>
          {/* linge propre rangé : pile de serviettes sur le canapé */}
          <motion.g initial={false} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 0.8, delay: done ? 0.6 : 0 }}>
            <Box x={1.1} y={7.3} z={0.8} w={0.7} d={0.6} h={0.12} tone={T.white} />
            <Box x={1.1} y={7.3} z={0.92} w={0.7} d={0.6} h={0.12} tone={{ top: "#cfe0ff", left: "#aac3ee", right: "#90abd8" }} />
          </motion.g>

          {/* panneau « sol glissant » + femme de ménage */}
          {cleaning && (() => { const [px, py] = P(2.6, 9.7); return <g transform={`translate(${px} ${py})`}><g><ellipse cx="0" cy="1" rx="11" ry="3.4" fill="#000" opacity="0.25" /><path d="M-9 0 L0 -28 L9 0 Z" fill="#f5c518" /><path d="M-5.8 -2 L0 -19 L5.8 -2 Z" fill="#f9dc5c" /><circle cx="0" cy="-9" r="2" fill="#2a2f3c" /><rect x="-1" y="-15" width="2" height="5" rx="1" fill="#2a2f3c" /></g></g>; })()}
          {cleaning && (
            reduce ? (
              <g transform={`translate(${xs[3]} ${ys[3]})`}><Cleaner walking={false} /></g>
            ) : (
              <motion.g key="cleaner-ab" initial={{ x: xs[0], y: ys[0] }} animate={{ x: xs, y: ys }} transition={{ duration: SWEEP, ease: "linear" }}>
                <Cleaner walking />
              </motion.g>
            )
          )}
          {done && (() => { const [px, py] = P(6.6, 8.9); return <g transform={`translate(${px} ${py}) scale(-1 1)`}><Cleaner walking={false} /></g>; })()}

          {/* étincelles + 5 étoiles quand c'est prêt */}
          {(cleaning || done) && !reduce && (
            <g>{[[2.8, 8.6, 0.2], [6, 7.0, 0.7], [8.4, 5.0, 1.1], [3.6, 5.2, 0.4], [7, 3.2, 1.5], [5, 8.8, 1.9]].map(([x, y, d], i) => <Sparkle key={i} x={x} y={y} delay={d} big={i % 3 === 0} />)}</g>
          )}
          <AnimatePresence>
            {done && (
              <motion.g key="stars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                {[0, 1, 2, 3, 4].map((i) => {
                  const [bx, by] = P(2.9, 2.4, 4.6);
                  const px = bx + (i - 2) * 36;
                  const py = by + Math.abs(i - 2) * 9;
                  return (
                    <motion.g key={i} transform={`translate(${px} ${py})`}>
                      <motion.path d={starPath(15)} fill="#ffc233" stroke="#fff3c4" strokeWidth="1.5" strokeLinejoin="round" filter="url(#ab-glow)" initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: reduce ? 0 : 0.5 + i * 0.22 }} />
                    </motion.g>
                  );
                })}
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        {/* carte flottante selon la phase */}
        <AnimatePresence mode="wait">
          <motion.div key={phase} className="pointer-events-none absolute right-[3%] top-[5%] hidden w-[44%] max-w-[230px] rounded-2xl border border-black/5 bg-white/75 p-4 text-left shadow-[0_18px_50px_-18px_rgba(10,20,50,0.35)] backdrop-blur-xl sm:block" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
            {phase === 0 && (<>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1d6fe0]">Départ · 11 h</p>
              <p className="mt-2 text-base font-semibold text-ink">Les voyageurs sont partis</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Lit défait, serviettes au sol, cuisine à remettre en ordre.</p>
            </>)}
            {phase === 1 && (<>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1d6fe0]">Ménage en cours</p>
              {["Linge changé, lit refait", "Cuisine et salle de bain", "Sols lavés, poubelles sorties"].map((l, i) => (
                <motion.div key={l} className="mt-2.5 flex items-center gap-2 text-xs text-ink" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.35 }}>
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[#1d6fe0]/12 text-[9px] text-[#1d6fe0]">✓</span>{l}
                </motion.div>
              ))}
            </>)}
            {phase === 2 && (<>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#15803d]">Prêt · 14 h</p>
              <p className="mt-2 text-base font-semibold text-ink">Prêt pour l&apos;arrivée</p>
              <p className="mt-1 text-lg tracking-widest text-[#ffc233]" aria-label="Cinq étoiles">★★★★★</p>
              <p className="mt-1 text-xs text-slate-500">Un logement qui donne envie de laisser cinq étoiles.</p>
            </>)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* frise : départ → ménage → arrivée (cliquable) */}
      <div className="relative z-10 px-4 pb-4 pt-2 sm:px-6">
        <div className="relative mb-3 h-1 rounded-full bg-black/10">
          <motion.div className="h-full rounded-full bg-[#1d6fe0]" initial={false} animate={{ width: ["10%", "55%", "100%"][phase] }} transition={{ duration: 0.8, ease: "easeInOut" }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <button key={s.h} type="button" onClick={() => setPhase(i)} aria-pressed={phase === i} className={`rounded-xl px-2 py-2 text-left transition-colors ${phase === i ? "bg-white shadow-[0_2px_10px_rgba(10,20,50,0.12)]" : "hover:bg-black/5"}`}>
              <span className={`block text-xs font-bold tabular-nums sm:text-sm ${phase === i ? "text-[#1d6fe0]" : "text-slate-400"}`}>{s.h}</span>
              <span className={`block text-[11px] leading-tight sm:text-xs ${phase === i ? "text-ink" : "text-slate-400"}`}>{s.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

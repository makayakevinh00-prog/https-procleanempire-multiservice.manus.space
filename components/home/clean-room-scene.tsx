"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Scène isométrique animée « ProClean » : une pièce en coupe qui évolue avec l'étape du processus.
 * 0 · Votre demande  : pièce encombrée et poussiéreuse, formulaire flottant
 * 1 · Devis          : mêmes lieux, cotes de la surface + devis flottant
 * 2 · Intervention   : la femme de ménage passe la pièce, la saleté disparaît, des étincelles
 * 3 · Résultat       : pièce impeccable, contrôle qualité validé
 * Dessin 100 % original, en SVG (aucune image externe) ; respecte « réduire les animations ».
 */

// ─── Projection isométrique ───────────────────────────────────────────────
const S = 33;                 // pixels par unité
const C = Math.cos(Math.PI / 6);
const OX = 330, OY = 206;      // position écran du coin arrière (0,0,0)
const SIZE = 10;              // pièce de 10 × 10 unités
const H = 5.6;                // hauteur des murs

const P = (x: number, y: number, z = 0): [number, number] => [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S];
const pts = (a: [number, number, number][]) => a.map(([x, y, z]) => P(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");
const FLOOR = `matrix(${C * S} ${0.5 * S} ${-C * S} ${0.5 * S} ${OX} ${OY})`;               // plan du sol : (x,y)
const WALL_L = `matrix(${-C * S} ${0.5 * S} 0 ${-S} ${OX} ${OY})`;                          // mur gauche (x=0) : (y,z)
const WALL_R = `matrix(${C * S} ${0.5 * S} 0 ${-S} ${OX} ${OY})`;                           // mur droit  (y=0) : (x,z)

type Tone = { top: string; left: string; right: string };
const T = {
  green: { top: "#3f8a68", left: "#2f6b4f", right: "#255641" },
  wood: { top: "#7a4a24", left: "#5f3a1c", right: "#4b2d15" },
  dark: { top: "#3b4252", left: "#2a303c", right: "#1f242d" },
  white: { top: "#f4f6fb", left: "#d5dae6", right: "#bcc3d3" },
  grey: { top: "#8d96a8", left: "#6f788b", right: "#59616f" },
  box: { top: "#d9b07a", left: "#b88d58", right: "#9a7447" },
  pot: { top: "#c26a3d", left: "#a4552d", right: "#864323" },
  rug: { top: "#2b3d6b", left: "#2b3d6b", right: "#2b3d6b" },
  blue: { top: "#4d8bf0", left: "#2f6fd6", right: "#2459ae" }
} satisfies Record<string, Tone>;

/** Pavé droit : 3 faces visibles (dessus, face +y, face +x). */
function Box({ x, y, z = 0, w, d, h, tone, opacity = 1 }: { x: number; y: number; z?: number; w: number; d: number; h: number; tone: Tone; opacity?: number }) {
  const z1 = z + h;
  return (
    <g opacity={opacity}>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z1], [x, y + d, z1]])} fill={tone.left} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z1], [x + w, y, z1]])} fill={tone.right} />
      <polygon points={pts([[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]])} fill={tone.top} />
    </g>
  );
}

// ─── Saleté : disparaît quand la femme de ménage passe ────────────────────
// (x, y, rayon, ordre de passage 0..1 le long du parcours en zigzag)
const DIRT: { x: number; y: number; r: number; t: number; kind: "dust" | "stain" | "paper" | "cup" }[] = [
  { x: 8.6, y: 8.4, r: 0.9, t: 0.04, kind: "dust" }, { x: 6.4, y: 8.8, r: 0.6, t: 0.12, kind: "paper" },
  { x: 4.2, y: 8.2, r: 1.0, t: 0.2, kind: "stain" }, { x: 2.4, y: 8.6, r: 0.5, t: 0.26, kind: "cup" },
  { x: 2.8, y: 6.6, r: 0.8, t: 0.36, kind: "dust" }, { x: 5.2, y: 6.2, r: 1.1, t: 0.44, kind: "stain" },
  { x: 7.6, y: 6.8, r: 0.6, t: 0.5, kind: "paper" }, { x: 8.4, y: 4.6, r: 0.9, t: 0.58, kind: "dust" },
  { x: 5.8, y: 4.2, r: 0.5, t: 0.66, kind: "cup" }, { x: 3.4, y: 4.6, r: 1.0, t: 0.74, kind: "stain" },
  { x: 7.2, y: 2.8, r: 0.7, t: 0.84, kind: "dust" }, { x: 4.8, y: 2.6, r: 0.6, t: 0.9, kind: "paper" }
];
const SWEEP_SECONDS = 9;

function Sparkle({ x, y, delay, big = false }: { x: number; y: number; delay: number; big?: boolean }) {
  const [px, py] = P(x, y, 0.2);
  const r = big ? 9 : 6;
  return (
    <motion.g
      transform={`translate(${px} ${py})`}
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: [0, 1, 0], scale: [0.2, 1, 0.2], rotate: [0, 45, 90] }}
      transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
    >
      <path d={`M0 ${-r} L${r * 0.28} ${-r * 0.28} L${r} 0 L${r * 0.28} ${r * 0.28} L0 ${r} L${-r * 0.28} ${r * 0.28} L${-r} 0 L${-r * 0.28} ${-r * 0.28} Z`} fill="#ffffff" />
    </motion.g>
  );
}

// ─── La femme de ménage (silhouette plate, 100 % originale) ───────────────
function Cleaner({ walking }: { walking: boolean }) {
  const swing = (deg: number, delay = 0) => ({
    animate: walking ? { rotate: [-deg, deg] } : { rotate: 0 },
    transition: walking ? { duration: 0.42, repeat: Infinity, repeatType: "reverse" as const, ease: "easeInOut" as const, delay } : { duration: 0.3 }
  });
  return (
    <g>
      <ellipse cx="0" cy="2" rx="15" ry="5.5" fill="#000" opacity="0.28" />
      {/* jambes */}
      <motion.g style={{ originX: "-5px", originY: "-24px" }} {...swing(16)}><rect x="-8" y="-24" width="6.5" height="24" rx="3" fill="#1f2a44" /><rect x="-9.5" y="-4" width="9" height="5" rx="2.5" fill="#fff" /></motion.g>
      <motion.g style={{ originX: "5px", originY: "-24px" }} {...swing(16, 0.21)}><rect x="1.5" y="-24" width="6.5" height="24" rx="3" fill="#1f2a44" /><rect x="0.5" y="-4" width="9" height="5" rx="2.5" fill="#fff" /></motion.g>
      {/* buste : blouse bleue + tablier blanc */}
      <rect x="-11" y="-52" width="22" height="31" rx="8" fill="#1d6fe0" />
      <path d="M-8 -45 h16 v22 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 Z" fill="#f3f6fc" />
      <rect x="-8" y="-45" width="16" height="3" fill="#cfd8ea" />
      {/* bras arrière */}
      <motion.g style={{ originX: "-10px", originY: "-48px" }} {...swing(12, 0.2)}><rect x="-14" y="-48" width="6" height="22" rx="3" fill="#1d6fe0" /><circle cx="-11" cy="-25" r="3.6" fill="#e3b08a" /></motion.g>
      {/* tête, chignon, bandeau */}
      <circle cx="0" cy="-61" r="9" fill="#e8b994" />
      <circle cx="-2" cy="-72" r="5.2" fill="#3a2a22" />
      <path d="M-9 -63 a9 9 0 0 1 18 0 c-4 -5 -14 -5 -18 0 Z" fill="#3a2a22" />
      <rect x="-9" y="-65" width="18" height="2.6" rx="1.3" fill="#fff" />
      <circle cx="-3" cy="-60" r="0.9" fill="#3a2a22" /><circle cx="3" cy="-60" r="0.9" fill="#3a2a22" />
      <path d="M-2.4 -56.5 q2.4 1.8 4.8 0" stroke="#b5654f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* bras avant + balai-serpillière */}
      <motion.g style={{ originX: "10px", originY: "-48px" }} {...swing(10)}>
        <rect x="8" y="-48" width="6" height="22" rx="3" fill="#1d6fe0" />
        <circle cx="11" cy="-25" r="3.6" fill="#e3b08a" />
        <rect x="10" y="-64" width="2.6" height="68" rx="1.3" fill="#9aa4b8" transform="rotate(8 11 -25)" />
        <path d="M15 4 q4 -3 11 -1 l-3 7 h-12 Z" fill="#7fb3ff" />
      </motion.g>
    </g>
  );
}

function WetSign() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="11" ry="3.4" fill="#000" opacity="0.25" />
      <path d="M-9 0 L0 -28 L9 0 Z" fill="#f5c518" /><path d="M-5.8 -2 L0 -19 L5.8 -2 Z" fill="#f9dc5c" />
      <circle cx="0" cy="-9" r="2" fill="#2a2f3c" /><rect x="-1" y="-15" width="2" height="5" rx="1" fill="#2a2f3c" />
    </g>
  );
}

// ─── Parcours de la femme de ménage (coordonnées de la pièce) ─────────────
const PATH: [number, number][] = [[6.8, 9.5], [3.6, 9.5], [3.6, 8.4], [6.8, 8.4], [8.4, 7.2], [8.4, 3.8], [6.6, 3.8], [6.6, 6.0], [5.0, 7.2], [3.6, 7.2], [6.8, 9.5]];

export function CleanRoomScene({ stage }: { stage: number }) {
  const reduce = useReducedMotion();
  const cleaning = stage === 2;
  const done = stage >= 3;
  const dirtVisible = stage <= 1;

  const xs = PATH.map(([x, y]) => P(x, y)[0]);
  const ys = PATH.map(([x, y]) => P(x, y)[1]);

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 660 600" className="h-full w-full" role="img" aria-label="Illustration d'une pièce nettoyée par une équipe ProClean" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d1b3d" /><stop offset="0.6" stopColor="#3b3a6b" /><stop offset="1" stopColor="#e08a5a" /></linearGradient>
          <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.28" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
          <clipPath id="winL"><rect x="2.3" y="1.9" width="4.4" height="2.9" /></clipPath>
        </defs>

        {/* dalle + sol */}
        <Box x={0} y={0} z={-0.7} w={SIZE} d={SIZE} h={0.7} tone={T.dark} />
        <polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, SIZE, 0], [0, SIZE, 0]])} fill="#c98a45" />
        <g transform={FLOOR} stroke="#b57634" strokeWidth="1" vectorEffect="non-scaling-stroke">
          {Array.from({ length: SIZE - 1 }, (_, i) => <line key={i} x1="0" y1={i + 1} x2={SIZE} y2={i + 1} vectorEffect="non-scaling-stroke" />)}
        </g>
        {/* reflet sur le sol quand c'est propre */}
        <motion.polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, SIZE, 0], [0, SIZE, 0]])} fill="url(#shine)" initial={false} animate={{ opacity: done ? 1 : cleaning ? 0.5 : 0 }} transition={{ duration: 1.2 }} />
        {/* tapis */}
        <g transform={FLOOR}><rect x="2.4" y="3.4" width="5.2" height="3.6" rx="0.25" fill="#2b3d6b" /><rect x="2.65" y="3.65" width="4.7" height="3.1" rx="0.15" fill="none" stroke="#7da2e8" strokeWidth="0.1" /></g>

        {/* murs en coupe */}
        <polygon points={pts([[0, 0, 0], [0, SIZE, 0], [0, SIZE, H], [0, 0, H]])} fill="#2c313d" />
        <polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, 0, H], [0, 0, H]])} fill="#353b49" />
        <Box x={-0.5} y={-0.5} z={0} w={0.5} d={SIZE + 0.5} h={H} tone={T.grey} opacity={1} />
        <Box x={0} y={-0.5} z={0} w={SIZE} d={0.5} h={H} tone={T.grey} opacity={1} />
        <polygon points={pts([[0, 0, 0], [0, SIZE, 0], [0, SIZE, H], [0, 0, H]])} fill="#2c313d" />
        <polygon points={pts([[0, 0, 0], [SIZE, 0, 0], [SIZE, 0, H], [0, 0, H]])} fill="#353b49" />

        {/* fenêtre (mur gauche) avec ville la nuit */}
        <g transform={WALL_L}>
          <rect x="2.3" y="1.9" width="4.4" height="2.9" fill="url(#sky)" />
          <g clipPath="url(#winL)">
            {[[2.5, 1.9, 0.7, 1.5], [3.3, 1.9, 0.6, 2.2], [4, 1.9, 0.8, 1.2], [4.9, 1.9, 0.6, 1.9], [5.6, 1.9, 0.9, 1.4]].map(([x, z, w, h], i) => (
              <g key={i}><rect x={x} y={z} width={w} height={h} fill="#141a33" />
                {[0.25, 0.55, 0.85].map((f, j) => <rect key={j} x={x + 0.12} y={z + h * f} width="0.12" height="0.16" fill="#ffd27a" />)}</g>
            ))}
          </g>
          <rect x="2.3" y="1.9" width="4.4" height="2.9" fill="none" stroke="#1b1f29" strokeWidth="0.18" />
          <line x1="4.5" y1="1.9" x2="4.5" y2="4.8" stroke="#1b1f29" strokeWidth="0.1" />
        </g>
        {/* tableau liège + notes (mur droit) */}
        <g transform={WALL_R}>
          <rect x="3.2" y="2.5" width="3" height="2" rx="0.1" fill="#b98550" stroke="#6b4a2a" strokeWidth="0.12" />
          {[[3.5, 3.5, "#ffe48a"], [4.4, 3.8, "#ff9ab0"], [5.2, 3.3, "#9be0ff"], [4, 2.8, "#ffffff"]].map(([x, z, c], i) => <rect key={i} x={x as number} y={z as number} width="0.7" height="0.7" fill={c as string} />)}
        </g>

        {/* néon bleu sur l'arête des murs */}
        <g filter="url(#glow)" fill="none" stroke="#5b9bff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={pts([[0, SIZE, H], [0, 0, H], [SIZE, 0, H]])} />
        </g>
        <polyline points={pts([[0, SIZE, H], [0, 0, H], [SIZE, 0, H]])} fill="none" stroke="#bcd7ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* saleté au sol */}
        <g transform={FLOOR}>
          {DIRT.map((d, i) => (
            <motion.g key={i} initial={false}
              animate={{ opacity: dirtVisible ? 1 : 0 }}
              transition={cleaning && !reduce ? { duration: 0.8, delay: d.t * SWEEP_SECONDS + 0.5 } : { duration: dirtVisible ? 0.6 : 0.4 }}>
              {d.kind === "dust" && <><ellipse cx={d.x} cy={d.y} rx={d.r} ry={d.r * 0.8} fill="#7a5a3a" opacity="0.55" /><ellipse cx={d.x + 0.2} cy={d.y - 0.1} rx={d.r * 0.6} ry={d.r * 0.45} fill="#5c4228" opacity="0.5" /></>}
              {d.kind === "stain" && <><ellipse cx={d.x} cy={d.y} rx={d.r} ry={d.r * 0.7} fill="#4a3320" opacity="0.5" /><circle cx={d.x + d.r * 0.8} cy={d.y + 0.2} r={d.r * 0.22} fill="#4a3320" opacity="0.5" /></>}
              {d.kind === "paper" && <><circle cx={d.x} cy={d.y} r={d.r * 0.32} fill="#f1f1ee" /><circle cx={d.x + 0.35} cy={d.y + 0.2} r={d.r * 0.22} fill="#dcdcd6" /></>}
              {d.kind === "cup" && <><circle cx={d.x} cy={d.y} r={d.r * 0.32} fill="#e8e4dc" /><circle cx={d.x} cy={d.y} r={d.r * 0.2} fill="#5a3a22" /><circle cx={d.x + 0.5} cy={d.y + 0.3} r={d.r * 0.5} fill="#5a3a22" opacity="0.35" /></>}
            </motion.g>
          ))}
        </g>

        {/* mobilier, du fond vers l'avant */}
        {/* bibliothèque (mur droit) */}
        <Box x={6.6} y={0.1} w={3} d={0.9} h={4.2} tone={T.wood} />
        {[1, 2, 3].map((k) => <g key={k}>{[0, 1, 2, 3, 4].map((j) => <polygon key={j} points={pts([[6.8 + j * 0.55, 1.0, k * 1.05 + 0.1], [7.25 + j * 0.55, 1.0, k * 1.05 + 0.1], [7.25 + j * 0.55, 1.0, k * 1.05 + 0.85 - (j % 2) * 0.2], [6.8 + j * 0.55, 1.0, k * 1.05 + 0.85 - (j % 2) * 0.2]])} fill={["#4d8bf0", "#e6e6e6", "#e08a5a", "#6bc29a", "#c9a0ff"][(j + k) % 5]} />)}</g>)}
        {/* plante dans l'angle */}
        <Box x={0.4} y={0.5} w={1.1} d={1.1} h={0.9} tone={T.pot} />
        {[[0.95, 1.05, 1.9, 0.9], [0.6, 0.8, 2.3, 0.7], [1.3, 0.8, 2.2, 0.75], [0.9, 0.7, 2.8, 0.6]].map(([x, y, z, r], i) => { const [px, py] = P(x, y, z); return <circle key={i} cx={px} cy={py} r={r * S * 0.55} fill={["#2f9e6b", "#3fbf84", "#258a5b", "#46c98e"][i]} />; })}
        {/* canapé vert (contre le mur droit) */}
        <Box x={2.2} y={0.6} w={3.8} d={1.5} h={0.8} tone={T.green} />
        <Box x={2.2} y={0.6} w={3.8} d={0.5} z={0.8} h={0.9} tone={T.green} />
        <Box x={2.0} y={0.6} w={0.5} d={1.5} z={0} h={1.2} tone={T.green} />
        <Box x={5.7} y={0.6} w={0.5} d={1.5} z={0} h={1.2} tone={T.green} />
        {/* bureau + ordinateur (mur gauche) */}
        <Box x={0.5} y={5.4} w={1.6} d={3.4} h={1.9} tone={T.wood} />
        <Box x={0.7} y={6.7} z={1.9} w={0.7} d={1.1} h={0.08} tone={T.dark} />
        <polygon points={pts([[0.75, 6.75, 1.98], [0.75, 7.75, 1.98], [0.75, 7.75, 2.9], [0.75, 6.75, 2.9]])} fill="#10151f" />
        <polygon points={pts([[0.78, 6.8, 2.1], [0.78, 7.7, 2.1], [0.78, 7.7, 2.8], [0.78, 6.8, 2.8]])} fill="#5b9bff" opacity="0.85" />
        {/* chaise de bureau */}
        <Box x={2.6} y={6.4} w={1.0} d={1.0} h={0.7} tone={T.dark} />
        <Box x={3.4} y={6.4} w={0.25} d={1.0} z={0.7} h={1.0} tone={T.dark} />
        {/* table basse + carton */}
        <Box x={3.4} y={3.8} w={2.2} d={1.5} h={0.7} tone={T.white} />
        <Box x={8.0} y={7.8} w={1.3} d={1.3} h={1.0} tone={T.box} />
        <Box x={8.2} y={8.0} z={1.0} w={0.9} d={0.9} h={0.7} tone={T.box} />
        {/* lampadaire */}
        <Box x={9.2} y={3.0} w={0.18} d={0.18} h={3.6} tone={T.grey} />
        {(() => { const [px, py] = P(9.3, 3.1, 3.9); return <><circle cx={px} cy={py} r="26" fill="#ffd27a" opacity={done ? 0.28 : 0.12} /><circle cx={px} cy={py} r="9" fill="#ffe9ae" /></>; })()}

        {/* panneau « sol glissant » + femme de ménage */}
        {cleaning && (() => { const [px, py] = P(2.9, 9.6); return <g transform={`translate(${px} ${py})`}><WetSign /></g>; })()}
        {cleaning && (
          reduce ? (
            <g transform={`translate(${xs[3]} ${ys[3]})`}><Cleaner walking={false} /></g>
          ) : (
            <motion.g key="cleaner-moving" initial={{ x: xs[0], y: ys[0] }} animate={{ x: xs, y: ys }}
              transition={{ duration: SWEEP_SECONDS, ease: "linear", repeat: Infinity, repeatDelay: 0.6 }}>
              <Cleaner walking />
            </motion.g>
          )
        )}
        {done && (() => { const [px, py] = P(6.4, 9.2); return <g transform={`translate(${px} ${py}) scale(-1 1)`}><Cleaner walking={false} /></g>; })()}

        {/* étincelles */}
        {(cleaning || done) && !reduce && (
          <g>
            {[[2.6, 8.4, 0.2], [6, 7.2, 0.7], [8.4, 5.2, 1.1], [3.6, 5.8, 0.4], [7, 3.2, 1.5], [5, 8.8, 1.9], [4.4, 2.4, 0.9]].map(([x, y, d], i) => (
              <Sparkle key={i} x={x} y={y} delay={d} big={i % 3 === 0} />
            ))}
          </g>
        )}

        {/* cotes de la surface (étape devis) */}
        <AnimatePresence>
          {stage === 1 && (
            <motion.g key="dims" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
              <g transform={FLOOR} stroke="#7fb3ff" strokeWidth="1.6" fill="none" strokeDasharray="5 4" vectorEffect="non-scaling-stroke">
                <polyline points={`0.2,${SIZE + 0.9} ${SIZE - 0.2},${SIZE + 0.9}`} vectorEffect="non-scaling-stroke" />
                <polyline points={`${SIZE + 0.9},0.2 ${SIZE + 0.9},${SIZE - 0.2}`} vectorEffect="non-scaling-stroke" />
              </g>
              {(() => { const [ax, ay] = P(SIZE / 2, SIZE + 1.6); const [bx, by] = P(SIZE + 1.6, SIZE / 2); return <>
                <g transform={`translate(${ax} ${ay + 8})`}><rect x="-26" y="-12" width="52" height="22" rx="11" fill="#5b9bff" /><text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="700" fill="#06091a">Largeur</text></g>
                <g transform={`translate(${bx + 6} ${by + 8})`}><rect x="-30" y="-12" width="60" height="22" rx="11" fill="#5b9bff" /><text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="700" fill="#06091a">Longueur</text></g></>; })()}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* cartes flottantes selon l'étape */}
      <AnimatePresence mode="wait">
        <motion.div key={stage} className="pointer-events-none absolute inset-0 hidden sm:block" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}>
          {stage === 0 && (
            <div className="absolute right-[3%] top-[7%] w-[46%] max-w-[230px] rounded-2xl border border-white/15 bg-[#0e1530]/90 p-4 text-left shadow-2xl backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b9bff]">Votre demande</p>
              {["Type de local", "Surface", "Fréquence"].map((l, i) => (
                <motion.div key={l} className="mt-2.5 flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white/80" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.35 }}>
                  {l}<span className="text-[#5ee2a0]">✓</span>
                </motion.div>
              ))}
              <p className="mt-3 text-[11px] text-white/50">≈ 2 minutes</p>
            </div>
          )}
          {stage === 1 && (
            <div className="absolute right-[3%] top-[7%] w-[46%] max-w-[230px] rounded-2xl border border-white/15 bg-[#0e1530]/90 p-4 text-left shadow-2xl backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b9bff]">Devis</p>
              <p className="mt-2 text-base font-semibold text-white">Détaillé, clair</p>
              <div className="mt-3 space-y-1.5">{[88, 64, 76].map((w, i) => <motion.div key={i} className="h-2 rounded bg-white/15" initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: 0.4 + i * 0.25, duration: 0.6 }} />)}</div>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#5b9bff]/20 px-2.5 py-1 text-[11px] font-semibold text-[#9cc4ff]">Sous 24 h · sans engagement</p>
            </div>
          )}
          {stage === 2 && (
            <div className="absolute right-[3%] top-[7%] w-[46%] max-w-[230px] rounded-2xl border border-white/15 bg-[#0e1530]/90 p-4 text-left shadow-2xl backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b9bff]">Intervention</p>
              {["Produits professionnels", "Matériel fourni", "Selon votre horaire"].map((l, i) => (
                <motion.div key={l} className="mt-2.5 flex items-center gap-2 text-xs text-white/85" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.3 }}>
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[#5b9bff]/25 text-[9px] text-[#9cc4ff]">✓</span>{l}
                </motion.div>
              ))}
            </div>
          )}
          {stage === 3 && (
            <div className="absolute right-[3%] top-[7%] w-[46%] max-w-[230px] rounded-2xl border border-[#5ee2a0]/30 bg-[#0e1530]/90 p-4 text-left shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3">
                <motion.span className="grid h-10 w-10 place-items-center rounded-full bg-[#5ee2a0] text-lg font-bold text-[#06091a]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.4, stiffness: 260, damping: 14 }}>✓</motion.span>
                <div><p className="text-sm font-semibold text-white">Contrôle qualité</p><p className="text-[11px] text-white/55">Validé avant notre départ</p></div>
              </div>
              <p className="mt-3 text-[11px] text-white/60">Un point à corriger ? Nous revenons sans supplément.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

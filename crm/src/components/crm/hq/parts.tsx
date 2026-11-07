import { memo } from "react";
import type { AgentKey } from "@/lib/jarvis/types";
import type { Pose } from "@/lib/jarvis/hq/layout";

/**
 * Éléments graphiques des locaux : personnages, mobilier, accessoires.
 * Aucune animation continue au repos : toute animation est portée par une classe d'attitude (`pose-*`) posée uniquement
 * quand l'état ENREGISTRÉ de l'agent le justifie. Voir lib/jarvis/hq/layout.ts (poseOf).
 */
export type WhoKey = AgentKey | "owner";

interface Look {
  skin: string;
  hair: string;
  hs: "short" | "long" | "curly" | "bald" | "bun";
  outfit: string;
  trim: string;
  acc: string;
  beard?: boolean;
  glasses?: boolean;
}
export const LOOK: Record<WhoKey, Look> = {
  owner: {
    skin: "#c58d6a",
    hair: "#1c1511",
    hs: "short",
    outfit: "#26344d",
    trim: "#d9dee8",
    acc: "tie",
    beard: true,
  },
  core: {
    skin: "#dbe9f7",
    hair: "#dbe9f7",
    hs: "bald",
    outfit: "#c9b57f",
    trim: "#fff4d1",
    acc: "holo",
  },
  finance: {
    skin: "#e7b995",
    hair: "#3b2a22",
    hs: "short",
    outfit: "#3f8f80",
    trim: "#f4f7f6",
    acc: "calc",
    glasses: true,
  },
  commercial: {
    skin: "#c68a64",
    hair: "#1d1713",
    hs: "short",
    outfit: "#a95b35",
    trim: "#f6efe8",
    acc: "tie",
  },
  operations: {
    skin: "#f0c9a6",
    hair: "#7a4a22",
    hs: "short",
    outfit: "#35557f",
    trim: "#e8b923",
    acc: "vest",
  },
  relation: {
    skin: "#8d5a3b",
    hair: "#120d0a",
    hs: "curly",
    outfit: "#7d5c99",
    trim: "#efe9f5",
    acc: "headset",
  },
  marketing: {
    skin: "#efc7a3",
    hair: "#b5532a",
    hs: "long",
    outfit: "#b88a28",
    trim: "#fff",
    acc: "hoodie",
  },
  studio: {
    skin: "#d9a782",
    hair: "#2a1a3a",
    hs: "bun",
    outfit: "#b84f78",
    trim: "#f3dfe7",
    acc: "beret",
  },
  rh: {
    skin: "#f2cfae",
    hair: "#5a3a1c",
    hs: "long",
    outfit: "#648f45",
    trim: "#f2f6ee",
    acc: "badge",
  },
  juridique: {
    skin: "#b98862",
    hair: "#c9ccd1",
    hs: "bald",
    outfit: "#566177",
    trim: "#e9ecf2",
    acc: "robe",
    beard: true,
  },
};

const shade = (h: string, a: number) => {
  const n = parseInt(h.slice(1), 16),
    c = (v: number) => Math.max(0, Math.min(255, v));
  return `#${((1 << 24) + (c((n >> 16) + a) << 16) + (c(((n >> 8) & 255) + a) << 8) + c((n & 255) + a)).toString(16).slice(1)}`;
};

/** Personnage : tête, cheveux, visage, tenue de son métier. `pose` choisit l'attitude ; sans mouvement, le personnage est immobile. */
export const Avatar = memo(function Avatar({
  who,
  pose,
  x,
  y,
  scale = 1.3,
  dim,
}: {
  who: WhoKey;
  pose: Pose;
  x: number;
  y: number;
  scale?: number;
  dim?: boolean;
}) {
  const l = LOOK[who],
    holo = who === "core",
    s = scale,
    body = "M-13 -18 L-13 -40 Q-13 -46 -7 -46 L7 -46 Q13 -46 13 -40 L13 -18 Z";
  return (
    <g
      className={`hq-av pose-${pose}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        opacity: dim ? 0.35 : 1,
      }}
      aria-hidden
    >
      <ellipse
        cx={0}
        cy={2}
        rx={(20 * s) / 1.3}
        ry={6}
        fill="#000"
        opacity={0.22}
      />
      <g className="legs">
        <g className="legL">
          <rect
            x={-8}
            y={-22 * s}
            width={6.5}
            height={22 * s}
            rx={3}
            fill="#2a3040"
          />
          <ellipse cx={-4.7} cy={-1} rx={5.2} ry={2.7} fill="#12151c" />
        </g>
        <g className="legR">
          <rect
            x={1.5}
            y={-22 * s}
            width={6.5}
            height={22 * s}
            rx={3}
            fill="#2a3040"
          />
          <ellipse cx={4.8} cy={-1} rx={5.2} ry={2.7} fill="#12151c" />
        </g>
      </g>
      <g transform={`scale(${s})`}>
        <g className="bob">
          <g className="armL">
            <rect
              x={-18}
              y={-44}
              width={6}
              height={23}
              rx={3}
              fill={l.outfit}
              opacity={holo ? 0.7 : 1}
            />
            <circle cx={-15} cy={-20} r={3.3} fill={l.skin} />
          </g>
          <g className="armR">
            <rect
              x={12}
              y={-44}
              width={6}
              height={23}
              rx={3}
              fill={l.outfit}
              opacity={holo ? 0.7 : 1}
            />
            <circle cx={15} cy={-20} r={3.3} fill={l.skin} />
            <g className="paper">
              <rect
                x={9}
                y={-36}
                width={15}
                height={19}
                rx={1.5}
                fill="#fff"
                stroke="#c9ced6"
              />
              <line x1={11} y1={-31} x2={22} y2={-31} stroke="#9aa3b2" />
              <line x1={11} y1={-27} x2={20} y2={-27} stroke="#9aa3b2" />
              <line x1={11} y1={-23} x2={21} y2={-23} stroke="#9aa3b2" />
            </g>
          </g>
          <path d={body} fill={l.outfit} opacity={holo ? 0.78 : 1} />
          <path
            d="M-13 -18 L-13 -26 L13 -26 L13 -18 Z"
            fill="#000"
            opacity={0.12}
          />
          {holo &&
            [0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1={-12}
                y1={-42 + i * 6}
                x2={12}
                y2={-42 + i * 6}
                stroke="#fff4d1"
                strokeOpacity={0.3}
              />
            ))}
          <rect x={-3} y={-51} width={6} height={6} fill={l.skin} />
          <polygon points="-6,-46 0,-39 6,-46" fill={l.trim} opacity={0.95} />
          {l.acc === "tie" && (
            <polygon
              points="-2.6,-45 2.6,-45 3.4,-30 0,-26 -3.4,-30"
              fill={shade(l.outfit, -40)}
            />
          )}
          {l.acc === "vest" && (
            <>
              <path
                d="M-13 -42 L-4 -42 L-4 -18 L-13 -18 Z"
                fill={l.trim}
                opacity={0.95}
              />
              <path
                d="M13 -42 L4 -42 L4 -18 L13 -18 Z"
                fill={l.trim}
                opacity={0.95}
              />
              <rect
                x={-13}
                y={-30}
                width={26}
                height={2.4}
                fill="#fff"
                opacity={0.8}
              />
            </>
          )}
          {l.acc === "badge" && (
            <>
              <line x1={7.5} y1={-46} x2={7.5} y2={-40} stroke={l.trim} />
              <rect
                x={4}
                y={-40}
                width={7}
                height={10}
                rx={1.5}
                fill={l.trim}
              />
            </>
          )}
          {l.acc === "robe" && (
            <path
              d="M-13 -46 L0 -18 L13 -46 L8 -46 L0 -32 L-8 -46 Z"
              fill="#20252f"
            />
          )}
          {l.acc === "hoodie" && (
            <path
              d="M-9 -46 Q0 -40 9 -46"
              fill="none"
              stroke={shade(l.outfit, -30)}
              strokeWidth={3}
            />
          )}
          {[-11, 11].map((cx) => (
            <circle
              key={cx}
              cx={cx}
              cy={-57}
              r={2.6}
              fill={shade(l.skin, -18)}
            />
          ))}
          <g className="head">
            <circle
              cx={0}
              cy={-57}
              r={11}
              fill={l.skin}
              opacity={holo ? 0.92 : 1}
            />
            {!holo && l.hs !== "bald" && (
              <path
                d="M-11.5 -58 Q-11.5 -70.5 0 -70.5 Q11.5 -70.5 11.5 -58 Q6 -64 0 -64 Q-6 -64 -11.5 -58Z"
                fill={l.hair}
              />
            )}
            {!holo && l.hs === "long" && (
              <>
                <rect
                  x={-12.5}
                  y={-62}
                  width={4.2}
                  height={20}
                  rx={2}
                  fill={l.hair}
                />
                <rect
                  x={8.3}
                  y={-62}
                  width={4.2}
                  height={20}
                  rx={2}
                  fill={l.hair}
                />
              </>
            )}
            {!holo &&
              l.hs === "curly" &&
              [-9, -4.5, 0, 4.5, 9].map((cx, i) => (
                <circle
                  key={cx}
                  cx={cx}
                  cy={-66 + (i % 2 ? 1.5 : 0)}
                  r={5}
                  fill={l.hair}
                />
              ))}
            {!holo && l.hs === "bun" && (
              <>
                <path
                  d="M-11.5 -58 Q-11.5 -70.5 0 -70.5 Q11.5 -70.5 11.5 -58 Q6 -64 0 -64 Q-6 -64 -11.5 -58Z"
                  fill={l.hair}
                />
                <circle cx={0} cy={-74} r={5} fill={l.hair} />
              </>
            )}
            {l.beard && (
              <path
                d="M-9 -54 Q-9 -45 0 -45 Q9 -45 9 -54 Q5 -49 0 -49 Q-5 -49 -9 -54Z"
                fill={l.hair}
              />
            )}
            {holo ? (
              <>
                <rect
                  x={-8.5}
                  y={-60}
                  width={17}
                  height={5.5}
                  rx={2.7}
                  fill="#0e1218"
                />
                <ellipse
                  cx={0}
                  cy={-77}
                  rx={13}
                  ry={4}
                  fill="none"
                  stroke="#fff4d1"
                  strokeWidth={1.6}
                  strokeDasharray="6 5"
                />
              </>
            ) : (
              <>
                {[-4.4, 4.4].map((cx) => (
                  <g key={cx}>
                    <ellipse cx={cx} cy={-56} rx={2.3} ry={2.1} fill="#fff" />
                    <circle cx={cx} cy={-56} r={1.1} fill="#1a1a1a" />
                    <path
                      d={`M${cx - 2.6} -60 L${cx + 2.6} -60.6`}
                      stroke={l.hair === "#c9ccd1" ? "#888" : l.hair}
                      strokeWidth={1.1}
                      fill="none"
                    />
                  </g>
                ))}
                <path
                  d="M-3 -51.5 Q0 -49.5 3 -51.5"
                  stroke="#7a3b2e"
                  strokeWidth={1.2}
                  fill="none"
                />
              </>
            )}
            {l.glasses && (
              <>
                <circle
                  cx={-4.4}
                  cy={-56}
                  r={3.7}
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth={1}
                />
                <circle
                  cx={4.4}
                  cy={-56}
                  r={3.7}
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth={1}
                />
                <line x1={-0.8} y1={-56} x2={0.8} y2={-56} stroke="#1a1a1a" />
              </>
            )}
            {l.acc === "headset" && (
              <>
                <path
                  d="M-12.5 -57 Q-12.5 -75 0 -75 Q12.5 -75 12.5 -57"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth={2.2}
                />
                <rect
                  x={-15}
                  y={-59}
                  width={4.2}
                  height={8.5}
                  rx={2}
                  fill="#1a1a1a"
                />
                <path
                  d="M-12.5 -50 Q-8 -45 -3 -48"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth={1.4}
                />
              </>
            )}
            {l.acc === "vest" && (
              <>
                <path d="M-13 -64 Q0 -82 13 -64 Z" fill="#e8b923" />
                <rect
                  x={-15}
                  y={-65}
                  width={30}
                  height={3.5}
                  rx={1.5}
                  fill="#c99a12"
                />
              </>
            )}
            {l.acc === "beret" && (
              <ellipse cx={3} cy={-69.5} rx={12.5} ry={5.2} fill={l.outfit} />
            )}
            {l.acc === "hoodie" && (
              <path d="M-11.5 -62 Q0 -76 11.5 -62 Z" fill="#2a2e36" />
            )}
          </g>
          <g className="alert">
            <circle cx={0} cy={-90} r={7} fill="#d64545" />
            <text
              x={0}
              y={-86}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#fff"
            >
              !
            </text>
          </g>
        </g>
      </g>
    </g>
  );
});

/** Plante d'intérieur. */
export const Plant = memo(function Plant({
  x,
  y,
  s = 1,
}: {
  x: number;
  y: number;
  s?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} aria-hidden>
      <ellipse cx={0} cy={2} rx={13} ry={4} fill="#000" opacity={0.15} />
      <path d="M-9 -2 L-7 -18 L7 -18 L9 -2 Z" fill="#b9a089" />
      <g fill="#4f8a58">
        <ellipse
          cx={-6}
          cy={-30}
          rx={5}
          ry={12}
          transform="rotate(-25 -6 -30)"
        />
        <ellipse cx={6} cy={-30} rx={5} ry={12} transform="rotate(25 6 -30)" />
        <ellipse cx={0} cy={-34} rx={5} ry={13} />
      </g>
    </g>
  );
});

/** Bureau : plateau bois, clavier, deux écrans. `lit` allume les écrans (activité enregistrée seulement). */
export const DeskFront = memo(function DeskFront({
  x,
  y,
  w = 190,
  accent,
  lit,
  label,
  sub,
}: {
  x: number;
  y: number;
  w?: number;
  accent: string;
  lit: boolean;
  label: string;
  sub: string;
}) {
  const l = x - w / 2;
  return (
    <g aria-hidden>
      <rect
        x={l + 4}
        y={y + 8}
        width={w}
        height={52}
        rx={6}
        fill="#000"
        opacity={0.14}
      />
      <rect x={l} y={y} width={w} height={14} rx={5} fill="var(--hq-desk)" />
      <rect
        x={l}
        y={y + 10}
        width={w}
        height={44}
        rx={5}
        fill="var(--hq-desk2)"
      />
      <rect
        x={l}
        y={y + 10}
        width={w}
        height={4}
        fill={accent}
        opacity={0.75}
      />
      <rect
        x={x - 28}
        y={y + 2}
        width={56}
        height={6}
        rx={2}
        fill="#1d222c"
        opacity={0.85}
      />
      <g className="hq-mon">
        {[
          [l + w - 70, 0],
        ].map(([mx], i) => (
          <g key={i}>
            <rect
              x={mx}
              y={y - 40}
              width={56}
              height={36}
              rx={3}
              fill="#10151c"
              stroke="#3a4350"
            />
            <rect
              className="hq-screen"
              x={mx + 3}
              y={y - 37}
              width={50}
              height={30}
              rx={2}
              fill={lit ? accent : "#1b2230"}
              opacity={lit ? 0.55 : 0.9}
            />
            <rect x={mx + 24} y={y - 4} width={8} height={5} fill="#3a4350" />
          </g>
        ))}
      </g>
      <text
        x={l + 12}
        y={y + 31}
        fontSize={12}
        fontWeight={700}
        fill="#fff"
        opacity={0.95}
      >
        {label}
      </text>
      <text x={l + 12} y={y + 46} fontSize={9.5} fill="#fff" opacity={0.78}>
        {sub}
      </text>
    </g>
  );
});

/** Fauteuil de bureau (derrière le personnage). */
export const Chair = memo(function Chair({
  x,
  y,
  color = "var(--hq-chair)",
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <g aria-hidden>
      <ellipse cx={x} cy={y + 4} rx={26} ry={7} fill="#000" opacity={0.15} />
      <rect x={x - 21} y={y - 78} width={42} height={64} rx={14} fill={color} />
      <rect
        x={x - 25}
        y={y - 28}
        width={50}
        height={14}
        rx={7}
        fill={color}
        opacity={0.9}
      />
    </g>
  );
});

/** Accessoires de métier posés sur le bureau (à gauche du poste). */
export const DeskProps = memo(function DeskProps({
  agent,
  x,
  y,
  w = 190,
}: {
  agent: AgentKey | "owner";
  x: number;
  y: number;
  w?: number;
}) {
  const x0 = x - w / 2 + 6,
    c = (n: string) =>
      (
        ({
          finance: "#3f8f80",
          commercial: "#a95b35",
          operations: "#35557f",
          relation: "#7d5c99",
          marketing: "#b88a28",
          studio: "#b84f78",
          rh: "#648f45",
          juridique: "#566177",
          core: "#c9b57f",
          owner: "#26344d",
        }) as Record<string, string>
      )[n];
  const a = c(agent),
    P = (px: number, py: number, pw: number, ph: number, f: string, o = 1) => (
      <rect x={px} y={py} width={pw} height={ph} rx={2} fill={f} opacity={o} />
    );
  return (
    <g aria-hidden>
      {agent === "finance" && (
        <>
          {P(x0, y - 22, 20, 24, "#2a3340")}
          {P(x0 + 3, y - 19, 14, 6, a)}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={x0 + 3 + (i % 3) * 5}
              y={y - 10 + Math.floor(i / 3) * 5}
              width={4}
              height={3.4}
              rx={0.6}
              fill="#a7b3c4"
            />
          ))}
          {P(x0 + 26, y - 4, 24, 5, "#e3e8ef")}
          {P(x0 + 27, y - 8, 22, 4, "#f6f8fb")}
        </>
      )}
      {agent === "commercial" && (
        <>
          {P(x0, y - 9, 26, 9, "#222b37")}
          {P(x0 + 2, y - 15, 22, 6, "#303a49")}
          {P(x0 + 32, y - 14, 18, 14, a, 0.7)}
        </>
      )}
      {agent === "operations" && (
        <>
          {P(x0, y - 24, 28, 24, "#10151c")}
          <rect
            x={x0}
            y={y - 24}
            width={28}
            height={24}
            rx={3}
            fill="none"
            stroke={a}
          />
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={x0 + 7 + i * 7}
              cy={y - 16 + (i % 2) * 6}
              r={2.2}
              fill={a}
            />
          ))}
          <path
            d={`M${x0 + 36} ${y} Q${x0 + 48} ${y - 22} ${x0 + 60} ${y} Z`}
            fill="#e8b923"
          />
          {P(x0 + 34, y - 2, 28, 3, "#c99a12")}
        </>
      )}
      {agent === "relation" && (
        <>
          <path
            d={`M${x0} ${y} L${x0 + 3} ${y - 14} Q${x0 + 13} ${y - 26} ${x0 + 23} ${y - 14} L${x0 + 26} ${y} Z`}
            fill="#222b37"
          />
          {P(x0 + 32, y - 7, 22, 7, "#f4f1e8")}
        </>
      )}
      {agent === "marketing" && (
        <>
          <polygon
            points={`${x0},${y - 5} ${x0 + 20},${y - 17} ${x0 + 20},${y} ${x0},${y - 3}`}
            fill={a}
          />
          {P(x0 + 28, y - 24, 26, 24, "#10151c")}
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={x0 + 32 + i * 7}
              y={y - 6 - (i + 1) * 4}
              width={5}
              height={(i + 1) * 4}
              fill={a}
            />
          ))}
        </>
      )}
      {agent === "studio" && (
        <>
          {P(x0, y - 22, 30, 22, "#10151c")}
          <rect
            x={x0}
            y={y - 22}
            width={30}
            height={22}
            rx={3}
            fill="none"
            stroke={a}
          />
          <path
            d={`M${x0 + 6} ${y - 8} Q${x0 + 14} ${y - 20} ${x0 + 25} ${y - 11}`}
            stroke={a}
            strokeWidth={2}
            fill="none"
          />
          {[a, "#5c8fd0", "#e0b040", "#6ea25a"].map((f, i) => (
            <circle key={i} cx={x0 + 38 + i * 6} cy={y - 4} r={3} fill={f} />
          ))}
        </>
      )}
      {agent === "rh" && (
        <>
          {P(x0, y - 22, 24, 22, "#222b37")}
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={x0 + 3 + i * 7}
              y={y - 18}
              width={6}
              height={9}
              rx={1}
              fill="#f4f6f8"
            />
          ))}
          {P(x0 + 30, y - 11, 24, 11, a, 0.8)}
        </>
      )}
      {agent === "juridique" && (
        <>
          {P(x0, y - 6, 24, 6, "#5a3a2a")}
          {P(x0 + 2, y - 12, 22, 6, "#7a4a32")}
          <g>
            <line
              x1={x0 + 42}
              y1={y}
              x2={x0 + 42}
              y2={y - 22}
              stroke="#c9ccd1"
              strokeWidth={2}
            />
            <line
              x1={x0 + 31}
              y1={y - 20}
              x2={x0 + 53}
              y2={y - 20}
              stroke="#c9ccd1"
              strokeWidth={2}
            />
            <path
              d={`M${x0 + 31} ${y - 20} L${x0 + 27} ${y - 11} L${x0 + 35} ${y - 11} Z`}
              fill="#9aa5b8"
            />
            <path
              d={`M${x0 + 53} ${y - 20} L${x0 + 49} ${y - 11} L${x0 + 57} ${y - 11} Z`}
              fill="#9aa5b8"
            />
          </g>
        </>
      )}
      {agent === "owner" && (
        <>
          {P(x0, y - 6, 34, 6, "#e9ecf2")}
          <rect
            x={x0 + 40}
            y={y - 16}
            width={14}
            height={16}
            rx={2}
            fill="#c9b57f"
          />
        </>
      )}
    </g>
  );
});

/** Écran mural : titre + lignes de chiffres RÉELS (ou « non disponible »). */
export const WallScreen = memo(function WallScreen({
  x,
  y,
  w = 124,
  h = 64,
  accent,
  title,
  lines,
  state,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  accent: string;
  title: string;
  lines: { text: string; dim?: boolean }[];
  state: "ok" | "stale" | "demo" | "none";
}) {
  const dot =
    state === "ok"
      ? "#5fd0a0"
      : state === "stale"
        ? "#f0b24a"
        : state === "demo"
          ? "#f0b24a"
          : "#7a8596";
  return (
    <g aria-hidden>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill="#0f141b"
        stroke="#2c3544"
        strokeWidth={2}
      />
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={3}
        fill={accent}
        opacity={0.9}
      />
      <text x={x + 8} y={y + 18} fontSize={9.5} fill="#9aa6b8">
        {title}
      </text>
      <circle cx={x + w - 10} cy={y + 14} r={3.4} fill={dot} />
      {lines.map((ln, i) => (
        <text
          key={i}
          x={x + 8}
          y={y + 36 + i * 17}
          fontSize={ln.dim ? 9.5 : 11.5}
          fontWeight={ln.dim ? 400 : 700}
          fontFamily="ui-monospace, monospace"
          fill={ln.dim ? "#7e8a9c" : "#f2f5fa"}
        >
          {ln.text}
        </text>
      ))}
    </g>
  );
});

/** Styles : transitions et animations pilotés par la classe d'attitude uniquement. */
export const HQ_CSS = `
.hq-av{transition:transform 1.3s cubic-bezier(.45,.05,.3,1)}
.hq-av .legs,.hq-av .paper,.hq-av .alert{display:none}
.hq-av.pose-meeting .legs{display:block}
.hq-av .armL,.hq-av .armR,.hq-av .head,.hq-av .legL,.hq-av .legR{transform-box:fill-box;transform-origin:50% 0}
.hq-av.pose-working .armL{animation:hq-ty .3s infinite alternate}
.hq-av.pose-working .armR{animation:hq-ty .3s infinite alternate-reverse}
.hq-av.pose-reading .paper{display:block}
.hq-av.pose-reading .head{animation:hq-nod 2.6s infinite ease-in-out}
.hq-av.pose-struggling .alert{display:block}
.hq-av.pose-struggling .head{animation:hq-shake .45s 4}
.hq-av.pose-struggling .armR{transform:rotate(-155deg)}
.hq-av.pose-meeting .armR{animation:hq-talk 1.1s infinite alternate ease-in-out}
.hq-av.pose-meeting .legL{animation:none}
.hq-office.on .hq-screen{animation:hq-flick 1.6s infinite alternate}
.hq-ring{fill:none;stroke-width:3;opacity:0;transform-box:fill-box;transform-origin:center}
.hq-ring.go{animation:hq-ring 1.6s ease-out}
.hq-hit{cursor:pointer}
.hq-hit:hover .hq-glass{stroke-opacity:1}
.hq-hit:focus-visible{outline:none}
.hq-hit:focus-visible .hq-glass{stroke:#e9c27a;stroke-width:4}
@keyframes hq-ty{from{transform:rotate(-7deg)}to{transform:rotate(8deg)}}
@keyframes hq-nod{0%,100%{transform:rotate(0)}50%{transform:rotate(7deg)}}
@keyframes hq-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
@keyframes hq-talk{from{transform:rotate(0)}to{transform:rotate(-24deg)}}
@keyframes hq-flick{from{opacity:.4}to{opacity:.75}}
@keyframes hq-ring{0%{opacity:.9;transform:scale(.5)}100%{opacity:0;transform:scale(1.25)}}
@media (prefers-reduced-motion:reduce){.hq-av{transition:none}.hq-av *,.hq-office .hq-screen,.hq-ring{animation:none!important}}
`;

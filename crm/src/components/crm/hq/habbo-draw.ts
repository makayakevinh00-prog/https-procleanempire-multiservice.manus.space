import { DESKS, PROPS, W, H, HUB, type Prop } from "@/lib/jarvis/habbo/map";
import type { Bubble, Pose } from "@/lib/jarvis/habbo/brain";

/** Rendu isométrique « pixel » des locaux : fonctions de dessin pures (aucun état), appelées par habbo.tsx à chaque image. */
export const TW = 40,
  TH = 20,
  WALL_H = 66;
export const OX = (H * TW) / 2,
  OY = 104;
export const CANVAS_W = ((W + H) * TW) / 2,
  CANVAS_H = OY + ((W + H) * TH) / 2 + 12;

export const proj = (x: number, y: number, z = 0): [number, number] => [
  (x - y) * (TW / 2) + OX,
  (x + y) * (TH / 2) + OY - z,
];

const poly = (
  c: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string,
  stroke?: string,
) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
  }
};
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16),
    f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

export function isoBox(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  color: string,
  z0 = 0,
) {
  poly(
    c,
    [
      proj(x, y, z0 + h),
      proj(x + w, y, z0 + h),
      proj(x + w, y + d, z0 + h),
      proj(x, y + d, z0 + h),
    ],
    shade(color, 1.12),
    shade(color, 0.8),
  );
  poly(
    c,
    [
      proj(x, y + d, z0),
      proj(x + w, y + d, z0),
      proj(x + w, y + d, z0 + h),
      proj(x, y + d, z0 + h),
    ],
    shade(color, 0.9),
    shade(color, 0.7),
  );
  poly(
    c,
    [
      proj(x + w, y, z0),
      proj(x + w, y + d, z0),
      proj(x + w, y + d, z0 + h),
      proj(x + w, y, z0 + h),
    ],
    shade(color, 0.68),
    shade(color, 0.55),
  );
}

/** Sol : damier clair, tapis colorés sous chaque bureau, plateforme de JARVIS. */
export function drawFloor(c: CanvasRenderingContext2D) {
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      poly(
        c,
        [proj(x, y), proj(x + 1, y), proj(x + 1, y + 1), proj(x, y + 1)],
        (x + y) % 2 ? "#e9ecf2" : "#dfe3ec",
      );
    }
  for (const d of DESKS)
    for (let x = d.x - 1; x <= d.x + 2; x++)
      for (let y = d.y - 2; y <= d.y + 2; y++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        poly(
          c,
          [proj(x, y), proj(x + 1, y), proj(x + 1, y + 1), proj(x, y + 1)],
          rgba(d.color, 0.2),
        );
      }
  // table de réunion : tapis chaud
  for (let x = 8; x <= 14; x++)
    for (let y = 6; y <= 11; y++)
      poly(
        c,
        [proj(x, y), proj(x + 1, y), proj(x + 1, y + 1), proj(x, y + 1)],
        "rgba(196,165,120,0.22)",
      );
  // plateforme JARVIS
  const [hx, hy] = HUB;
  for (const [k, col] of [
    [1.3, "#c4b5fd"],
    [0.95, "#7c3aed"],
    [0.55, "#a78bfa"],
  ] as [number, string][]) {
    const cx = hx + 0.5,
      cy = hy + 0.5;
    poly(
      c,
      [
        proj(cx - k * 0.5, cy - k * 0.5),
        proj(cx + k * 0.5, cy - k * 0.5),
        proj(cx + k * 0.5, cy + k * 0.5),
        proj(cx - k * 0.5, cy + k * 0.5),
      ],
      rgba(col, 0.55),
    );
  }
}

const backQuad = (
  c: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  fill: string,
  stroke?: string,
) =>
  poly(
    c,
    [proj(x1, 0, z2), proj(x2, 0, z2), proj(x2, 0, z1), proj(x1, 0, z1)],
    fill,
    stroke,
  );
const leftQuad = (
  c: CanvasRenderingContext2D,
  y1: number,
  y2: number,
  z1: number,
  z2: number,
  fill: string,
  stroke?: string,
) =>
  poly(
    c,
    [proj(0, y1, z2), proj(0, y2, z2), proj(0, y2, z1), proj(0, y1, z1)],
    fill,
    stroke,
  );

/** Murs du fond (deux pans), fenêtres, enseignes des départements, logo. */
export function drawWalls(c: CanvasRenderingContext2D, t: number) {
  backQuad(c, 0, W, 0, WALL_H, "#cfd6e4");
  leftQuad(c, 0, H, 0, WALL_H, "#b9c2d4");
  backQuad(c, 0, W, 0, 7, "#a9b3c7");
  leftQuad(c, 0, H, 0, 7, "#97a2b8"); // plinthes
  backQuad(c, 0, W, WALL_H - 3, WALL_H, "#eef1f7");
  leftQuad(c, 0, H, WALL_H - 3, WALL_H, "#e3e8f1"); // corniches
  const sky = (x1: number, x2: number) => {
    backQuad(c, x1, x2, 26, 56, "#9bd1f5", "#6e7f9c");
    backQuad(c, x1 + 0.1, x2 - 0.1, 29, 40, "#c6e6fb");
    backQuad(c, (x1 + x2) / 2 - 0.04, (x1 + x2) / 2 + 0.04, 26, 56, "#6e7f9c");
  };
  sky(6.4, 8.6);
  sky(10.4, 12.6);
  sky(18.4, 20.6);
  for (const y of [3, 8, 12]) {
    leftQuad(c, y, y + 2.2, 26, 56, "#9bd1f5", "#6e7f9c");
    leftQuad(c, y + 0.1, y + 2.1, 29, 40, "#c6e6fb");
  }
  // enseignes au-dessus des bureaux de la rangée du fond (texte incliné dans le plan du mur)
  for (const d of DESKS.filter((d) => d.y === 3)) {
    backQuad(
      c,
      d.x - 0.2,
      d.x + 2.2,
      44,
      60,
      shade(d.color, 0.85),
      shade(d.color, 0.6),
    );
    const [sx, sy] = proj(d.x + 0.05, 0, 47);
    c.save();
    c.setTransform(1, 0.5, 0, 1, sx, sy);
    c.fillStyle = "#fff";
    c.font = "bold 8px sans-serif";
    c.textBaseline = "alphabetic";
    c.fillText(d.sign.toUpperCase().slice(0, 12), 0, 0);
    c.restore();
  }
  // logo sur le mur de gauche
  leftQuad(c, 5.2, 10.8, 34, 56, "#1f2a44", "#0f1830");
  const [lx, ly] = proj(0, 10.4, 44);
  c.save();
  c.setTransform(1, -0.5, 0, 1, lx, ly);
  c.fillStyle = "#e9d58b";
  c.font = "bold 9px sans-serif";
  c.fillText("PROCLEAN", 0, 0);
  c.fillStyle = "#fff";
  c.font = "bold 7px sans-serif";
  c.fillText("EMPIRE", 8, 9);
  c.restore();
  void t;
}

const woodTop = "#c8a273";
const SCREEN: Record<string, string> = {
  work: "#38bdf8",
  validate: "#fbbf24",
  alert: "#ef4444",
  idle: "#334155",
  off: "#0f172a",
};

export type ScreenMode = "work" | "validate" | "alert" | "idle" | "off";

export function drawProp(
  c: CanvasRenderingContext2D,
  p: Prop,
  t: number,
  screen?: ScreenMode,
  absentSign?: boolean,
) {
  switch (p.kind) {
    case "desk": {
      isoBox(c, p.x, p.y, p.w, p.d, p.h, woodTop);
      isoBox(
        c,
        p.x + 0.12,
        p.y + 0.12,
        0.12,
        0.76,
        0.01,
        shade(p.color ?? "#999", 0.9),
        p.h,
      ); // liseré couleur du département
      // moniteur
      isoBox(c, p.x + 1.2, p.y + 0.25, 0.7, 0.1, 15, "#1e293b", p.h + 3);
      const mode = screen ?? "off";
      const base =
        mode === "work"
          ? shade(SCREEN.work, 0.8 + 0.2 * Math.sin(t / 180))
          : mode === "alert"
            ? Math.floor(t / 400) % 2
              ? SCREEN.alert
              : "#7f1d1d"
            : SCREEN[mode];
      poly(
        c,
        [
          proj(p.x + 1.25, p.y + 0.35, p.h + 6),
          proj(p.x + 1.85, p.y + 0.35, p.h + 6),
          proj(p.x + 1.85, p.y + 0.35, p.h + 16),
          proj(p.x + 1.25, p.y + 0.35, p.h + 16),
        ],
        base,
      );
      if (mode === "work")
        for (let i = 0; i < 3; i++) {
          const k = (t / 260 + i) % 3;
          poly(
            c,
            [
              proj(p.x + 1.3, p.y + 0.35, p.h + 8 + k * 2.4),
              proj(p.x + 1.3 + 0.4 - i * 0.06, p.y + 0.35, p.h + 8 + k * 2.4),
              proj(p.x + 1.3 + 0.4 - i * 0.06, p.y + 0.35, p.h + 9 + k * 2.4),
              proj(p.x + 1.3, p.y + 0.35, p.h + 9 + k * 2.4),
            ],
            "rgba(255,255,255,.75)",
          );
        }
      isoBox(c, p.x + 0.2, p.y + 0.55, 0.6, 0.25, 1.6, "#e2e8f0", p.h); // clavier
      isoBox(c, p.x + 0.95, p.y + 0.55, 0.2, 0.2, 3, "#fff", p.h); // tasse
      if (absentSign) {
        const [sx, sy] = proj(p.x + 0.7, p.y + 0.9, p.h + 11);
        c.fillStyle = "#fde68a";
        c.strokeStyle = "#a16207";
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(sx - 21, sy - 9, 42, 13, 3);
        c.fill();
        c.stroke();
        c.fillStyle = "#713f12";
        c.font = "bold 8px sans-serif";
        c.textAlign = "center";
        c.fillText("BIENTÔT", sx, sy + 1);
        c.textAlign = "left";
      }
      break;
    }
    case "table": {
      isoBox(c, p.x, p.y, p.w, p.d, 3, "#8b6b4a", 9); // plateau
      isoBox(c, p.x + 0.2, p.y + 0.2, 0.3, 0.3, 9, "#6b4f35");
      isoBox(c, p.x + p.w - 0.5, p.y + p.d - 0.5, 0.3, 0.3, 9, "#6b4f35");
      isoBox(c, p.x + 0.4, p.y + 0.4, 0.5, 0.35, 1, "#f8fafc", 12);
      isoBox(c, p.x + 1.5, p.y + 0.9, 0.5, 0.35, 1, "#fef3c7", 12);
      break;
    }
    case "sofa":
      isoBox(c, p.x, p.y, p.w, p.d, 9, "#0f766e");
      isoBox(c, p.x, p.y, p.w, 0.3, 14, "#115e59", 9);
      isoBox(c, p.x, p.y, 0.3, p.d, 6, "#134e4a", 9);
      isoBox(c, p.x + p.w - 0.3, p.y, 0.3, p.d, 6, "#134e4a", 9);
      break;
    case "cooler":
      isoBox(c, p.x + 0.2, p.y + 0.2, 0.6, 0.6, 14, "#e2e8f0");
      isoBox(c, p.x + 0.28, p.y + 0.28, 0.44, 0.44, 12, "#7dd3fc", 14);
      break;
    case "coffee":
      isoBox(c, p.x + 0.1, p.y + 0.1, 0.8, 0.8, 18, "#334155");
      isoBox(
        c,
        p.x + 0.55,
        p.y + 0.95,
        0.12,
        0.02,
        3,
        Math.floor(t / 600) % 2 ? "#ef4444" : "#7f1d1d",
        12,
      );
      break;
    case "plant": {
      isoBox(c, p.x + 0.3, p.y + 0.3, 0.4, 0.4, 9, "#92400e");
      const [bx, by] = proj(p.x + 0.5, p.y + 0.5, 10);
      for (const [dx, dy, r, col] of [
        [-5, -4, 7, "#15803d"],
        [5, -6, 7, "#16a34a"],
        [0, -13, 8, "#22c55e"],
        [-2, -22, 5, "#4ade80"],
      ] as [number, number, number, string][]) {
        c.fillStyle = col;
        c.beginPath();
        c.arc(
          bx + dx,
          by + dy + Math.sin(t / 900 + dx) * 0.6,
          r,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      break;
    }
    case "shelf": {
      isoBox(c, p.x, p.y, p.w, p.d, p.h, "#7c5a3c");
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 6; i++) {
          const col = [
            "#ef4444",
            "#3b82f6",
            "#facc15",
            "#10b981",
            "#a855f7",
            "#fb923c",
          ][(i + r * 2) % 6];
          poly(
            c,
            [
              proj(p.x + 0.12 + i * 0.3, p.y + p.d, 6 + r * 11),
              proj(p.x + 0.12 + i * 0.3 + 0.2, p.y + p.d, 6 + r * 11),
              proj(p.x + 0.12 + i * 0.3 + 0.2, p.y + p.d, 14 + r * 11),
              proj(p.x + 0.12 + i * 0.3, p.y + p.d, 14 + r * 11),
            ],
            col,
          );
        }
      break;
    }
  }
}

export function drawChair(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  isoBox(c, x + 0.2, y + 0.2, 0.6, 0.6, 7, shade(color, 0.7));
  isoBox(c, x + 0.2, y + 0.1, 0.6, 0.12, 17, shade(color, 0.6));
}

export interface ActorLook {
  kind: "worker" | "owner" | "jarvis";
  color: string;
  skin: string;
  hair: string;
}
export const LOOKS: Record<string, ActorLook> = {
  owner: { kind: "owner", color: "#1e293b", skin: "#e0ac82", hair: "#3b2a1d" },
  core: { kind: "jarvis", color: "#7c3aed", skin: "#cbd5e1", hair: "#a78bfa" },
  finance: {
    kind: "worker",
    color: "#34d399",
    skin: "#f2c6a0",
    hair: "#5b3a24",
  },
  commercial: {
    kind: "worker",
    color: "#60a5fa",
    skin: "#c68a5b",
    hair: "#1f1a17",
  },
  marketing: {
    kind: "worker",
    color: "#fbbf24",
    skin: "#f5d0b0",
    hair: "#b45309",
  },
  studio: {
    kind: "worker",
    color: "#fb7185",
    skin: "#8d5a3b",
    hair: "#0f0d0c",
  },
  operations: {
    kind: "worker",
    color: "#2dd4bf",
    skin: "#e0ac82",
    hair: "#2b2118",
  },
  relation: {
    kind: "worker",
    color: "#f472b6",
    skin: "#f2c6a0",
    hair: "#7a2e1b",
  },
  rh: { kind: "worker", color: "#818cf8", skin: "#d49a6a", hair: "#3d2c8d" },
  juridique: {
    kind: "worker",
    color: "#94a3b8",
    skin: "#c68a5b",
    hair: "#6b7280",
  },
};

const S = 1.22;
export interface ActorDraw {
  x: number;
  y: number;
  look: ActorLook;
  pose: Pose;
  walking: boolean;
  face: 1 | -1;
  t: number;
  ghost?: boolean;
}

/** Personnage de 30 px de haut : jambes, torse, bras, tête. Assis : abaissé, bras sur le clavier. */
export function drawActor(c: CanvasRenderingContext2D, a: ActorDraw) {
  const [fx, fy] = proj(a.x + 0.5, a.y + 0.5);
  const sit = a.pose === "sit_work" || a.pose === "sit_idle";
  const step = a.walking ? Math.sin(a.t / 90) : 0;
  const bob =
    a.look.kind === "jarvis"
      ? Math.sin(a.t / 420) * 2 - 3
      : a.walking
        ? Math.abs(Math.sin(a.t / 90)) * -1.2
        : 0;
  c.save();
  c.translate(fx, fy);
  c.scale(S, S);
  if (a.ghost) c.globalAlpha = 0.45;
  c.fillStyle = "rgba(0,0,0,.22)";
  c.beginPath();
  c.ellipse(0, 1, a.look.kind === "jarvis" ? 8 : 9, 4.3, 0, 0, Math.PI * 2);
  c.fill();
  const y0 = (sit ? 5 : 0) + bob;
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y + y0), w, h);
  };
  const pants =
    a.look.kind === "owner"
      ? "#0f172a"
      : a.look.kind === "jarvis"
        ? "#4c1d95"
        : "#334155";
  if (a.look.kind === "jarvis") {
    // robot : colonne lévitante, cœur lumineux, visière
    R(-5, -9, 10, 7, "#5b21b6");
    R(-6, -20, 12, 12, a.look.color);
    R(-2, -17, 4, 4, `rgba(165,243,252,${0.6 + 0.4 * Math.sin(a.t / 250)})`);
    R(-9, -19 + step, 3, 9, "#6d28d9");
    R(6, -19 - step, 3, 9, "#6d28d9");
    R(-6, -30, 12, 10, "#d6dde8");
    R(-5, -27, 10, 4, "#0e7490");
    R(-4, -26, 3, 2, "#67e8f9");
    R(1, -26, 3, 2, "#67e8f9");
    R(-1, -35, 2, 5, "#94a3b8");
    R(-2, -37, 4, 3, `rgba(250,204,21,${0.6 + 0.4 * Math.sin(a.t / 200)})`);
  } else {
    if (!sit) {
      R(-5, -9 + (step > 0 ? -1 : 0), 4, 9, pants);
      R(1, -9 + (step < 0 ? -1 : 0), 4, 9, pants);
      R(-5, -1, 5, 2, "#111827");
      R(1, -1, 5, 2, "#111827");
    } else {
      R(-5, -8, 10, 4, pants);
    }
    R(-6, -20, 12, 11, a.look.color);
    if (a.look.kind === "owner") {
      R(-2, -20, 4, 8, "#f8fafc");
      R(-1, -19, 2, 8, "#b91c1c");
    } else R(-6, -14, 12, 2, "rgba(255,255,255,.28)");
    const typing =
      a.pose === "sit_work" ? (Math.floor(a.t / 110) % 2 ? 1 : 0) : 0;
    if (sit) {
      R(-9, -17, 3, 6, a.look.color);
      R(6, -17, 3, 6, a.look.color);
      R(-9 + 1, -12 - typing, 5, 3, a.look.skin);
      R(4, -12 + typing - 1, 5, 3, a.look.skin);
    } else {
      R(-9, -19 + (step > 0 ? 1 : -1), 3, 9, a.look.color);
      R(6, -19 + (step < 0 ? 1 : -1), 3, 9, a.look.color);
      R(-9, -11, 3, 2, a.look.skin);
      R(6, -11, 3, 2, a.look.skin);
    }
    R(-5, -30, 10, 10, a.look.skin);
    R(-5, -32, 10, 5, a.look.hair);
    R(-5, -28, 2, 4, a.look.hair);
    if (a.look.kind === "owner") R(-5, -28, 10, 1, a.look.hair);
    const ex = a.face > 0 ? 1 : -3;
    R(ex, -26, 2, 2, "#111827");
    R(ex + 3, -26, 2, 2, "#111827");
  }
  c.restore();
}

/** Bulles d'état au-dessus de la tête : petites icônes, pas de phrases. */
export function drawBubble(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: Bubble,
  t: number,
  count?: number,
  sitting = false,
) {
  if (!kind) return;
  const [fx, fy] = proj(x + 0.5, y + 0.5);
  const bx = fx + 9,
    by = fy - (sitting ? 36 : 42) * 1.22 - Math.sin(t / 380) * 1.5,
    w = 22,
    h = 16;
  const tone: Record<string, [string, string]> = {
    work: ["#e0f2fe", "#0284c7"],
    validate: ["#fef3c7", "#d97706"],
    alert: ["#fee2e2", "#dc2626"],
    talk: ["#ffffff", "#334155"],
    coffee: ["#ffedd5", "#9a3412"],
    doc: ["#ede9fe", "#6d28d9"],
    question: ["#f1f5f9", "#475569"],
  };
  const [bg, fg] = tone[kind];
  c.save();
  c.fillStyle = bg;
  c.strokeStyle = fg;
  c.lineWidth = 1.3;
  c.beginPath();
  c.roundRect(bx - w / 2, by - h, w, h, 5);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(bx - 4, by);
  c.lineTo(bx - 8, by + 5);
  c.lineTo(bx + 1, by);
  c.closePath();
  c.fillStyle = bg;
  c.fill();
  c.stroke();
  c.fillStyle = fg;
  c.textAlign = "center";
  c.font = "bold 11px sans-serif";
  const cy = by - h / 2;
  if (kind === "work")
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(
        bx - 5 + i * 5,
        cy + (Math.floor(t / 200) % 3 === i ? -1.6 : 1),
        1.7,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  else if (kind === "validate")
    c.fillText(
      count && count > 1 ? String(Math.min(count, 9)) : "✓",
      bx,
      cy + 4,
    );
  else if (kind === "alert")
    c.fillText(Math.floor(t / 350) % 2 ? "!" : "!!", bx, cy + 4);
  else if (kind === "talk") {
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(bx - 5 + i * 5, cy, 1.4, 0, Math.PI * 2);
      c.fill();
    }
  } else if (kind === "coffee") {
    c.fillRect(bx - 4, cy - 3, 7, 6);
    c.strokeRect(bx + 3, cy - 2, 3, 3);
  } else if (kind === "doc") {
    c.fillRect(bx - 4, cy - 5, 8, 10);
    c.fillStyle = bg;
    c.fillRect(bx - 2, cy - 3, 4, 1);
    c.fillRect(bx - 2, cy, 4, 1);
  } else c.fillText("?", bx, cy + 4);
  c.restore();
}

export function drawTag(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  sitting: boolean,
) {
  const [fx, fy] = proj(x + 0.5, y + 0.5);
  c.save();
  c.font = "bold 9px sans-serif";
  const w = c.measureText(text).width + 10,
    ty = fy + 8 + (sitting ? 0 : 0);
  c.fillStyle = "rgba(15,23,42,.88)";
  c.beginPath();
  c.roundRect(fx - w / 2, ty, w, 14, 4);
  c.fill();
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.fillText(text, fx, ty + 10);
  c.restore();
}

export function drawRing(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  t: number,
) {
  const [fx, fy] = proj(x + 0.5, y + 0.5);
  c.save();
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.globalAlpha = 0.7 + 0.3 * Math.sin(t / 250);
  c.beginPath();
  c.ellipse(fx, fy + 1, 14, 7, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

export const sortKey = (p: Prop) => p.x + p.w / 2 + p.y + p.d / 2;
export { PROPS };

import type { AgentKey } from "../types";

/**
 * Plan isométrique des locaux (style « hôtel » pixel) : données PURES, testables.
 * Grille W × H ; x vers la droite-bas, y vers la gauche-bas. Les chaises et les emplacements de visite sont praticables ; bureaux, tables et meubles sont bloqués.
 */
export const W = 24, H = 16;
export type Tile = [number, number];
export type Worker = Exclude<AgentKey, "core">;

export interface DeskSpot { agent: Worker | "owner"; x: number; y: number; chair: Tile; visit: Tile; visit2: Tile; color: string; sign: string }
const mk = (agent: DeskSpot["agent"], x: number, y: number, color: string, sign: string): DeskSpot => ({ agent, x, y, chair: [x, y - 1], visit: [x, y + 1], visit2: [x + 1, y + 1], color, sign });

export const DESKS: DeskSpot[] = [
  mk("owner", 1, 3, "#c9a227", "Direction"),
  mk("finance", 5, 3, "#34d399", "Finance"),
  mk("commercial", 9, 3, "#60a5fa", "Commercial"),
  mk("marketing", 13, 3, "#fbbf24", "Marketing"),
  mk("studio", 17, 3, "#fb7185", "Studio"),
  mk("operations", 1, 10, "#2dd4bf", "Opérations"),
  mk("relation", 5, 10, "#f472b6", "Relation client"),
  mk("rh", 17, 10, "#818cf8", "RH"),
  mk("juridique", 21, 10, "#94a3b8", "Juridique")
];
export const DESK_OF = Object.fromEntries(DESKS.map((d) => [d.agent, d])) as Record<DeskSpot["agent"], DeskSpot>;

export const HUB: Tile = [11, 6];                       // plateforme de JARVIS
export const TABLE = { x: 10, y: 8, w: 3, d: 2 };       // table de réunion 3 × 2
export const MEET_SEATS: Tile[] = [[10, 7], [11, 7], [12, 7], [10, 10], [11, 10], [12, 10], [9, 8], [13, 9]];
export const POIS: Record<string, Tile> = { cooler: [19, 13], coffee: [21, 13], sofa: [3, 13], plant: [1, 12], window: [14, 14] };

export type Prop = { kind: "desk" | "table" | "sofa" | "cooler" | "coffee" | "plant" | "shelf"; x: number; y: number; w: number; d: number; h: number; color?: string };
export const PROPS: Prop[] = [
  ...DESKS.map((d): Prop => ({ kind: "desk", x: d.x, y: d.y, w: 2, d: 1, h: 12, color: d.color })),
  { kind: "table", x: TABLE.x, y: TABLE.y, w: TABLE.w, d: TABLE.d, h: 12 },
  { kind: "sofa", x: 2, y: 14, w: 3, d: 1, h: 10 },
  { kind: "cooler", x: 20, y: 14, w: 1, d: 1, h: 26 },
  { kind: "coffee", x: 22, y: 14, w: 1, d: 1, h: 20 },
  { kind: "plant", x: 0, y: 12, w: 1, d: 1, h: 24 }, { kind: "plant", x: 23, y: 7, w: 1, d: 1, h: 24 }, { kind: "plant", x: 8, y: 1, w: 1, d: 1, h: 24 },
  { kind: "shelf", x: 3, y: 0, w: 2, d: 1, h: 36 }, { kind: "shelf", x: 15, y: 0, w: 2, d: 1, h: 36 }
];

const key = (x: number, y: number) => y * W + x;
export const BLOCKED: Set<number> = (() => {
  const s = new Set<number>();
  for (const p of PROPS) for (let i = 0; i < p.w; i++) for (let j = 0; j < p.d; j++) s.add(key(p.x + i, p.y + j));
  return s;
})();
export const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
export const walkable = (x: number, y: number) => inside(x, y) && !BLOCKED.has(key(x, y));

/** Plus court chemin (4 voisins) entre deux cases praticables ; null si inatteignable. Inclut départ et arrivée. */
export function findPath(from: Tile, to: Tile): Tile[] | null {
  if (!walkable(...from) || !walkable(...to)) return null;
  if (from[0] === to[0] && from[1] === to[1]) return [from];
  const prev = new Map<number, number>([[key(...from), -1]]);
  const q: Tile[] = [from];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Tile[]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (!walkable(nx, ny) || prev.has(k)) continue;
      prev.set(k, key(x, y));
      if (nx === to[0] && ny === to[1]) {
        const out: Tile[] = [[nx, ny]];
        for (let c = prev.get(k)!; c !== -1; c = prev.get(c)!) out.push([c % W, Math.floor(c / W)]);
        return out.reverse();
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

import type { Activity, Link } from "../openspace";
import type { AgentKey } from "../types";

/**
 * Plan des locaux ProClean Empire : données PURES (aucune dépendance graphique), donc testables.
 * Le monde est une grille de 1600 × 1000 unités ; la caméra n'est qu'une fenêtre (viewBox) qui s'y déplace.
 */
export const WORLD = { w: 1600, h: 1000 } as const;

export type RoomId =
  | "direction"
  | "finance"
  | "commercial"
  | "marketing"
  | "studio"
  | "operations"
  | "relation"
  | "collab"
  | "hub"
  | "reception"
  | "rh"
  | "juridique"
  | "lounge";
export interface Room {
  id: RoomId;
  label: string;
  short: string;
  kind: "office" | "direction" | "collab" | "hub" | "reception" | "lounge";
  x: number;
  y: number;
  w: number;
  h: number;
  agent?: AgentKey;
}

export const ROOMS: Room[] = [
  {
    id: "direction",
    label: "Bureau de direction",
    short: "Direction",
    kind: "direction",
    x: 30,
    y: 30,
    w: 300,
    h: 270,
  },
  {
    id: "finance",
    label: "Finance & Administration",
    short: "Finance",
    kind: "office",
    x: 350,
    y: 30,
    w: 310,
    h: 270,
    agent: "finance",
  },
  {
    id: "commercial",
    label: "Commercial & Développement",
    short: "Commercial",
    kind: "office",
    x: 680,
    y: 30,
    w: 310,
    h: 270,
    agent: "commercial",
  },
  {
    id: "marketing",
    label: "Marketing & Communication",
    short: "Marketing",
    kind: "office",
    x: 1010,
    y: 30,
    w: 270,
    h: 270,
    agent: "marketing",
  },
  {
    id: "studio",
    label: "Studio Creative",
    short: "Studio",
    kind: "office",
    x: 1300,
    y: 30,
    w: 270,
    h: 270,
    agent: "studio",
  },
  {
    id: "operations",
    label: "Opérations & Exploitation",
    short: "Opérations",
    kind: "office",
    x: 30,
    y: 320,
    w: 370,
    h: 360,
    agent: "operations",
  },
  {
    id: "relation",
    label: "Relation client",
    short: "Relation client",
    kind: "office",
    x: 1200,
    y: 320,
    w: 370,
    h: 360,
    agent: "relation",
  },
  {
    id: "collab",
    label: "Espace de collaboration",
    short: "Collaboration",
    kind: "collab",
    x: 430,
    y: 320,
    w: 380,
    h: 360,
  },
  {
    id: "hub",
    label: "Poste central JARVIS",
    short: "JARVIS",
    kind: "hub",
    x: 820,
    y: 320,
    w: 360,
    h: 360,
    agent: "core",
  },
  {
    id: "reception",
    label: "Accueil",
    short: "Accueil",
    kind: "reception",
    x: 30,
    y: 700,
    w: 500,
    h: 270,
  },
  {
    id: "rh",
    label: "RH & Prestataires",
    short: "RH",
    kind: "office",
    x: 550,
    y: 700,
    w: 360,
    h: 270,
    agent: "rh",
  },
  {
    id: "juridique",
    label: "Juridique & Conformité",
    short: "Juridique",
    kind: "office",
    x: 930,
    y: 700,
    w: 330,
    h: 270,
    agent: "juridique",
  },
  {
    id: "lounge",
    label: "Espace détente",
    short: "Détente",
    kind: "lounge",
    x: 1280,
    y: 700,
    w: 290,
    h: 270,
  },
];
export const ROOM_BY_ID = Object.fromEntries(
  ROOMS.map((r) => [r.id, r]),
) as Record<RoomId, Room>;
export const AGENT_ROOM: Record<AgentKey, RoomId> = {
  core: "hub",
  finance: "finance",
  commercial: "commercial",
  operations: "operations",
  relation: "relation",
  marketing: "marketing",
  studio: "studio",
  rh: "rh",
  juridique: "juridique",
};
export const ROOM_AGENT = (id: RoomId): AgentKey | undefined =>
  ROOM_BY_ID[id].agent;

/** Position des pieds de l'agent à son poste. */
export function seatOf(agent: AgentKey): [number, number] {
  const r = ROOM_BY_ID[AGENT_ROOM[agent]];
  if (agent === "core") return [r.x + r.w / 2, r.y + r.h / 2 + 40];
  return [r.x + r.w / 2, r.y + r.h - 95];
}
/** Position du bureau du dirigeant (personnage « KevinH », décor : ce n'est pas un agent). */
export const OWNER_SEAT: [number, number] = [
  ROOM_BY_ID.direction.x + ROOM_BY_ID.direction.w / 2,
  ROOM_BY_ID.direction.y + ROOM_BY_ID.direction.h - 95,
];
/** Places autour de la table de l'espace de collaboration (pieds). */
export const MEET_SEATS: [number, number][] = [
  [560, 462],
  [620, 455],
  [680, 462],
  [560, 575],
  [620, 582],
  [680, 575],
  [500, 520],
  [740, 520],
];
export const MEET_TABLE = { cx: 620, cy: 520, rx: 125, ry: 42 } as const;

export type CameraView = "all" | RoomId;
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Fenêtre de caméra : toute la scène, ou une pièce avec une marge. */
export function viewOf(v: CameraView, pad = 28): Rect {
  if (v === "all") return { x: 0, y: 0, w: WORLD.w, h: WORLD.h };
  const r = ROOM_BY_ID[v];
  return {
    x: Math.max(0, r.x - pad),
    y: Math.max(0, r.y - pad),
    w: Math.min(WORLD.w, r.w + pad * 2),
    h: Math.min(WORLD.h, r.h + pad * 2),
  };
}

/** Gros plan sur le poste d'une pièce (le bureau de l'agent, ou le centre de la pièce). */
export function deskViewOf(v: RoomId): Rect {
  const r = ROOM_BY_ID[v];
  const [cx, cy] = r.agent ? seatOf(r.agent) : [r.x + r.w / 2, r.y + r.h / 2];
  const w = 460,
    h = 320;
  const x = Math.max(0, Math.min(WORLD.w - w, cx - w / 2)),
    y = Math.max(0, Math.min(WORLD.h - h, cy - h * 0.6));
  return { x, y, w, h };
}

/**
 * Attitude d'un agent. RÈGLE : elle découle UNIQUEMENT de l'activité enregistrée (lignes de la base) ;
 * « working » n'existe que si l'agent vient réellement de terminer un passage ou exécute une mission.
 */
export type Pose =
  | "absent"
  | "idle"
  | "working"
  | "reading"
  | "struggling"
  | "meeting";
export function poseOf(activity: Activity, inMeeting: boolean): Pose {
  if (activity === "absent") return "absent";
  if (inMeeting) return "meeting";
  switch (activity) {
    case "travaille":
      return "working";
    case "attend_validation":
      return "reading";
    case "alerte":
      return "struggling";
    default:
      return "idle";
  }
}
/** Agents réunis : ceux dont une demande ENTRE AGENTS est en cours, à condition que les deux existent. */
export function collaborators(
  links: Pick<Link, "from" | "to" | "status">[],
  activity: Partial<Record<AgentKey, Activity>>,
): Map<AgentKey, AgentKey> {
  const m = new Map<AgentKey, AgentKey>();
  for (const l of links) {
    if (l.status !== "pending") continue;
    const a = activity[l.from],
      b = activity[l.to];
    if (!a || !b || a === "absent" || b === "absent" || l.from === l.to)
      continue;
    m.set(l.from, l.to);
    if (!m.has(l.to)) m.set(l.to, l.from);
  }
  return m;
}
export const POSE_LABEL: Record<Pose, string> = {
  absent: "Pas encore construit",
  idle: "En attente d'une instruction",
  working: "Travaille sur son ordinateur",
  reading: "Consulte ses documents, attend votre validation",
  struggling: "En difficulté : alerte urgente",
  meeting: "En réunion avec un autre agent",
};

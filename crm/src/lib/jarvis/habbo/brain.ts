import type { Desk, OpenSpaceState } from "../openspace";
import type { AgentKey } from "../types";
import { DESK_OF, HUB, type DeskSpot, type Tile, type Worker } from "./map";

/**
 * Ce que chaque personnage FAIT, déduit de l'état réel (jamais inventé) :
 *  · « travaille » = assis, il tape ; « à valider » = assis, bulle ambre ; « alerte » = assis, bulle rouge ;
 *  · « au repos » = assis tranquille (il peut se promener : ce n'est pas du travail) ;
 *  · « pas construit » = absent : chaise vide, panneau « bientôt » ;
 *  · une demande entre agents envoie le demandeur à l'autre bureau ; JARVIS passe voir les postes avec alerte ou validation en attente,
 *    et apporte chaque nouvelle consigne du patron.
 */
export type Pose = "sit_work" | "sit_idle" | "stand";
export type Bubble = "work" | "validate" | "alert" | "talk" | "coffee" | "doc" | "question" | null;
export interface Goal { tile: Tile; pose: Pose; bubble: Bubble; count?: number }

export const isWorker = (k: AgentKey): k is Worker => k !== "core";

/** Poste de base d'un agent ; null = pas dans la pièce (agent non construit). */
export function baseGoal(d: Desk): Goal | null {
  if (!isWorker(d.key)) return null;
  const spot = DESK_OF[d.key];
  switch (d.activity) {
    case "absent": return null;
    case "travaille": return { tile: spot.chair, pose: "sit_work", bubble: "work" };
    case "attend_validation": return { tile: spot.chair, pose: "sit_idle", bubble: "validate", count: d.pending };
    case "alerte": return { tile: spot.chair, pose: "sit_idle", bubble: "alert", count: d.urgent || d.alerts };
    default: return { tile: spot.chair, pose: "sit_idle", bubble: null };
  }
}

export interface Visit { who: AgentKey; tile: Tile; bubble: Bubble; for: AgentKey; reason: string }

/** Visites entre agents : une demande en attente envoie le demandeur chez le destinataire (ou chez JARVIS). */
export function agentVisits(state: OpenSpaceState): Visit[] {
  const present = new Set(state.desks.filter((d) => d.activity !== "absent").map((d) => d.key));
  const out: Visit[] = [];
  for (const l of state.links) {
    if (l.status !== "pending" || l.from === "core" || !present.has(l.from)) continue;
    if (l.to === "core") out.push({ who: l.from, tile: [HUB[0] - 1, HUB[1]], bubble: "talk", for: "core", reason: l.label });
    else out.push({ who: l.from, tile: DESK_OF[l.to].visit2, bubble: "talk", for: l.to, reason: l.label });
  }
  return out;
}

/** Postes que JARVIS doit aller voir, par priorité : alertes urgentes, puis validations en attente. */
export function jarvisRounds(state: OpenSpaceState): { to: Worker; bubble: Bubble; reason: "alerte" | "validation" | "demande" }[] {
  const built = state.desks.filter((d) => isWorker(d.key) && d.activity !== "absent");
  const rounds: { to: Worker; bubble: Bubble; reason: "alerte" | "validation" | "demande" }[] = [];
  for (const d of built) if (d.urgent > 0) rounds.push({ to: d.key as Worker, bubble: "alert", reason: "alerte" });
  for (const d of built) if (d.pending > 0 && d.urgent === 0) rounds.push({ to: d.key as Worker, bubble: "validate", reason: "validation" });
  for (const l of state.links) if (l.status === "pending" && l.from === "core" && isWorker(l.to) && !rounds.some((r) => r.to === l.to)) rounds.push({ to: l.to, bubble: "talk", reason: "demande" });
  return rounds.slice(0, 3);
}

/** Nouvelles consignes du patron à apporter (créées dans la fenêtre donnée). */
export function freshInstructions(state: OpenSpaceState, nowMs: number, windowMs = 90_000): { id: string; agent: Worker }[] {
  const out: { id: string; agent: Worker }[] = [];
  for (const d of state.desks) if (isWorker(d.key)) for (const i of d.instructions) if (nowMs - Date.parse(i.created_at) < windowMs) out.push({ id: i.id, agent: d.key });
  return out;
}

export const slotFor = (spot: DeskSpot, second = false): Tile => (second ? spot.visit2 : spot.visit);

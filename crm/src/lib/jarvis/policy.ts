import type { Level } from "./types";

/**
 * Miroir de la table `jarvis_action_kinds` (la base est la référence ; un test vérifie que les deux sont identiques).
 * Règle de sécurité : un type d'action INCONNU est traité comme L3 (bloqué), jamais comme automatique.
 */
export const ACTION_KINDS: Record<string, { level: Level; label: string }> = {
  create_task: { level: "L1", label: "Créer une tâche" },
  contact_client: { level: "L2", label: "Proposer un message au client" },
  change_terms: { level: "L2", label: "Proposer un changement de conditions" },
  legal_notice: { level: "L3", label: "Mise en demeure" },
  issue_credit_note: { level: "L3", label: "Émettre un avoir" }
};

export const levelOf = (kind: string): Level => ACTION_KINDS[kind]?.level ?? "L3";
export const needsApproval = (kind: string) => levelOf(kind) === "L2";
export const isBlocked = (kind: string) => levelOf(kind) === "L3";

export const LEVEL_LABEL: Record<Level, string> = {
  L1: "Automatique",
  L2: "Validation du patron",
  L3: "Autorisation explicite"
};

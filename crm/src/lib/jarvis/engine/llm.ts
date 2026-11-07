import type { AgentKey } from "../types";

/**
 * Interface d'intégration d'une IA (Claude) dans le moteur de missions : CONTRAT SEUL, aucun appel réseau, aucune clé.
 * Brancher Claude = écrire un adaptateur qui respecte ce contrat, après autorisation explicite du dirigeant
 * (clé API, plafond de dépense, accord sur les données transmises).
 */
export interface AgentProfile {
  agent: AgentKey;
  /** Rôle et consignes système propres à l'agent. */
  system: string;
  /** Outils autorisés, par nom : l'agent n'en connaît pas d'autres. Tous en lecture, sauf « proposer » (validation humaine). */
  tools: string[];
  /** Clés de mémoire métier que l'agent peut lire (jamais écrire hors de ses clés déclarées). */
  memoryRead: string[];
  /** Modèle conseillé (le dirigeant peut le changer) et profondeur de réflexion. */
  model: string;
  effort: "low" | "medium" | "high";
}
export interface LlmRequest { profile: AgentProfile; missionId: string; stepId: string; input: unknown; maxOutputTokens: number }
export interface LlmResult { output: unknown; model: string; inputTokens: number; outputTokens: number; costMicros: number; latencyMs: number }
export interface LlmAdapter { readonly provider: string; call(req: LlmRequest): Promise<LlmResult> }

export class LlmNotConfigured extends Error { constructor() { super("IA_NON_CONNECTEE: aucune IA n'est branchée. Aucune clé n'est configurée et aucune dépense n'est autorisée."); } }
/** Adaptateur par défaut : refuse tout appel. Le moteur fonctionne sans IA (étapes « outil » déterministes). */
export const noLlm: LlmAdapter = { provider: "aucun", async call() { throw new LlmNotConfigured(); } };

/** Prix (millionièmes de dollar par million de tokens) : à relire avant tout calcul de budget ; valeurs au 7 nov. 2026. */
export const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  "claude-haiku-5-5": { in: 100_000, out: 500_000 }, "claude-sonnet-5-5": { in: 2_000_000, out: 10_000_000 }, "claude-opus-5-5": { in: 4_000_000, out: 20_000_000 }
};
export function costMicros(model: string, inTok: number, outTok: number): number {
  const p = PRICE_PER_MTOK[model]; if (!p) throw new Error(`MODELE_INCONNU: ${model} : prix à déclarer avant utilisation`);
  return Math.ceil((inTok * p.in + outTok * p.out) / 1_000_000);
}
/** Garde avant tout appel : budget accordé (jarvis_budget_ok) ET clé présente côté serveur. */
export function mayCall(budgetOk: boolean, keyPresent: boolean): { ok: true } | { ok: false; reason: string } {
  if (!keyPresent) return { ok: false, reason: "Aucune clé d'IA configurée côté serveur." };
  if (!budgetOk) return { ok: false, reason: "Plafond de dépense du jour à 0 ou atteint : accord du dirigeant requis." };
  return { ok: true };
}

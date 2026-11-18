/** Autonomie de Jarvis : ce qu'il peut faire seul. L'argent n'est JAMAIS délégué (factures, relances de paiement, avoirs, virements, remboursements). */
export type Level = 0 | 1 | 2;
export const LEVELS: { id: Level; label: string; help: string }[] = [
  { id: 0, label: "Prudent", help: "Il parle et propose, ne fait rien seul." },
  { id: 1, label: "Équilibré", help: "Il crée tâches et rappels tout seul. Le reste : votre accord." },
  { id: 2, label: "Délégué", help: "Il prépare aussi brouillons et notes seul. L'argent reste toujours à vous." }
];
export const parseLevel = (v: unknown): Level => (v === "1" || v === 1 ? 1 : v === "2" || v === 2 ? 2 : 0);

const MONEY = /factur|invoice|paiement|payment|relance|avoir|credit|virement|transfer|rembours|prix|tarif|montant|encaiss|recouvr|devis_accept|mise_en_demeure|legal/i;
/** Vrai si l'action touche à l'argent ou au juridique : jamais exécutée sans le patron, quel que soit le niveau. */
export const touchesMoney = (kindOrText: string) => MONEY.test(kindOrText);
/** Une action peut-elle partir seule au niveau donné ? Jamais si elle touche à l'argent ; niveau 1 : tâches ; niveau 2 : tâches + brouillons. */
export function canAutoRun(level: Level, kind: string): boolean {
  if (touchesMoney(kind)) return false;
  if (kind === "create_task" || kind === "create_reminder") return level >= 1;
  if (kind === "draft") return level >= 2;
  return false;
}

import { ACTION_KINDS, levelOf } from "./policy";
import { routeEvent } from "./registry";
import type { AgentResult } from "./types";

/**
 * JARVIS Core avant enregistrement : contrôle ce qu'un agent rend, puis achemine ses demandes.
 *  - une action de type inconnu est refusée (jamais traitée comme automatique) ;
 *  - une action L1 ne passe pas par les propositions : c'est une tâche ;
 *  - chaque événement est adressé à l'agent qui déclare l'écouter (le Core choisit, pas l'agent émetteur).
 * La base re-vérifie tout cela : ceci évite seulement d'envoyer un passage qui sera refusé.
 */
export function prepare(result: AgentResult): AgentResult {
  for (const a of result.actions) {
    if (!ACTION_KINDS[a.kind]) throw new Error(`Action inconnue : ${a.kind} (aucune règle d'autonomie définie)`);
    if (levelOf(a.kind) === "L1") throw new Error(`${a.kind} est une action automatique : à déclarer comme tâche, pas comme proposition`);
  }
  return { ...result, events: result.events.map((e) => ({ ...e, target_agent: routeEvent(e.type) })) };
}

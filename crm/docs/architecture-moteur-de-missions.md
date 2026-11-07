# Moteur de missions JARVIS : architecture

État : conçu et testé en base locale ; migration 0022 NON appliquée sur la production. Aucune IA branchée, aucune clé, aucune dépense.

## Parcours d'une instruction

| Étape | Qui | Ce qui est enregistré |
|---|---|---|
| Réception | formulaire du centre de commande, une alerte, un événement | mission `recue` + événement `mission.recue` |
| Compréhension | JARVIS Core (règles aujourd'hui, Claude ensuite) | plan = liste d'étapes attribuées à des agents ; mission `en_file` ; ou question `attente_precision` |
| Attribution | Core | chaque étape porte un agent ; le chef de mission est `lead_agent` |
| Exécution | un exécuteur serveur | prise avec un bail ; étapes `en_cours` puis `faite` ; événements `etape.debut` et `etape.fin` |
| Collaboration | agents | messages `jarvis_agent_messages` (en attente puis traité) : c'est ce qui envoie deux agents en salle de collaboration |
| Résultat | dernier agent | `result` de la mission, événement `mission.terminee` |
| Validation humaine | vous | `jarvis_validations` ; L2 : approbation = relance de la mission, sans effet extérieur ; L3 : jamais approuvable |
| Erreur | exécuteur | nouvel essai avec délai croissant (30 s, 60 s…), puis `echouee` visible |
| Interruption | arrêt du serveur | le bail expire, un autre exécuteur reprend, l'étape interrompue repart |

## Garanties (vérifiées par tests PGlite)

- La base est la machine à états ; une étape ne se termine que si elle est en cours, et seul le détenteur du bail peut agir.
- Deux exécuteurs ne prennent jamais la même mission (`for update skip locked`).
- Une même situation (`dedupe_key`) ne crée pas deux missions vivantes.
- Le journal `jarvis_mission_events` est en ajout seul.
- Tout est réservé au dirigeant (RLS `is_owner()`), fonctions comprises.
- Budget : `jarvis_budgets.global = 0` par défaut, donc aucun appel d'IA n'est autorisé tant que vous ne relevez pas ce plafond.

## Lien avec les locaux

La vue `jarvis_agent_live` est la seule source des attitudes en mode réel :
`travaille` = une étape en cours sur une mission au bail valide ; `validations_en_attente` = documents ; `en_difficulte` = mission échouée dans la journée ; `collaborations` = messages en attente entre agents.
Sans étape en cours, aucun agent n'est montré au travail. Sans moteur installé, les locaux retombent sur la lecture par passages enregistrés.

## Exécuteur côté serveur (navigateur fermé)

Une route protégée par secret exécute UNE étape à la fois (`jarvis_claim_next`, `jarvis_step_start`, travail, `jarvis_step_finish` ou `jarvis_step_fail`). Déclenchement : planification Supabase toutes les minutes et dès la création d'une mission. Étapes courtes pour tenir dans les limites de durée de l'offre gratuite. À décider : planification Supabase (aucun service nouveau), serveur dédié, ou Managed Agents d'Anthropic.

## Agents et IA

Chaque agent a un `AgentProfile` (rôle, consignes système, outils autorisés, mémoire lisible, modèle). Les outils sont des fonctions de lecture déterministes (indicateurs, alertes, fiches) ; les chiffres ne sont jamais calculés par l'IA. Toute action est une proposition validée par vous. `lib/jarvis/engine/llm.ts` fixe le contrat d'un adaptateur Claude ; l'adaptateur par défaut refuse tout appel. Brancher Claude demande : votre accord, une clé API créée par vous (crédits Max de 100 $ par mois sans carte), un plafond de dépense, et la décision sur les données transmises.

## Ce qui reste à construire

1. Exécuteur (route + planification) et outils de lecture des agents.
2. Compréhension des instructions par règles (puis Claude).
3. Écrans : missions, validations, historique dans les locaux.
4. Agents réels un par un : Opérations, Commercial, Relation client en premier.

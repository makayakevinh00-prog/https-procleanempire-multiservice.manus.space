import type { AgentKey, AgentSpec } from "./types";

/**
 * Fiche de chaque agent : une seule source de vérité, affichée dans /jarvis.
 * `status: "actif"` n'est donné qu'à un agent réellement construit et testé ; les autres sont « prévus » et le disent.
 * Aucun agent n'a de pouvoir propre : il lit les données du CRM, rend un résultat à JARVIS Core, et c'est le Core qui applique les niveaux d'autonomie.
 */
export const AGENTS: AgentSpec[] = [
  {
    key: "core", name: "JARVIS Core", department: "Direction", status: "actif",
    mission: "Cerveau unique de l'entreprise : reçoit les événements, choisit l'agent concerné, applique les niveaux d'autonomie, garde la mémoire commune et vous présente ce qui demande votre attention.",
    responsibilities: ["Enregistrer chaque passage d'agent et son résultat", "Dédoublonner les alertes et les propositions", "Appliquer L1 / L2 / L3 (règles tenues par la base, pas par les agents)", "Acheminer les demandes entre agents", "Gérer la mémoire commune (clés déclarées, rédacteurs autorisés, durée de vie)", "Tracer chaque décision (journal d'audit)"],
    limits: ["Ne décide jamais à la place du patron sur du L2 ou du L3", "N'envoie aucun message à un client", "N'écrit pas dans la base en dehors des tables JARVIS (hors tâches créées pour le patron)"],
    data: { read: ["Tables JARVIS", "Registre des agents"], write: ["jarvis_runs", "jarvis_alerts", "jarvis_actions", "jarvis_tasks", "jarvis_events", "jarvis_memory"] },
    tools: [{ name: "Base Supabase du CRM (session du patron, RLS)", state: "disponible" }, { name: "Tâche quotidienne Vercel (1/jour)", state: "disponible" }],
    memory: { own: ["Journal des passages"], shared: ["Gardien de toute la mémoire commune"] },
    automations: [{ label: "Enregistrement atomique d'un passage (alertes, propositions, tâches, événements, mémoire)", state: "construit" }, { label: "Décision du patron (valider / refuser) avec trace", state: "construit" }, { label: "Routage des demandes entre agents", state: "construit" }, { label: "Déclenchement planifié des agents (matin / soir)", state: "prevu" }, { label: "Briefing quotidien unifié envoyé au patron", state: "prevu" }],
    collaborates: [{ agent: "finance", why: "Seul agent construit : premier à utiliser le circuit complet" }],
    autonomy: { L1: ["Journaliser, dédoublonner, créer des tâches pour le patron"], L2: ["Aucune action propre"], L3: ["Aucune action propre"] },
    listens: []
  },
  {
    key: "finance", name: "Finance & Administration", department: "Département 1", status: "actif",
    mission: "Surveiller la santé financière et administrative : factures en retard, délais incohérents, contrats qui ne se facturent pas, anomalies d'écriture ; signaler avant que ça coûte de l'argent.",
    responsibilities: ["Repérer les factures en retard et suivre l'état des relances", "Détecter les délais de paiement hors règle (15 jours)", "Détecter une facture annulée après envoi sans avoir", "Repérer les contrats actifs incomplets (donc non facturés automatiquement)", "Signaler les brouillons oubliés", "Vérifier la cohérence des conditions (devis / factures)", "Constater que le rapprochement bancaire est inactif", "Calculer le retard moyen de paiement par client (mémoire commune)", "Produire un briefing financier chiffré"],
    limits: ["Ne modifie, n'annule ni n'émet aucune facture, aucun avoir", "N'envoie aucun e-mail (les relances automatiques restent celles de l'automate existant)", "Ne déclenche aucun paiement, aucun engagement financier", "Ne touche jamais aux clés d'accès de la base ni à la synchronisation bancaire", "Aucune action automatique sur un contact réservé : alerte seulement"],
    data: { read: ["Factures (en-têtes)", "Contrats", "Paiements importés", "Réglages (délai, relances, conditions des devis)", "Clients (nom, statut réservé)"], write: ["Alertes, propositions, tâches, événements et mémoire JARVIS uniquement"] },
    tools: [{ name: "Base du CRM (lecture, session du patron)", state: "disponible" }, { name: "Qonto (rapprochement automatique)", state: "a_decider" }, { name: "Signature électronique (Yousign)", state: "a_decider" }, { name: "Expert-comptable (export, espace dédié)", state: "a_decider" }],
    memory: { own: ["Dernier briefing"], shared: ["client.delai_paiement_moyen_jours (seul rédacteur)"] },
    automations: [
      { label: "Surveillance des factures en retard (alertes, tâche pour le contact réservé exclu)", state: "construit" },
      { label: "Délai de paiement hors règle", state: "construit" },
      { label: "Facture annulée après envoi sans avoir (alerte + proposition d'avoir bloquée L3)", state: "construit" },
      { label: "Contrats actifs incomplets (alerte + demande à Opérations)", state: "construit" },
      { label: "Brouillons de plus de 7 jours (tâche)", state: "construit" },
      { label: "Retard moyen de paiement par client (mémoire commune)", state: "construit" },
      { label: "Briefing financier chiffré", state: "construit" },
      { label: "Relances 3 niveaux, facturation mensuelle automatique (automate quotidien existant, hors JARVIS)", state: "construit" },
      { label: "Rapprochement bancaire Qonto", state: "prevu" },
      { label: "Dépenses, justificatifs, trésorerie, prévisions", state: "prevu" },
      { label: "Export comptable et espace expert-comptable", state: "prevu" },
      { label: "Signature électronique des devis et contrats", state: "prevu" }
    ],
    collaborates: [{ agent: "operations", why: "Contrats incomplets : sans jours de passage, pas de planning ni de facture" }, { agent: "juridique", why: "Facture annulée sans avoir, mise en demeure : actes à encadrer" }, { agent: "commercial", why: "Devis acceptés → contrat → facturation" }, { agent: "relation", why: "Relances et échanges avec le client sur les impayés" }],
    autonomy: {
      L1: ["Créer des alertes", "Créer des tâches pour le patron", "Écrire le retard moyen de paiement en mémoire commune", "Produire le briefing"],
      L2: ["Proposer un message à un client en retard malgré les relances (rien n'est envoyé)", "Proposer un changement de conditions"],
      L3: ["Émettre un avoir", "Mise en demeure", "Tout paiement, achat ou engagement : hors du circuit JARVIS"]
    },
    listens: []
  },
  {
    key: "commercial", name: "Commercial & Développement", department: "Département 2", status: "prevu",
    mission: "Développer le chiffre d'affaires : qualifier les demandes, suivre le pipeline et les devis, relancer, mesurer la transformation réelle.",
    responsibilities: ["Qualification des demandes entrantes", "Suivi du pipeline et des devis sans réponse", "Propositions commerciales", "Fichier de prospects", "Mesure du taux de transformation", "Fidélisation et ventes complémentaires"],
    limits: ["Aucun devis ni remise envoyé sans validation (L2)", "Pas de démarchage massif", "Ne garantit jamais un chiffre d'affaires non obtenu"],
    data: { read: ["Demandes du site", "Clients et prospects", "Devis", "Contrats"], write: ["Propositions JARVIS, tâches"] },
    tools: [{ name: "Base du CRM", state: "disponible" }, { name: "Microsoft 365 (mails)", state: "a_connecter" }, { name: "Recherche web (Firecrawl)", state: "disponible" }],
    memory: { own: ["Historique des propositions"], shared: ["Préférences et conditions validées par client (à déclarer)"] },
    automations: [{ label: "Relances de devis J+5 / J+12 (automate existant)", state: "construit" }, { label: "Qualification IA et brouillons de devis", state: "prevu" }, { label: "Tableau de transformation", state: "prevu" }],
    collaborates: [{ agent: "relation", why: "Premier contact et suivi" }, { agent: "finance", why: "Du devis accepté à la facture" }, { agent: "marketing", why: "Origine des prospects" }],
    autonomy: { L1: ["Classer, créer des tâches, rapports"], L2: ["Envoi de devis, remises, propositions"], L3: ["Engagements contractuels"] },
    listens: []
  },
  {
    key: "operations", name: "Opérations & Exploitation", department: "Département 3", status: "prevu",
    mission: "Faire exécuter les prestations : planning, affectation, consignes, pointage, qualité, incidents, rapports d'intervention.",
    responsibilities: ["Planning et affectation", "Confirmation des interventions", "Consignes et checklists", "Pointage GPS et retards", "Anomalies et réclamations", "Rapports avec photos avant / après", "Séparer tarifs et procédures par type de prestation (bureaux, Airbnb, copropriété, ponctuel)"],
    limits: ["Ne gère clés et accès que selon les procédures autorisées", "Aucune modification tarifaire"],
    data: { read: ["Contrats", "Sites", "Missions", "Équipe", "Photos"], write: ["Missions, tâches, événements"] },
    tools: [{ name: "App agent (lien privé) et pointage GPS", state: "disponible" }, { name: "Calendriers iCal des annonces", state: "a_connecter" }],
    memory: { own: ["Habitudes d'un site"], shared: ["Consignes validées d'un site"] },
    automations: [{ label: "Planning généré depuis les contrats (automate existant)", state: "construit" }, { label: "Réception des demandes des autres agents (ex. contrat incomplet)", state: "prevu" }, { label: "Rapport d'intervention automatique", state: "prevu" }],
    collaborates: [{ agent: "rh", why: "Disponibilités et remplacements" }, { agent: "finance", why: "Prestations réalisées → facturation" }, { agent: "relation", why: "Réclamations" }],
    autonomy: { L1: ["Créer des missions, tâches, alertes de retard"], L2: ["Changement d'intervenant sur un contrat"], L3: ["Clés et accès hors procédure"] },
    listens: ["contract.incomplete"]
  },
  {
    key: "relation", name: "Relation client", department: "Département 4", status: "prevu",
    mission: "Représenter ProClean dans les échanges courants avec une mémoire par client : réponses, suivi, réclamations, avis.",
    responsibilities: ["Réponses aux demandes courantes", "Mémoire relationnelle par client", "Réclamations et suivi de satisfaction", "Avis clients"],
    limits: ["Réclamations sensibles, négociations, remises : validation (L2)", "Ne s'engage jamais contractuellement"],
    data: { read: ["Clients", "Conversations", "Missions", "Factures (statut)"], write: ["Brouillons de réponse, mémoire"] },
    tools: [{ name: "WhatsApp Business (Bird)", state: "a_connecter" }, { name: "Microsoft 365 (mails)", state: "a_connecter" }, { name: "API Claude (réponses sans le patron)", state: "a_decider" }],
    memory: { own: ["Fil de conversation"], shared: ["Préférences, demandes particulières, incidents d'un client"] },
    automations: [{ label: "Accusé de réception automatique du site (existant)", state: "construit" }, { label: "Réponses FAQ validées", state: "prevu" }, { label: "Boîte de conversations unifiée", state: "prevu" }],
    collaborates: [{ agent: "commercial", why: "Qualification" }, { agent: "operations", why: "Incidents" }, { agent: "juridique", why: "Réclamations à enjeu" }],
    autonomy: { L1: ["Accusés, FAQ validées, classement"], L2: ["Réponses non standard, réclamations"], L3: ["Remises, engagements"] },
    listens: []
  },
  {
    key: "marketing", name: "Marketing & Communication", department: "Département 5", status: "prevu",
    mission: "Alimenter la demande : calendrier éditorial, réseaux, référencement, campagnes, mesure.",
    responsibilities: ["Calendrier éditorial", "Contenus réseaux", "SEO du site", "Campagnes et réactivation", "Mesure des résultats"],
    limits: ["Aucune publication officielle sans validation (L2)", "Aucune dépense publicitaire sans autorisation (L3)"],
    data: { read: ["Site", "Clients (segments)", "Statistiques"], write: ["Propositions, calendrier"] },
    tools: [{ name: "Metricool", state: "a_connecter" }, { name: "Canva", state: "disponible" }, { name: "Search Console / analytics", state: "a_connecter" }],
    memory: { own: ["Calendrier et résultats"], shared: ["Ton de marque (charte)"] },
    automations: [{ label: "Calendrier éditorial hebdomadaire", state: "prevu" }, { label: "Audit SEO / sitemap", state: "prevu" }],
    collaborates: [{ agent: "studio", why: "Visuels" }, { agent: "commercial", why: "Prospects générés" }],
    autonomy: { L1: ["Brouillons, rapports de performance"], L2: ["Publication, campagne"], L3: ["Dépense publicitaire"] },
    listens: []
  },
  {
    key: "studio", name: "Creative Studio", department: "Département 6", status: "prevu",
    mission: "Produire des livrables visuels réels (site, CRM, documents PDF, réseaux) selon une charte centrale ; distinguer propositions et publié.",
    responsibilities: ["Charte graphique centrale", "Web design et UX", "Design du CRM et de l'app", "Documents (devis, factures, contrats, propositions, rapports)", "Visuels réseaux"],
    limits: ["Toute modification du site, du CRM ou de l'identité officielle est validée avant publication", "Ne prétend jamais qu'une création est publiée si elle ne l'est pas"],
    data: { read: ["Charte", "Site", "Modèles de documents"], write: ["Maquettes, branches de prévisualisation"] },
    tools: [{ name: "Canva", state: "disponible" }, { name: "Figma", state: "disponible" }, { name: "Génération d'images (Alexya, crédits limités)", state: "disponible" }],
    memory: { own: ["Historique des créations"], shared: ["Charte et logo validés"] },
    automations: [{ label: "Moteur PDF premium (devis, factures, contrats)", state: "construit" }, { label: "Revue de design mensuelle", state: "prevu" }],
    collaborates: [{ agent: "marketing", why: "Publications" }, { agent: "finance", why: "Documents comptables" }],
    autonomy: { L1: ["Maquettes et propositions"], L2: ["Publication, remplacement d'un élément officiel"], L3: ["Dépense (crédits payants)"] },
    listens: []
  },
  {
    key: "rh", name: "RH & Prestataires", department: "Département 7", status: "prevu",
    mission: "Savoir qui est disponible, avec quelles compétences et quels documents ; faciliter recrutement, intégration et remplacements.",
    responsibilities: ["Fiches intervenants et prestataires", "Disponibilités et compétences", "Documents administratifs à jour", "Recrutement (seuils d'heures)", "Remplacements"],
    limits: ["Décisions sociales et obligations légales restent humaines", "Aucune donnée RH exposée à d'autres rôles"],
    data: { read: ["Équipe", "Fournisseurs auto-entrepreneurs", "Missions"], write: ["Tâches, alertes"] },
    tools: [{ name: "Base du CRM", state: "disponible" }],
    memory: { own: ["Dossier intervenant"], shared: ["Disponibilités"] },
    automations: [{ label: "Suivi des heures et seuils de recrutement (existant)", state: "construit" }, { label: "Alertes documents expirés", state: "prevu" }],
    collaborates: [{ agent: "operations", why: "Affectations" }, { agent: "juridique", why: "Documents obligatoires" }],
    autonomy: { L1: ["Alertes, tâches"], L2: ["Proposition de recrutement, remplacement"], L3: ["Embauche, rupture, paie"] },
    listens: []
  },
  {
    key: "juridique", name: "Juridique & Conformité", department: "Département 8", status: "prevu",
    mission: "Suivre les échéances et documents (assurances, contrats), la protection des données et la traçabilité ; signaler les risques. Ne remplace pas un conseil juridique.",
    responsibilities: ["Registre des documents et échéances", "RGPD et conservation", "Obligations contractuelles", "Procédures et incidents", "Suivi qualité"],
    limits: ["Ne se présente jamais comme un avocat", "Aucun acte juridique : toujours L3"],
    data: { read: ["Contrats", "Documents", "Journal d'audit"], write: ["Alertes, tâches"] },
    tools: [{ name: "Base du CRM", state: "disponible" }],
    memory: { own: ["Registre des échéances"], shared: ["Conditions contractuelles validées"] },
    automations: [{ label: "Réception des demandes des autres agents (ex. facture annulée sans avoir)", state: "prevu" }, { label: "Alertes d'échéance de documents", state: "prevu" }],
    collaborates: [{ agent: "finance", why: "Avoirs, mises en demeure" }, { agent: "rh", why: "Documents des intervenants" }],
    autonomy: { L1: ["Alertes d'échéance, classement"], L2: ["Mise à jour d'une procédure"], L3: ["Tout acte juridique engageant l'entreprise"] },
    listens: ["invoice.cancelled_after_sent"]
  }
];

export const AGENT_BY_KEY = Object.fromEntries(AGENTS.map((a) => [a.key, a])) as Record<AgentKey, AgentSpec>;

/** Quel agent reçoit ce type d'événement ? Un événement que personne n'écoute est une erreur de conception, pas un message perdu. */
export function routeEvent(type: string): AgentKey {
  const owner = AGENTS.find((a) => a.listens.includes(type));
  if (!owner) throw new Error(`Événement sans destinataire : ${type}`);
  return owner.key;
}

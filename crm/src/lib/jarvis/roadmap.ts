import type { AgentKey } from "./types";

/**
 * Calendrier de construction. Hypothèse : S1 = lundi 16 novembre 2026, SI le déploiement du socle est autorisé avant.
 * Toute date glisse d'autant que votre validation tarde ; les durées sont des estimations (± 40 %), pas des engagements.
 * Un agent n'est « Construit » que lorsque TOUTES ses preuves sont réunies.
 */
export interface Roadmap {
  window: string;
  order: number;
  /** Décisions ou connexions qui VOUS reviennent : sans elles, l'étape ne démarre pas. */
  gates: string[];
  skills: string[];
  tools: string[];
  memory: string[];
  deliverables: string[];
  /** Résultats vérifiables : ce qui permet de dire « fait » sans me croire sur parole. */
  proof: string[];
  cost: string;
}

export const ROADMAP: Record<AgentKey, Roadmap> = {
  core: {
    window: "S2–S4 (23 nov → 20 déc 2026)", order: 1,
    gates: ["Autorisation d'appliquer la migration 0021 puis de déployer", "Activation de pg_cron dans Supabase (gratuit)"],
    skills: ["Planifier des passages", "Composer un briefing unique", "Acheminer et suivre les demandes entre agents", "Appliquer les niveaux L1/L2/L3"],
    tools: ["Base du CRM", "pg_cron (Supabase, gratuit)", "Resend (déjà en place)", "Supabase Realtime (inclus)"],
    memory: ["Journal des passages", "Registre des clés de mémoire commune (déclaration, rédacteur, durée de vie)"],
    deliverables: ["Passages planifiés matin et soir, sans session ouverte", "Briefing quotidien unifié envoyé par e-mail", "Temps réel dans l'open space (Realtime)", "Purge automatique des journaux anciens"],
    proof: ["10 jours de suite : 2 passages/jour exécutés sans intervention (journal)", "Le briefing arrive à l'heure, sans donnée client dans l'objet", "Une demande entre agents est traitée et marquée « traitée » de bout en bout", "Aucune action L2/L3 exécutée sans trace de votre décision"],
    cost: "0 € (pg_cron et Realtime inclus dans l'offre gratuite ; à vérifier au moment de l'activation)"
  },
  finance: {
    window: "S3–S12 (30 nov 2026 → 6 fév 2027), en continu", order: 2,
    gates: ["Clé d'accès serveur de la base posée par vous sur Vercel (type « sensitive »), jamais dans le chat", "Réponses de l'expert-comptable au questionnaire", "Accès comptable Qonto ou non (décide du module Dépenses)"],
    skills: ["Rapprocher un virement et une facture", "Détecter une dépense inhabituelle", "Calculer marge et trésorerie", "Préparer un export comptable"],
    tools: ["Qonto (API, lecture)", "Base du CRM", "Export CSV/ZIP", "Signature électronique (décision à prendre)"],
    memory: ["client.delai_paiement_moyen_jours (déjà en place, réactivé quand les dates sont fiables)"],
    deliverables: ["Rapprochement Qonto fiable", "Tableau de bord Direction (facturé, encaissé, marge, trésorerie)", "Espace expert-comptable (accès dédié, double authentification)", "Alertes TVA 0 %, numéros absents, adresses manquantes"],
    proof: ["≥ 25 des 27 factures payées rapprochées d'un virement réel", "« Combien ai-je gagné ce mois-ci ? » répond avec des chiffres réconciliés à Qonto à l'euro près", "Premier export accepté par le logiciel du cabinet sans retouche manuelle", "Le rapport d'anomalies passe de 15 à 0 point ouvert, chacun clôturé par vous"],
    cost: "0 € (Yousign éventuel : décision séparée)"
  },
  operations: {
    window: "S3–S6 (30 nov → 27 déc 2026)", order: 3,
    gates: ["Compléter les 3 contrats actifs incomplets (SWYFO, Goussainville, TK) : c'est de la saisie, pas du code", "Valider la liste des consignes par site"],
    skills: ["Planifier et affecter", "Détecter retard et absence (pointage GPS)", "Rédiger un rapport d'intervention", "Traiter une demande d'un autre agent"],
    tools: ["Base du CRM (missions, sites, équipe, photos)", "Application des agents (lien privé, GPS)", "Calendriers iCal des annonces (à connecter, votre accord)"],
    memory: ["site.consignes (rédacteur : Opérations, validées par vous)", "site.habitudes"],
    deliverables: ["Alerte : mission non affectée à J-2, retard d'arrivée, départ non pointé", "Rapport d'intervention automatique (checklist + photos + durée)", "Réception des demandes de Finance (contrat incomplet)", "Tarifs et procédures séparés par type de prestation"],
    proof: ["0 mission planifiée à J+2 sans intervenant", "Chaque retard réel de pointage détecté en moins de 15 minutes (test sur 2 semaines)", "Les 4 contrats incomplets sont complétés ou assumés, et la demande « contrat incomplet » est clôturée", "Un rapport d'intervention est généré pour 100 % des missions terminées"],
    cost: "0 €"
  },
  juridique: {
    window: "S5–S7 (14 déc 2026 → 10 jan 2027)", order: 4,
    gates: ["Vous fournissez la liste des documents (Kbis, assurances, contrats) et leurs échéances", "Validation de la durée de conservation RGPD"],
    skills: ["Tenir un registre d'échéances", "Signaler un document manquant", "Instruire une demande (ex. facture annulée sans avoir)", "Tracer ce qui est exporté"],
    tools: ["Base du CRM (nouvelle table du registre)", "Journal d'audit existant"],
    memory: ["Registre des échéances", "Conditions contractuelles validées par client"],
    deliverables: ["Registre des documents et échéances", "Alertes 60/30/7 jours avant échéance", "Registre RGPD des traitements (cabinet comptable inclus)", "Prise en charge des demandes reçues de Finance"],
    proof: ["100 % des documents obligatoires ont une échéance connue", "Une échéance de test déclenche l'alerte aux dates prévues", "La demande « avoir » de F2610-000058 est instruite et clôturée par votre décision"],
    cost: "0 € · ne remplace pas un conseil juridique"
  },
  commercial: {
    window: "S7–S10 (28 déc 2026 → 24 jan 2027)", order: 5,
    gates: ["Connexion lecture de la boîte Microsoft 365 (application Microsoft gratuite) : votre accord", "Validation des gabarits de proposition commerciale"],
    skills: ["Qualifier une demande", "Suivre devis et pipeline", "Calculer le taux de transformation", "Préparer une proposition (copropriété, bureau, Airbnb)"],
    tools: ["Base du CRM", "Microsoft 365 (lecture)", "Recherche web (fichier de prospects)"],
    memory: ["Historique des propositions", "client.conditions_validees (à déclarer)"],
    deliverables: ["Tableau pipeline et taux de transformation", "Alerte devis sans réponse (J+5, J+12) enrichie", "Propositions commerciales PDF aux gabarits validés", "Fichier de prospects qualifiés"],
    proof: ["Le taux de transformation affiché = votre décompte manuel sur 3 mois, au dossier près", "Aucun devis ni remise envoyé sans votre validation (L2), vérifié au journal", "3 propositions réellement envoyées par vous, issues de l'agent"],
    cost: "0 €"
  },
  rh: {
    window: "S8–S10 (4 → 24 jan 2027)", order: 6,
    gates: ["Liste des intervenants et documents obligatoires de chacun", "Décision sur le niveau de données RH stockées"],
    skills: ["Tenir les disponibilités", "Suivre les documents d'un intervenant", "Proposer un remplacement", "Surveiller les seuils d'heures"],
    tools: ["Base du CRM (équipe, fournisseurs auto-entrepreneurs, missions)"],
    memory: ["Dossier intervenant (accès limité)"],
    deliverables: ["Espace « Intervenants » : disponibilités, compétences, documents", "Alerte document expiré", "Proposition de remplacement (L2)"],
    proof: ["Un intervenant absent est remplacé par une proposition valide en moins de 5 minutes", "0 document expiré sans alerte (test sur dates fictives)", "Aucune donnée RH visible depuis un autre rôle (test d'accès direct)"],
    cost: "0 €"
  },
  relation: {
    window: "S11–S16 (25 jan → 7 mars 2027)", order: 7,
    gates: ["Clé API Claude : création par vous, plafond mensuel fixé (coût à l'usage)", "Boîte Microsoft 365 connectée (si pas déjà fait par Commercial)", "WhatsApp : numéro ProClean connecté chez Bird, vérification Meta (coût par conversation)", "Validation de la liste des réponses FAQ autorisées"],
    skills: ["Qualifier un message", "Rédiger un brouillon de réponse au ton ProClean", "Retrouver la mémoire d'un client", "Traiter une réclamation"],
    tools: ["API Claude (serveur)", "Microsoft 365", "Bird WhatsApp", "Base du CRM (nouvelles tables conversations)"],
    memory: ["Fil de conversation", "client.preferences", "client.incidents"],
    deliverables: ["Boîte de conversations unifiée (e-mail, WhatsApp, site)", "Brouillons de réponse à valider", "Réponses FAQ validées automatiques (L1)", "Suivi des réclamations"],
    proof: ["Délai de première réponse mesuré avant/après", "100 % des réponses hors FAQ passent par votre validation (journal)", "0 message envoyé à un contact réservé", "Coût API réel du mois ≤ le plafond fixé"],
    cost: "API Claude à l'usage (estimation à mesurer le 1er mois) + conversations WhatsApp (Meta)"
  },
  studio: {
    window: "S13–S18 (8 fév → 28 mars 2027)", order: 8,
    gates: ["Fournir le logo HD source et valider la charte", "Choix d'un seul référentiel de charte (fichier du dépôt, Canva ou Figma)", "Crédits d'images : décision par achat (rien d'automatique)"],
    skills: ["Appliquer une charte", "Maquetter et prototyper", "Produire un document PDF", "Distinguer proposition et publié"],
    tools: ["Canva", "Figma", "Moteur PDF du CRM", "Génération d'images (crédits à votre charge)"],
    memory: ["Charte et logo validés (mémoire commune, rédacteur : Studio, validée par vous)"],
    deliverables: ["Charte centrale versionnée", "Gabarits : proposition commerciale, rapport d'intervention, présentation copropriété", "Revue de design mensuelle du site et du CRM", "Aperçus avant publication"],
    proof: ["Tous les documents émis portent la même charte (contrôle visuel par page type)", "Chaque création est étiquetée « proposition » ou « publiée », jamais confondues", "Une modification du site n'est publiée qu'après votre validation (journal de déploiement)"],
    cost: "0 € de base ; crédits d'images à votre décision"
  },
  marketing: {
    window: "S17–S22 (8 mars → 18 avr 2027)", order: 9,
    gates: ["Connexions Metricool et Search Console (votre accord)", "Validation de la ligne éditoriale", "Aucun budget publicitaire sans autorisation explicite (L3)"],
    skills: ["Planifier un calendrier éditorial", "Auditer le référencement", "Mesurer la performance", "Proposer une campagne"],
    tools: ["Metricool", "Canva", "Search Console / analytics", "Recherche web"],
    memory: ["Calendrier et résultats", "Ton de marque"],
    deliverables: ["Calendrier éditorial hebdomadaire à valider", "Audit SEO et sitemap corrigés", "Rapport de performance mensuel", "Campagnes de réactivation clients"],
    proof: ["4 semaines de contenus programmés, tous validés par vous avant publication", "Sitemap indexé (Search Console)", "Le rapport mensuel chiffre prospects et coût par prospect ; aucun chiffre inventé"],
    cost: "0 € (publicité : jamais sans votre ordre)"
  }
};

export const ORDERED_AGENTS = (Object.entries(ROADMAP) as [AgentKey, Roadmap][]).sort((a, b) => a[1].order - b[1].order).map(([k]) => k);

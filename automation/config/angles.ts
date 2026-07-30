/**
 * Les angles éditoriaux. Le planificateur en choisit un par jour en respectant
 * un délai de réutilisation, ce qui empêche deux publications semblables de se
 * suivre.
 */

export type AngleId =
  | "avant-apres"
  | "conseil-nettoyage"
  | "astuce-pro"
  | "erreur-frequente"
  | "coulisses"
  | "storytelling"
  | "temoignage"
  | "faq"
  | "presentation-service"
  | "resultat-obtenu"
  | "promotion"
  | "fait-interessant"
  | "motivation";

export type Angle = {
  id: AngleId;
  label: string;
  /** Brief donné au rédacteur : ce que l'angle doit produire. */
  brief: string;
  /** Nombre minimum de jours avant de pouvoir réutiliser cet angle. */
  cooldownDays: number;
  /** L'angle exige-t-il une photo réelle ? */
  requiresPhoto: boolean;
  /** Poids relatif dans le tirage (plus haut = plus fréquent). */
  weight: number;
};

export const angles: Angle[] = [
  {
    id: "avant-apres",
    label: "Avant / après",
    brief:
      "Décrire l'état de départ sans dramatiser, puis le résultat. Le contraste porte le message : ne pas surjouer avec des adjectifs.",
    cooldownDays: 4,
    requiresPhoto: true,
    weight: 3,
  },
  {
    id: "resultat-obtenu",
    label: "Résultat obtenu",
    brief:
      "Montrer un chantier terminé et ce que ça change concrètement pour le client (temps gagné, image, confort).",
    cooldownDays: 5,
    requiresPhoto: true,
    weight: 2,
  },
  {
    id: "conseil-nettoyage",
    label: "Conseil de nettoyage",
    brief:
      "Un conseil applicable immédiatement par le lecteur, précis et honnête. Dire aussi quand il vaut mieux faire appel à un professionnel.",
    cooldownDays: 4,
    requiresPhoto: false,
    weight: 3,
  },
  {
    id: "astuce-pro",
    label: "Astuce de professionnel",
    brief:
      "Une méthode ou un geste métier que le grand public ignore. Expliquer le pourquoi technique, pas seulement le comment.",
    cooldownDays: 5,
    requiresPhoto: false,
    weight: 2,
  },
  {
    id: "erreur-frequente",
    label: "Erreur fréquente",
    brief:
      "Une erreur courante, ce qu'elle abîme réellement, et le bon réflexe. Ton pédagogue, jamais moralisateur.",
    cooldownDays: 5,
    requiresPhoto: false,
    weight: 2,
  },
  {
    id: "coulisses",
    label: "Coulisses",
    brief:
      "Le déroulé réel d'une intervention : préparation, matériel, contraintes horaires. Montrer le sérieux par le détail.",
    cooldownDays: 6,
    requiresPhoto: false,
    weight: 2,
  },
  {
    id: "storytelling",
    label: "Storytelling",
    brief:
      "Une situation vécue racontée en trois temps : le problème du client, ce qui a été fait, ce que ça a changé. Aucune invention de faits vérifiables.",
    cooldownDays: 7,
    requiresPhoto: false,
    weight: 2,
  },
  {
    id: "temoignage",
    label: "Témoignage client",
    brief:
      "Mettre en valeur un retour client réel fourni dans le contexte. Ne jamais inventer de citation ni de nom.",
    cooldownDays: 7,
    requiresPhoto: false,
    weight: 1,
  },
  {
    id: "faq",
    label: "Question fréquente",
    brief:
      "Une question que posent réellement les clients, avec une réponse directe et complète. Pas de langue de bois sur les tarifs.",
    cooldownDays: 6,
    requiresPhoto: false,
    weight: 2,
  },
  {
    id: "presentation-service",
    label: "Présentation d'un service",
    brief:
      "Présenter une prestation : à qui elle s'adresse, ce qu'elle comprend, dans quels cas elle est pertinente.",
    cooldownDays: 6,
    requiresPhoto: false,
    weight: 2,
  },
  {
    id: "promotion",
    label: "Promotion",
    brief:
      "Mettre en avant une offre ou une disponibilité. Rester factuel : aucune fausse urgence, aucun compte à rebours inventé.",
    cooldownDays: 10,
    requiresPhoto: false,
    weight: 1,
  },
  {
    id: "fait-interessant",
    label: "Fait intéressant",
    brief:
      "Un fait vérifiable et surprenant lié à l'hygiène, aux matériaux ou à l'entretien. Pas de statistique inventée : si le chiffre n'est pas sûr, formuler sans chiffre.",
    cooldownDays: 6,
    requiresPhoto: false,
    weight: 1,
  },
  {
    id: "motivation",
    label: "Motivation entrepreneuriale",
    brief:
      "Réflexion courte de chef d'entreprise sur le métier, l'exigence, le service. Sobre, jamais donneur de leçons.",
    cooldownDays: 8,
    requiresPhoto: false,
    weight: 1,
  },
];

export const angleById = new Map(angles.map((angle) => [angle.id, angle]));

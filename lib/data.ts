export type Service = {
  slug: string;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  sectors: string[];
  benefits: string[];
};

export const trustProofs = [
  { label: "Clients actifs", value: "70+" },
  { label: "Interventions / mois", value: "450+" },
  { label: "Note Google", value: "4,9/5" },
  { label: "Avis vérifiés", value: "55+" },
  { label: "Zone couverte", value: "Toute l'Île-de-France" },
  { label: "Assurance", value: "RC Pro incluse" }
];

export const methodSteps = [
  {
    step: "01",
    title: "Audit téléphonique",
    description:
      "Nous clarifions vos contraintes d'exploitation, vos priorités et vos horaires d'ouverture."
  },
  {
    step: "02",
    title: "Visite des locaux",
    description:
      "Un responsable se déplace pour cadrer les surfaces, les accès et les points sensibles."
  },
  {
    step: "03",
    title: "Devis détaillé",
    description:
      "Vous recevez une proposition claire, avec périmètre, fréquence et engagements mesurables."
  },
  {
    step: "04",
    title: "Intervention",
    description:
      "Démarrage rapide avec une équipe dédiée, briefée selon vos standards."
  },
  {
    step: "05",
    title: "Contrôle qualité",
    description:
      "Des points de contrôle réguliers garantissent un niveau constant dans le temps."
  },
  {
    step: "06",
    title: "Suivi régulier",
    description:
      "Un interlocuteur unique ajuste le dispositif dès que vos besoins évoluent."
  }
];

export const faqs = [
  {
    question: "En combien de temps pouvez-vous démarrer ?",
    answer:
      "Nous pouvons intervenir sous 24 à 48 heures en Île-de-France après validation du devis."
  },
  {
    question: "Travaillez-vous avec sous-traitance ?",
    answer:
      "Nous privilégions des équipes pilotées directement pour garder un niveau de qualité stable et un suivi transparent."
  },
  {
    question: "Proposez-vous des contrats flexibles ?",
    answer:
      "Oui, nous adaptons fréquence, plage horaire et périmètre selon vos contraintes opérationnelles."
  },
  {
    question: "Quels types de locaux couvrez-vous ?",
    answer:
      "Bureaux, hôtels, restaurants, commerces, cabinets, copropriétés, entrepôts et autres sites professionnels."
  },
  {
    question: "Comment contrôlez-vous la qualité ?",
    answer:
      "Chaque site dispose d'un plan de contrôle avec points critiques, suivi de conformité et actions correctives."
  },
  {
    question: "Utilisez-vous des produits professionnels ?",
    answer:
      "Oui, nous utilisons des produits et protocoles professionnels adaptés aux surfaces et exigences d'hygiène."
  },
  {
    question: "Est-il possible de planifier hors horaires d'ouverture ?",
    answer:
      "Oui, nous intervenons tôt le matin, tard le soir ou le week-end selon vos contraintes."
  },
  {
    question: "Pouvez-vous prendre en charge plusieurs sites ?",
    answer:
      "Oui, notre organisation permet un pilotage multi-sites avec un reporting centralisé."
  },
  {
    question: "Proposez-vous une remise en état ponctuelle ?",
    answer:
      "Oui, nous réalisons des interventions ponctuelles : remise en état, fin de chantier, reprise de site."
  },
  {
    question: "Comment demander un devis ?",
    answer:
      "Remplissez le formulaire de devis ou contactez-nous directement. Nous revenons vers vous rapidement avec une estimation claire."
  }
];

export const services: Service[] = [
  {
    slug: "nettoyage-bureaux",
    title: "Nettoyage de bureaux",
    shortDescription:
      "Des espaces de travail propres chaque jour pour préserver votre image et le confort des équipes.",
    detailedDescription:
      "Nous entretenons vos bureaux avec des protocoles adaptés à la fréquentation, pour limiter les perturbations et maintenir des locaux irréprochables au quotidien.",
    sectors: ["PME", "Startups", "Cabinets", "Coworking"],
    benefits: [
      "Espaces de travail toujours présentables",
      "Moins de gestion interne pour vos équipes",
      "Interventions discrètes hors horaires sensibles"
    ]
  },
  {
    slug: "nettoyage-commerces",
    title: "Nettoyage commerces",
    shortDescription:
      "Des points de vente propres pour améliorer l'expérience client dès l'entrée.",
    detailedDescription:
      "Nous assurons l'entretien régulier de vos zones de vente, vitrines et espaces d'accueil pour soutenir votre image commerciale.",
    sectors: ["Boutiques", "Agences", "Showrooms"],
    benefits: [
      "Meilleure perception de votre enseigne",
      "Entretien coordonné avec vos horaires",
      "Protocoles adaptés aux flux clients"
    ]
  },
  {
    slug: "nettoyage-restaurants",
    title: "Nettoyage restaurants",
    shortDescription:
      "Un environnement propre pour protéger votre réputation et vos standards d'hygiène.",
    detailedDescription:
      "Nous intervenons sur les salles, sanitaires et zones techniques selon vos contraintes de service et obligations d'hygiène.",
    sectors: ["Restaurants", "Brasseries", "Traiteurs"],
    benefits: [
      "Conformité hygiène facilitée",
      "Interventions planifiées autour du service",
      "Diminution des risques de non-conformité"
    ]
  },
  {
    slug: "nettoyage-hotels",
    title: "Nettoyage hôtels",
    shortDescription:
      "Des espaces communs soignés pour une expérience client cohérente avec votre standing.",
    detailedDescription:
      "Nous prenons en charge halls, circulations, zones de détente et espaces techniques avec un contrôle qualité renforcé.",
    sectors: ["Hôtels", "Résidences", "Apparthôtels"],
    benefits: [
      "Image premium constante",
      "Réactivité en cas d'imprévu",
      "Suivi qualité structuré"
    ]
  },
  {
    slug: "nettoyage-vitrerie",
    title: "Nettoyage vitrerie",
    shortDescription:
      "Des vitrages nets pour valoriser votre façade et augmenter la luminosité intérieure.",
    detailedDescription:
      "Nettoyage de vitres intérieures et extérieures avec méthodes sécurisées et fréquence ajustée selon l'exposition.",
    sectors: ["Bureaux", "Commerces", "Hôtels"],
    benefits: [
      "Façade plus valorisante",
      "Entretien programmé sans interruption d'activité",
      "Méthodes adaptées aux hauteurs et accès"
    ]
  },
  {
    slug: "desinfection",
    title: "Désinfection",
    shortDescription:
      "Protocoles de désinfection ciblés pour limiter les risques sanitaires sur les points de contact.",
    detailedDescription:
      "Nous déployons des protocoles de désinfection adaptés aux environnements professionnels sensibles et aux zones de forte fréquentation.",
    sectors: ["Cabinets médicaux", "Bureaux", "Commerces", "Espaces publics"],
    benefits: [
      "Réduction du risque de contamination",
      "Procédures adaptées à chaque environnement",
      "Interventions planifiées sans gêner l'activité"
    ]
  },
  {
    slug: "parties-communes",
    title: "Parties communes",
    shortDescription:
      "Entretien régulier des halls, escaliers et zones de passage pour une image soignée.",
    detailedDescription:
      "Nous prenons en charge les parties communes des immeubles et ensembles tertiaires avec une fréquence ajustée à l'usage réel.",
    sectors: ["Copropriétés", "Immeubles de bureaux", "Résidences gérées"],
    benefits: [
      "Première impression maîtrisée pour vos visiteurs",
      "Organisation claire des fréquences de passage",
      "Suivi qualité pour maintenir un niveau constant"
    ]
  },
  {
    slug: "entretien-regulier",
    title: "Entretien régulier",
    shortDescription:
      "Un plan d'entretien continu pour garder vos locaux propres sans surcharge de pilotage interne.",
    detailedDescription:
      "Nous structurons vos interventions hebdomadaires ou quotidiennes autour d'un planning stable, contrôlé et évolutif.",
    sectors: ["PME", "Coworking", "Réseaux de commerces", "Cabinets"],
    benefits: [
      "Prévisibilité budgétaire et opérationnelle",
      "Qualité homogène dans la durée",
      "Ajustements rapides selon vos priorités"
    ]
  },
  {
    slug: "apres-chantier",
    title: "Après chantier",
    shortDescription:
      "Une remise en propreté rapide après travaux pour une reprise d'activité sans délai.",
    detailedDescription:
      "Évacuation des résidus, dépoussiérage technique et finition des surfaces avant ouverture ou livraison.",
    sectors: ["Bureaux", "Commerces", "Résidentiel collectif"],
    benefits: [
      "Mise en service plus rapide",
      "Site propre avant réception",
      "Coordination simple avec vos équipes"
    ]
  },
  {
    slug: "remise-en-etat",
    title: "Remise en état",
    shortDescription:
      "Intervention intensive pour reprendre un site en profondeur et repartir sur de bonnes bases.",
    detailedDescription:
      "Nous traitons les zones dégradées ou insuffisamment entretenues pour retrouver un niveau conforme à vos standards.",
    sectors: ["Multi-secteurs"],
    benefits: [
      "Rattrapage rapide de la qualité",
      "Plan d'action clair par zone",
      "Préparation efficace avant entretien régulier"
    ]
  }
];

export const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Realisations", href: "/realisations" },
  { label: "Galerie", href: "/galerie" },
  { label: "Equipe", href: "/equipe" },
  { label: "À propos", href: "/a-propos" },
  { label: "Nos services", href: "/services" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Devis", href: "/devis" },
  { label: "Contact", href: "/contact" }
];

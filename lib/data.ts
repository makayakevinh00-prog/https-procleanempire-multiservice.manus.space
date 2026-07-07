export type Service = {
  slug: string;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  sectors: string[];
  benefits: string[];
};

export const trustProofs = [
  { label: "Sites entretenus", value: "+70" },
  { label: "Interventions réalisées / mois", value: "+450" },
  { label: "Note Google", value: "4,9/5" },
  { label: "Avis vérifiés", value: "+55" },
  { label: "Zone d'intervention", value: "Toute l'Île-de-France" },
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
    title: "Visite technique",
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
    title: "Déploiement",
    description:
      "Mise en place organisée avec une équipe dédiée, briefée selon vos standards."
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
    question: "En combien de temps pouvez-vous démarrer une prestation ?",
    answer:
      "Nous pouvons intervenir sous 24 à 48 heures en Île-de-France après validation du devis."
  },
  {
    question: "Intervenez-vous en dehors des horaires d'ouverture ?",
    answer:
      "Oui, nos équipes peuvent intervenir tôt le matin, en soirée, de nuit ou le week-end afin de limiter l'impact sur votre activité."
  },
  {
    question: "Proposez-vous des contrats d'entretien ?",
    answer:
      "Oui, nous élaborons des contrats personnalisés selon vos besoins, la fréquence souhaitée et les contraintes de votre site."
  },
  {
    question: "Quels types de sites prenez-vous en charge ?",
    answer:
      "Bureaux, hôtels, restaurants, commerces, cabinets, copropriétés, entrepôts et autres établissements professionnels."
  },
  {
    question: "Comment assurez-vous le suivi qualité ?",
    answer:
      "Chaque prestation fait l'objet d'un contrôle qualité régulier, avec points critiques et actions correctives, afin de garantir un niveau de service constant."
  },
  {
    question: "Utilisez-vous des produits et protocoles professionnels ?",
    answer:
      "Oui, nous utilisons des produits et protocoles adaptés aux surfaces et aux exigences d'hygiène de chaque environnement."
  },
  {
    question: "Travaillez-vous avec de la sous-traitance ?",
    answer:
      "Nous privilégions des équipes pilotées directement pour garder un niveau de qualité stable et un suivi transparent."
  },
  {
    question: "Pouvez-vous prendre en charge plusieurs sites ?",
    answer:
      "Oui, notre organisation permet un pilotage multi-sites avec un reporting centralisé."
  },
  {
    question: "Proposez-vous des interventions ponctuelles ?",
    answer:
      "Oui, nous réalisons des interventions ponctuelles : remise en état, fin de chantier, reprise de site."
  },
  {
    question: "Comment obtenir un devis ?",
    answer:
      "Décrivez votre besoin via le formulaire de devis ou échangez directement avec un conseiller. Nous revenons vers vous avec une estimation claire et adaptée à votre activité."
  }
];

export const services: Service[] = [
  {
    slug: "nettoyage-automobile",
    title: "Gestion des flottes automobiles",
    shortDescription:
      "Une prise en charge organisée de vos véhicules afin de préserver leur valeur et l'image de votre flotte.",
    detailedDescription:
      "Detailing intérieur et extérieur piloté selon un protocole constant, pour les flottes d'entreprise comme pour les véhicules personnels de dirigeants et particuliers exigeants. Fréquence et périmètre ajustés à votre parc.",
    sectors: ["Flottes d'entreprise", "Concessions", "Particuliers"],
    benefits: [
      "Protocole constant sur l'ensemble du parc",
      "Planification adaptée à la disponibilité des véhicules",
      "Interlocuteur dédié pour le suivi de flotte"
    ]
  },
  {
    slug: "nettoyage-bureaux",
    title: "Entretien des espaces de travail",
    shortDescription:
      "Des prestations planifiées permettant de garantir un environnement de travail conforme aux standards de votre entreprise.",
    detailedDescription:
      "Nous assurons l'entretien de vos bureaux avec des protocoles adaptés à la fréquentation, afin de limiter les perturbations et maintenir des espaces conformes au quotidien.",
    sectors: ["PME", "Startups", "Cabinets", "Coworking"],
    benefits: [
      "Planification selon vos contraintes d'exploitation",
      "Contrôle qualité des prestations",
      "Interlocuteur dédié"
    ]
  },
  {
    slug: "nettoyage-commerces",
    title: "Entretien des espaces commerciaux",
    shortDescription:
      "Des interventions adaptées à votre activité afin de préserver l'image de votre enseigne et l'expérience de vos clients.",
    detailedDescription:
      "Nous assurons l'entretien régulier de vos zones de vente, vitrines et espaces d'accueil afin de soutenir votre image commerciale.",
    sectors: ["Boutiques", "Agences", "Showrooms"],
    benefits: [
      "Planification selon vos contraintes d'exploitation",
      "Contrôle qualité des prestations",
      "Interlocuteur dédié"
    ]
  },
  {
    slug: "nettoyage-restaurants",
    title: "Propreté des établissements de restauration",
    shortDescription:
      "Un environnement conforme aux standards d'hygiène pour protéger votre réputation et votre conformité réglementaire.",
    detailedDescription:
      "Nous intervenons sur les salles, sanitaires et zones techniques selon vos contraintes de service et vos obligations d'hygiène.",
    sectors: ["Restaurants", "Brasseries", "Traiteurs"],
    benefits: [
      "Conformité facilitée",
      "Interventions planifiées autour du service",
      "Réduction des risques de non-conformité"
    ]
  },
  {
    slug: "nettoyage-hotels",
    title: "Entretien hôtelier",
    shortDescription:
      "Des espaces communs pilotés avec exigence pour une expérience client conforme à votre standing.",
    detailedDescription:
      "Nous prenons en charge halls, circulations, zones de détente et espaces techniques avec un contrôle qualité renforcé.",
    sectors: ["Hôtels", "Résidences", "Apparthôtels"],
    benefits: [
      "Image constante",
      "Réactivité opérationnelle",
      "Suivi qualité structuré"
    ]
  },
  {
    slug: "nettoyage-vitrerie",
    title: "Entretien des surfaces vitrées",
    shortDescription:
      "Des vitrages entretenus pour valoriser votre façade et la luminosité intérieure.",
    detailedDescription:
      "Entretien de vitres intérieures et extérieures avec méthodes sécurisées et fréquence ajustée selon l'exposition.",
    sectors: ["Bureaux", "Commerces", "Hôtels"],
    benefits: [
      "Valorisation durable de votre patrimoine immobilier",
      "Planification sans interruption d'activité",
      "Méthodes adaptées aux hauteurs et accès"
    ]
  },
  {
    slug: "desinfection",
    title: "Désinfection et traitement sanitaire",
    shortDescription:
      "Des protocoles ciblés pour limiter les risques sanitaires sur les points de contact et sécuriser votre conformité.",
    detailedDescription:
      "Nous déployons des protocoles de désinfection adaptés aux environnements professionnels sensibles et aux zones de forte fréquentation.",
    sectors: ["Cabinets médicaux", "Bureaux", "Commerces", "Espaces publics"],
    benefits: [
      "Réduction du risque de contamination",
      "Protocoles adaptés à chaque environnement",
      "Interventions planifiées sans gêner l'activité"
    ]
  },
  {
    slug: "parties-communes",
    title: "Entretien des parties communes",
    shortDescription:
      "Une gestion des prestations régulière des halls, escaliers et zones de passage pour une image soignée.",
    detailedDescription:
      "Nous prenons en charge les parties communes des immeubles et ensembles tertiaires avec une fréquence ajustée à l'usage réel.",
    sectors: ["Copropriétés", "Immeubles de bureaux", "Résidences gérées"],
    benefits: [
      "Première impression maîtrisée pour vos visiteurs",
      "Planification claire des fréquences de passage",
      "Suivi qualité pour un niveau constant"
    ]
  },
  {
    slug: "entretien-regulier",
    title: "Contrats d'entretien récurrents",
    shortDescription:
      "Un cahier des charges clair et une fréquence d'intervention stable, sans surcharge de pilotage interne.",
    detailedDescription:
      "Nous structurons vos interventions selon un cahier des charges précis et une fréquence d'intervention ajustée, avec reporting régulier et flexibilité en cas d'évolution de vos besoins.",
    sectors: ["PME", "Coworking", "Réseaux de commerces", "Cabinets"],
    benefits: [
      "Prévisibilité budgétaire et opérationnelle",
      "Qualité de service homogène dans la durée",
      "Organisation optimisée des interventions"
    ]
  },
  {
    slug: "apres-chantier",
    title: "Remise en propreté après travaux",
    shortDescription:
      "Une organisation cadrée après travaux pour une reprise d'activité sans délai.",
    detailedDescription:
      "Évacuation des résidus, dépoussiérage technique et finition des surfaces avant ouverture ou livraison.",
    sectors: ["Bureaux", "Commerces", "Résidentiel collectif"],
    benefits: [
      "Mise en service accélérée",
      "Site conforme avant réception",
      "Coordination simple avec vos équipes"
    ]
  },
  {
    slug: "remise-en-etat",
    title: "Remise en état",
    shortDescription:
      "Intervention approfondie pour reprendre un site et repartir sur des standards conformes.",
    detailedDescription:
      "Nous traitons les zones dégradées ou insuffisamment entretenues pour retrouver un niveau conforme à vos standards.",
    sectors: ["Multi-secteurs"],
    benefits: [
      "Rattrapage accéléré de la qualité de service",
      "Plan d'action clair par zone",
      "Organisation optimisée avant entretien régulier"
    ]
  }
];

export const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Galerie", href: "/galerie" },
  { label: "Équipe", href: "/equipe" },
  { label: "Vidéos", href: "/videos" },
  { label: "À propos", href: "/a-propos" },
  { label: "Nos services", href: "/services" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Devis", href: "/devis" },
  { label: "Contact", href: "/contact" }
];

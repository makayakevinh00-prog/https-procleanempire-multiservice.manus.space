export type Service = {
  slug: string;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  sectors: string[];
  benefits: string[];
};

export const trustProofs = [
  { label: "Sites entretenus", value: "70+" },
  { label: "Interventions réalisées / mois", value: "450+" },
  { label: "Note Google", value: "4,9/5" },
  { label: "Avis vérifiés", value: "55+" },
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
    title: "Entretien automobile professionnel",
    shortDescription:
      "Prestations de detailing automobile, interieur et exterieur, pour particuliers et flottes d'entreprise.",
    detailedDescription:
      "Une prestation d'entretien automobile soignee, adaptee aussi bien aux vehicules personnels qu'aux flottes d'entreprise, avec un protocole constant a chaque intervention.",
    sectors: ["Particuliers", "Flottes d'entreprise", "Concessions"],
    benefits: [
      "Entretien interieur complet : sieges, moquettes, plastiques",
      "Traitement exterieur carrosserie et jantes",
      "Formules adaptees aux flottes professionnelles"
    ]
  },
  {
    slug: "nettoyage-bureaux",
    title: "Entretien des espaces de travail",
    shortDescription:
      "Des environnements de travail conformes aux standards de votre entreprise, jour après jour.",
    detailedDescription:
      "Nous assurons l'entretien de vos bureaux avec des protocoles adaptes a la frequentation, afin de limiter les perturbations et maintenir des espaces conformes au quotidien.",
    sectors: ["PME", "Startups", "Cabinets", "Coworking"],
    benefits: [
      "Contrôle qualité",
      "Planification des interventions",
      "Personnel qualifié"
    ]
  },
  {
    slug: "nettoyage-commerces",
    title: "Entretien des espaces commerciaux",
    shortDescription:
      "Des points de vente valorisés pour renforcer l'experience client des l'entree.",
    detailedDescription:
      "Nous assurons l'entretien regulier de vos zones de vente, vitrines et espaces d'accueil afin de soutenir votre image commerciale.",
    sectors: ["Boutiques", "Agences", "Showrooms"],
    benefits: [
      "Contrôle qualité",
      "Planification des interventions",
      "Personnel qualifié"
    ]
  },
  {
    slug: "nettoyage-restaurants",
    title: "Entretien des établissements de restauration",
    shortDescription:
      "Un environnement conforme aux standards d'hygiene pour proteger votre reputation.",
    detailedDescription:
      "Nous intervenons sur les salles, sanitaires et zones techniques selon vos contraintes de service et vos obligations d'hygiene.",
    sectors: ["Restaurants", "Brasseries", "Traiteurs"],
    benefits: [
      "Conformité facilitée",
      "Interventions planifiées autour du service",
      "Réduction des risques de non-conformité"
    ]
  },
  {
    slug: "nettoyage-hotels",
    title: "Entretien des espaces hôteliers",
    shortDescription:
      "Des espaces communs soignes pour une experience client conforme a votre standing.",
    detailedDescription:
      "Nous prenons en charge halls, circulations, zones de detente et espaces techniques avec un controle qualite renforce.",
    sectors: ["Hôtels", "Résidences", "Apparthôtels"],
    benefits: [
      "Image constante",
      "Réactivité opérationnelle",
      "Suivi qualité structuré"
    ]
  },
  {
    slug: "nettoyage-vitrerie",
    title: "Entretien de la vitrerie professionnelle",
    shortDescription:
      "Des vitrages entretenus pour valoriser votre facade et la luminosite interieure.",
    detailedDescription:
      "Entretien de vitres interieures et exterieures avec methodes securisees et frequence ajustee selon l'exposition.",
    sectors: ["Bureaux", "Commerces", "Hôtels"],
    benefits: [
      "Façade valorisée",
      "Planification sans interruption d'activité",
      "Méthodes adaptées aux hauteurs et accès"
    ]
  },
  {
    slug: "desinfection",
    title: "Protocoles de désinfection",
    shortDescription:
      "Protocoles de desinfection cibles pour limiter les risques sanitaires sur les points de contact.",
    detailedDescription:
      "Nous deployons des protocoles de desinfection adaptes aux environnements professionnels sensibles et aux zones de forte frequentation.",
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
      "Entretien regulier des halls, escaliers et zones de passage pour une image soignee.",
    detailedDescription:
      "Nous prenons en charge les parties communes des immeubles et ensembles tertiaires avec une frequence ajustee a l'usage reel.",
    sectors: ["Copropriétés", "Immeubles de bureaux", "Résidences gérées"],
    benefits: [
      "Première impression maîtrisée pour vos visiteurs",
      "Planification claire des fréquences de passage",
      "Suivi qualité pour un niveau constant"
    ]
  },
  {
    slug: "entretien-regulier",
    title: "Plan d'entretien régulier",
    shortDescription:
      "Un plan d'entretien continu pour vos locaux, sans surcharge de pilotage interne.",
    detailedDescription:
      "Nous structurons vos interventions hebdomadaires ou quotidiennes autour d'une planification stable, controlee et evolutive.",
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
      "Une remise en propreté organisee apres travaux pour une reprise d'activite sans delai.",
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
      "Intervention approfondie pour reprendre un site et repartir sur de bonnes bases.",
    detailedDescription:
      "Nous traitons les zones degradees ou insuffisamment entretenues pour retrouver un niveau conforme a vos standards.",
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
  { label: "Realisations", href: "/realisations" },
  { label: "Galerie", href: "/galerie" },
  { label: "Equipe", href: "/equipe" },
  { label: "Videos", href: "/videos" },
  { label: "À propos", href: "/a-propos" },
  { label: "Nos services", href: "/services" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Devis", href: "/devis" },
  { label: "Contact", href: "/contact" }
];

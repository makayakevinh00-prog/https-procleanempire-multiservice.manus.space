export type Service = {
  slug: string;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  benefits: string[];
  sectors: string[];
};

export const services: Service[] = [
  {
    slug: "nettoyage-automobile",
    title: "Nettoyage automobile",
    shortDescription:
      "Lavage et nettoyage de véhicules, intérieur et extérieur, pour particuliers et flottes professionnelles.",
    detailedDescription:
      "Un nettoyage automobile soigné, intérieur et extérieur, adapté aussi bien aux véhicules personnels qu'aux flottes d'entreprise.",
    benefits: [
      "Nettoyage intérieur complet: sièges, moquettes, plastiques",
      "Lavage extérieur carrosserie et jantes",
      "Formules adaptées aux flottes professionnelles"
    ],
    sectors: ["Particuliers", "Flottes d'entreprise", "Concessions"]
  },
  {
    slug: "nettoyage-bureaux",
    title: "Nettoyage de bureaux",
    shortDescription:
      "Entretien régulier des espaces de travail pour un environnement propre, sain et valorisant.",
    detailedDescription:
      "Un programme d'entretien adapté à votre fréquentation, avec des équipes formées et un interlocuteur unique pour piloter la prestation dans la durée.",
    benefits: [
      "Passages planifiés en dehors ou en marge des horaires de bureau",
      "Protocoles adaptés aux sanitaires, espaces communs et postes de travail",
      "Suivi qualité régulier avec compte-rendu d'intervention"
    ],
    sectors: ["Bureaux", "Coworking", "Sièges sociaux"]
  },
  {
    slug: "nettoyage-restaurants",
    title: "Nettoyage restaurants",
    shortDescription:
      "Prestation de nettoyage pour restaurants avec protocoles adaptés aux exigences d'hygiène et de service.",
    detailedDescription:
      "Nous intervenons en tenant compte des contraintes de service, des normes HACCP et de la nécessité de repartir sur une salle et une cuisine impeccables chaque jour.",
    benefits: [
      "Interventions organisées avant ou après le service",
      "Attention particulière aux zones cuisine, sols et sanitaires",
      "Produits adaptés aux surfaces alimentaires"
    ],
    sectors: ["Restaurants", "Brasseries", "Traiteurs"]
  },
  {
    slug: "nettoyage-hotels",
    title: "Nettoyage hôtels",
    shortDescription:
      "Nettoyage d'hôtels et d'espaces d'accueil avec exigence qualité pour protéger votre image client.",
    detailedDescription:
      "De l'accueil aux parties communes, un niveau de finition constant pour préserver l'expérience client et l'image de l'établissement.",
    benefits: [
      "Coordination avec les équipes de réception",
      "Attention portée aux espaces d'accueil et de circulation",
      "Disponibilité adaptée aux flux touristiques"
    ],
    sectors: ["Hôtels", "Résidences", "Espaces d'accueil"]
  },
  {
    slug: "nettoyage-commerces",
    title: "Nettoyage commerces",
    shortDescription:
      "Nettoyage professionnel pour commerces et points de vente afin de renforcer l'expérience client.",
    detailedDescription:
      "Des locaux impeccables du matin à la fermeture pour soutenir votre image de marque face à la clientèle.",
    benefits: [
      "Interventions compatibles avec les horaires d'ouverture",
      "Entretien des vitrines, sols et espaces d'essayage",
      "Réactivité en cas de besoin ponctuel"
    ],
    sectors: ["Commerces", "Boutiques", "Centres commerciaux"]
  },
  {
    slug: "nettoyage-vitrerie",
    title: "Nettoyage vitrerie",
    shortDescription:
      "Nettoyage de vitrerie intérieure et extérieure pour bureaux, commerces et établissements professionnels.",
    detailedDescription:
      "Des vitrages nets pour valoriser vos espaces, avec du matériel adapté aux hauteurs et façades vitrées.",
    benefits: [
      "Vitrerie intérieure et extérieure",
      "Matériel adapté aux façades en hauteur",
      "Planification périodique ou ponctuelle"
    ],
    sectors: ["Bureaux", "Commerces", "Immeubles"]
  },
  {
    slug: "apres-chantier",
    title: "Après chantier",
    shortDescription:
      "Intervention après chantier pour remettre les locaux en état rapidement avant reprise d'activité.",
    detailedDescription:
      "Un nettoyage approfondi qui élimine poussières de travaux, résidus et traces pour permettre une reprise d'activité rapide.",
    benefits: [
      "Traitement des poussières fines de chantier",
      "Nettoyage des sols, vitres et surfaces techniques",
      "Intervention planifiée pour respecter votre date de réouverture"
    ],
    sectors: ["Bureaux", "Commerces", "Locaux neufs ou rénovés"]
  },
  {
    slug: "remise-en-etat",
    title: "Remise en état",
    shortDescription:
      "Remise en état de locaux professionnels pour repartir sur une base propre et conforme à vos standards.",
    detailedDescription:
      "Pour un changement de locataire, une reprise de bail ou un local négligé, un nettoyage complet avant remise en exploitation.",
    benefits: [
      "État des lieux du niveau de propreté avant intervention",
      "Traitement en profondeur des sols et surfaces",
      "Local livré prêt à l'usage"
    ],
    sectors: ["Bureaux", "Commerces", "Locaux professionnels"]
  }
];

export const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "À propos", href: "/a-propos" },
  { label: "Services", href: "/services" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Galerie", href: "/galerie" },
  { label: "Équipe", href: "/equipe" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" }
];

export const faqs = [
  {
    question: "Comment obtenir un devis pour le nettoyage de mes locaux ?",
    answer:
      "Remplissez le formulaire de demande de devis en indiquant le type de locaux, la surface et la fréquence souhaitée. Nous revenons vers vous rapidement avec une estimation adaptée."
  },
  {
    question: "Sous quel délai pouvez-vous démarrer une intervention ?",
    answer:
      "Selon votre secteur et vos horaires, une première intervention peut généralement être organisée sous quelques jours, y compris en horaires décalés ou le week-end si besoin."
  },
  {
    question: "Comment garantissez-vous la qualité du nettoyage dans la durée ?",
    answer:
      "Nos équipes suivent des protocoles définis par type de local, avec des produits adaptés aux surfaces et un suivi qualité régulier pour ajuster la prestation si nécessaire."
  },
  {
    question: "Le contrat est-il flexible ou uniquement engageant sur la durée ?",
    answer:
      "Nous proposons des contrats ajustables à votre activité réelle ainsi que des interventions ponctuelles, sans engagement de longue durée si vous préférez tester le service."
  },
  {
    question: "Intervenez-vous dans toute l'Île-de-France ?",
    answer:
      "Nous intervenons à Pontoise, dans le Val d'Oise et plus largement en Île-de-France. Précisez votre zone dans le formulaire de devis pour confirmer la couverture."
  },
  {
    question: "Proposez-vous un nettoyage de vitrerie ou une remise en état après chantier ?",
    answer:
      "Oui, en complément de l'entretien courant, nous proposons du nettoyage de vitrerie et une remise en état après chantier."
  }
];

// Kept identical to lib/content/phase2.ts's interactiveProcessSteps so that
// /services, /equipe and /realisations describe the same process consistently.
export const methodSteps = [
  {
    step: "01",
    title: "Prise de contact",
    description:
      "Vous décrivez vos locaux et vos contraintes via le formulaire de devis ou par téléphone."
  },
  {
    step: "02",
    title: "Visite et cadrage",
    description:
      "Un échange, éventuellement sur site, permet de définir précisément le périmètre et la fréquence d'intervention."
  },
  {
    step: "03",
    title: "Déploiement des équipes",
    description:
      "Une équipe formée à vos consignes démarre la prestation selon le planning convenu."
  },
  {
    step: "04",
    title: "Suivi et ajustements",
    description:
      "Des points de contrôle réguliers permettent d'ajuster la prestation si vos besoins évoluent."
  }
];

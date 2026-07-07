export const caseStudiesPageContent = {
  eyebrow: "Preuves terrain",
  title: "Études de cas",
  description:
    "Des interventions structurées avec problématique, solution et résultat, pour évaluer concrètement notre façon de travailler.",
  placeholder:
    "Les premières études de cas détaillées (avant/après, contexte, résultats) seront publiées ici après nos prochaines interventions."
};

export type CaseStudy = {
  id: string;
  title: string;
  sector: string;
  location: string;
  interventionTime: string;
  problem: string;
  solution: string;
  result: string;
  beforeImages: string[];
  afterImages: string[];
  testimonial?: {
    quote: string;
    name: string;
    role: string;
    company: string;
  };
  videoUrl?: string;
};

export const caseStudies: CaseStudy[] = [];

export const galleryCategories = [
  "Bureaux",
  "Restaurants",
  "Hôtels",
  "Commerces",
  "Vitrerie",
  "Avant / Après",
  "Équipe"
] as const;

export type GalleryCategory = (typeof galleryCategories)[number];

export type GalleryItem = {
  id: string;
  category: GalleryCategory;
  image: string;
  alt: string;
  title: string;
};

export const galleryItems: GalleryItem[] = [];

export const galleryPageContent = {
  eyebrow: "Preuves visuelles",
  title: "Galerie",
  description:
    "Parcourez nos photos par type d'intervention pour évaluer rapidement le niveau de finition attendu.",
  placeholder:
    "Les photos de cette catégorie seront ajoutées prochainement. Contactez-nous pour des exemples récents."
};

export const interactiveProcessSteps = [
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

export const teamPageContent = {
  eyebrow: "Le visage humain de ProClean Empire",
  title: "Notre équipe",
  description:
    "Un fondateur impliqué, des équipes terrain formées et une organisation pensée pour la fiabilité au quotidien.",
  founderBlock: {
    title: "Le fondateur",
    text:
      "ProClean Empire a été créé pour offrir aux entreprises un service de propreté plus simple à piloter : un interlocuteur unique, des décisions rapides et une qualité suivie dans la durée."
  },
  teamsBlock: {
    title: "Les équipes terrain",
    text:
      "Des agents formés aux protocoles propres à chaque secteur (bureaux, restauration, hôtellerie, commerces) interviennent avec rigueur et discrétion."
  },
  valuesBlock: {
    title: "Nos valeurs",
    bullets: [
      "Fiabilité et ponctualité sur chaque intervention",
      "Transparence dans la relation contractuelle",
      "Amélioration continue de la qualité de service"
    ]
  },
  toolsBlock: {
    title: "Matériel et process",
    text:
      "Des produits et équipements adaptés à chaque type de surface, sélectionnés dans le respect des normes d'hygiène en vigueur."
  }
};

export type CaseStudy = {
  id: string;
  title: string;
  sector: "Bureaux" | "Restaurants" | "Hotels" | "Vitrerie" | "Apres chantier" | "Avant/Apres";
  location: string;
  interventionTime: string;
  problem: string;
  solution: string;
  result: string;
  beforeImages: string[];
  afterImages: string[];
  videoUrl?: string;
  testimonial?: {
    name: string;
    role: string;
    company: string;
    quote: string;
  };
};

export type GalleryCategory =
  | "Bureaux"
  | "Restaurants"
  | "Hotels"
  | "Vitrerie"
  | "Apres chantier"
  | "Avant/Apres"
  | "Equipe";

export type GalleryItem = {
  id: string;
  category: GalleryCategory;
  title: string;
  image: string;
  alt: string;
};

export const caseStudiesPageContent = {
  eyebrow: "Preuves terrain",
  title: "Realisations ProClean Empire",
  description:
    "Des cas concrets qui montrent comment nous traitons une problematique, executons la solution et securisons un resultat durable.",
  placeholder:
    "[A REMPLIR PAR VOUS] Pour chaque etude de cas: avant/apres, problematique, solution, resultat, duree, photos, video et temoignage."
};

export const caseStudies: CaseStudy[] = [];

export const galleryPageContent = {
  eyebrow: "Preuves visuelles",
  title: "Galerie interventions",
  description:
    "Filtrez les photos par categorie pour visualiser nos standards de qualite selon chaque type de site.",
  placeholder:
    "[A REMPLIR PAR VOUS] Ajoutez vos photos classees par categorie dans galleryItems."
};

export const galleryCategories: GalleryCategory[] = [
  "Bureaux",
  "Restaurants",
  "Hotels",
  "Vitrerie",
  "Apres chantier",
  "Avant/Apres",
  "Equipe"
];

export const galleryItems: GalleryItem[] = [];

export const teamPageContent = {
  eyebrow: "Qui sommes-nous",
  title: "Equipe ProClean Empire",
  description:
    "Une organisation orientee qualite, avec des equipes formees, des methodes claires et un pilotage rigoureux.",
  founderBlock: {
    title: "Le fondateur",
    text: "[A REMPLIR PAR VOUS] Presentation du fondateur, vision et trajectoire de l'entreprise.",
    photo: "/media/placeholders/photo-fondateur.jpg"
  },
  teamsBlock: {
    title: "Les equipes terrain",
    text: "[A REMPLIR PAR VOUS] Composition des equipes, niveaux de formation et specialites.",
    photo: "/media/placeholders/photo-equipes.jpg"
  },
  valuesBlock: {
    title: "Valeurs et exigence de service",
    bullets: [
      "[A REMPLIR PAR VOUS] Valeur 1",
      "[A REMPLIR PAR VOUS] Valeur 2",
      "[A REMPLIR PAR VOUS] Valeur 3"
    ]
  },
  toolsBlock: {
    title: "Materiel et protocoles qualite",
    text: "[A REMPLIR PAR VOUS] Materiel, produits, routines de controle et standards d'intervention.",
    photo: "/media/placeholders/photo-materiel.jpg"
  }
};

export const interactiveProcessSteps = [
  {
    step: "01",
    title: "Prise de contact",
    description: "Recueil des besoins, contraintes horaires et niveau d'exigence attendu."
  },
  {
    step: "02",
    title: "Visite",
    description: "Analyse sur site des surfaces, flux, zones sensibles et priorites."
  },
  {
    step: "03",
    title: "Devis",
    description: "Proposition detaillee avec frequence, perimetre et plan d'execution."
  },
  {
    step: "04",
    title: "Intervention",
    description: "Mise en place operationnelle avec procedures et equipe adaptees."
  },
  {
    step: "05",
    title: "Controle qualite",
    description: "Verification reguliere de la conformite et ajustements immediats."
  },
  {
    step: "06",
    title: "Suivi",
    description: "Pilotage continu via un interlocuteur unique et des points de suivi."
  }
];

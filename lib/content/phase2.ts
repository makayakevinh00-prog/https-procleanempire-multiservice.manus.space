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
  | "Automobile"
  | "Aeronautique"
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
  "Automobile",
  "Aeronautique",
  "Avant/Apres",
  "Bureaux",
  "Restaurants",
  "Hotels",
  "Vitrerie",
  "Apres chantier",
  "Equipe"
];

export const galleryItems: GalleryItem[] = [
  {
    id: "avion-cessna",
    category: "Aeronautique",
    title: "Nettoyage exterieur d'un Cessna",
    image: "/media/photos/nettoyage-avion-cessna.jpeg",
    alt: "Technicien ProClean Empire nettoyant l'empennage d'un avion Cessna en hangar"
  },
  {
    id: "cockpit-avion",
    category: "Aeronautique",
    title: "Detailing cockpit avion",
    image: "/media/photos/cockpit-avion-detailing.jpeg",
    alt: "Nettoyage minutieux du tableau de bord et des ecrans d'un cockpit d'avion"
  },
  {
    id: "sieges-cuir-avion",
    category: "Aeronautique",
    title: "Renovation cuir cabine avion",
    image: "/media/photos/sieges-cuir-avion.jpeg",
    alt: "Sieges en cuir beige d'une cabine d'avion en cours de traitement"
  },
  {
    id: "interieur-auto",
    category: "Automobile",
    title: "Detailing interieur complet",
    image: "/media/photos/interieur-auto-apres.jpeg",
    alt: "Interieur de vehicule impeccable apres detailing complet par ProClean Empire"
  },
  {
    id: "interieur-mercedes",
    category: "Automobile",
    title: "Nettoyage interieur Mercedes",
    image: "/media/photos/interieur-mercedes.jpeg",
    alt: "Habitacle Mercedes nettoye avec protection volant"
  },
  {
    id: "banquette-arriere",
    category: "Automobile",
    title: "Banquette arriere remise a neuf",
    image: "/media/photos/banquette-arriere-apres.jpeg",
    alt: "Banquette arriere de vehicule parfaitement propre apres intervention"
  },
  {
    id: "traitement-tapis",
    category: "Automobile",
    title: "Traitement des tapis en profondeur",
    image: "/media/photos/traitement-tapis.jpeg",
    alt: "Application de produit professionnel sur tapis de vehicule avant brossage"
  },
  {
    id: "siege-avant-traitement",
    category: "Avant/Apres",
    title: "Siege textile — avant traitement",
    image: "/media/photos/siege-auto-avant.jpeg",
    alt: "Banquette de vehicule fortement encrassee avant intervention ProClean Empire"
  },
  {
    id: "cuir-rouge-avant",
    category: "Avant/Apres",
    title: "Cuir rouge — pendant le traitement",
    image: "/media/photos/cuir-rouge-avant.jpeg",
    alt: "Siege en cuir rouge en cours de nettoyage et decontamination"
  },
  {
    id: "cuir-rouge-apres",
    category: "Avant/Apres",
    title: "Cuir rouge — resultat final",
    image: "/media/photos/cuir-rouge-apres.jpeg",
    alt: "Siege en cuir rouge renove et brillant apres traitement ProClean Empire"
  },
  {
    id: "canape-velours",
    category: "Avant/Apres",
    title: "Canape velours ravive",
    image: "/media/photos/canape-velours-apres.jpeg",
    alt: "Canape en velours vert nettoye en profondeur a domicile"
  }
];

export const teamPageContent = {
  eyebrow: "Qui sommes-nous",
  title: "Equipe ProClean Empire",
  description:
    "Une organisation orientee qualite, avec des equipes formees, des methodes claires et un pilotage rigoureux.",
  founderBlock: {
    title: "Le fondateur",
    text: "Derriere ProClean Empire, il y a une ambition : offrir un service de nettoyage professionnel ou la qualite, la rigueur et la satisfaction client sont une priorite. Fondee par Kevinh Makaya, ProClean Empire accompagne les professionnels et les particuliers avec des prestations de nettoyage et de detailing automobile haut de gamme, adaptees a chaque besoin.",
    photo: "/media/photos/fondateur-proclean-empire.jpeg"
  },
  teamsBlock: {
    title: "Les equipes terrain",
    text: "Des intervenants formes aux protocoles specifiques de chaque environnement : surfaces sensibles, cuirs, textiles, vitrages, cockpits et equipements techniques. Chaque intervention suit une methode precise, du diagnostic au controle final.",
    photo: "/media/photos/nettoyage-avion-cessna.jpeg"
  },
  valuesBlock: {
    title: "Valeurs et exigence de service",
    bullets: [
      "Qualite, rigueur et satisfaction client comme priorites",
      "Travail soigne et prestations fiables",
      "Service reactif pour valoriser vos espaces et votre image"
    ]
  },
  toolsBlock: {
    title: "Materiel et protocoles qualite",
    text: "Materiel professionnel (injection-extraction, vapeur, brosses techniques) et produits adaptes a chaque surface : textiles, cuirs, plastiques, vitrages et equipements sensibles. Chaque intervention se termine par un controle qualite systematique.",
    photo: "/media/photos/traitement-tapis.jpeg"
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

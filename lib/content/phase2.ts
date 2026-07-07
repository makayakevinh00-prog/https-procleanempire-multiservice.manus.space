export type CaseStudy = {
  id: string;
  title: string;
  sector: "Bureaux" | "Restaurants" | "Hôtels" | "Vitrerie" | "Après chantier" | "Avant/Après";
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
  | "Hôtels"
  | "Vitrerie"
  | "Après chantier"
  | "Avant/Après"
  | "Automobile"
  | "Aéronautique"
  | "Équipe";

export type GalleryItem = {
  id: string;
  category: GalleryCategory;
  title: string;
  image: string;
  alt: string;
};

export const caseStudiesPageContent = {
  eyebrow: "Preuves terrain",
  title: "Réalisations ProClean Empire",
  description:
    "Découvrez nos méthodes d'intervention et le niveau d'exigence que nous appliquons sur chacun de nos chantiers.",
  placeholder:
    "[A REMPLIR PAR VOUS] Pour chaque étude de cas : avant/après, problématique, solution, résultat, durée, photos, vidéo et témoignage."
};

export const caseStudies: CaseStudy[] = [];

export const galleryPageContent = {
  eyebrow: "Preuves visuelles",
  title: "Galerie interventions",
  description:
    "Filtrez les photos par catégorie pour visualiser nos standards de qualité selon chaque type de site.",
  placeholder:
    "[A REMPLIR PAR VOUS] Ajoutez vos photos classées par catégorie dans galleryItems."
};

export const galleryCategories: GalleryCategory[] = [
  "Automobile",
  "Aéronautique",
  "Avant/Après",
  "Bureaux",
  "Restaurants",
  "Hôtels",
  "Vitrerie",
  "Après chantier",
  "Équipe"
];

export const galleryItems: GalleryItem[] = [
  {
    id: "avion-cessna",
    category: "Aéronautique",
    title: "Entretien extérieur d'un Cessna",
    image: "/media/photos/nettoyage-avion-cessna.jpeg",
    alt: "Technicien ProClean Empire intervenant sur l'empennage d'un avion Cessna en hangar"
  },
  {
    id: "cockpit-avion",
    category: "Aéronautique",
    title: "Detailing cockpit avion",
    image: "/media/photos/cockpit-avion-detailing.jpeg",
    alt: "Entretien minutieux du tableau de bord et des écrans d'un cockpit d'avion"
  },
  {
    id: "sieges-cuir-avion",
    category: "Aéronautique",
    title: "Rénovation cuir cabine avion",
    image: "/media/photos/sieges-cuir-avion.jpeg",
    alt: "Sièges en cuir beige d'une cabine d'avion en cours de traitement"
  },
  {
    id: "interieur-auto",
    category: "Automobile",
    title: "Detailing intérieur complet",
    image: "/media/photos/interieur-auto-apres.jpeg",
    alt: "Intérieur de véhicule après detailing complet par ProClean Empire"
  },
  {
    id: "interieur-mercedes",
    category: "Automobile",
    title: "Entretien intérieur Mercedes",
    image: "/media/photos/interieur-mercedes.jpeg",
    alt: "Habitacle Mercedes entretenu avec protection volant"
  },
  {
    id: "banquette-arriere",
    category: "Automobile",
    title: "Banquette arrière remise à neuf",
    image: "/media/photos/banquette-arriere-apres.jpeg",
    alt: "Banquette arrière de véhicule remise en état après intervention"
  },
  {
    id: "traitement-tapis",
    category: "Automobile",
    title: "Traitement des tapis en profondeur",
    image: "/media/photos/traitement-tapis.jpeg",
    alt: "Application de produit professionnel sur tapis de véhicule avant brossage"
  },
  {
    id: "siege-avant-traitement",
    category: "Avant/Après",
    title: "Siège textile — avant traitement",
    image: "/media/photos/siege-auto-avant.jpeg",
    alt: "Banquette de véhicule fortement encrassée avant intervention ProClean Empire"
  },
  {
    id: "cuir-rouge-avant",
    category: "Avant/Après",
    title: "Cuir rouge — pendant le traitement",
    image: "/media/photos/cuir-rouge-avant.jpeg",
    alt: "Siège en cuir rouge en cours de traitement et décontamination"
  },
  {
    id: "cuir-rouge-apres",
    category: "Avant/Après",
    title: "Cuir rouge — résultat final",
    image: "/media/photos/cuir-rouge-apres.jpeg",
    alt: "Siège en cuir rouge rénové et brillant après traitement ProClean Empire"
  },
  {
    id: "canape-velours",
    category: "Avant/Après",
    title: "Canapé velours ravivé",
    image: "/media/photos/canape-velours-apres.jpeg",
    alt: "Canapé en velours vert restauré en profondeur à domicile"
  }
];

export const teamPageContent = {
  eyebrow: "Qui sommes-nous",
  title: "Équipe ProClean Empire",
  description:
    "Une organisation orientée qualité, avec des équipes formées, des méthodes claires et un pilotage rigoureux.",
  founderBlock: {
    title: "Le fondateur",
    text: "Derrière ProClean Empire, il y a une ambition : offrir un service d'entretien professionnel où la qualité, la rigueur et l'exigence de service sont une priorité. Fondée par Kevinh Makaya, ProClean Empire accompagne les professionnels et les particuliers avec des prestations d'entretien et de detailing automobile haut de gamme, adaptées à chaque besoin.",
    photo: "/media/photos/fondateur-proclean-empire.jpeg"
  },
  teamsBlock: {
    title: "Les équipes terrain",
    text: "Des intervenants formés aux protocoles spécifiques de chaque environnement : surfaces sensibles, cuirs, textiles, vitrages, cockpits et équipements techniques. Chaque intervention suit une méthode précise, du diagnostic au contrôle final.",
    youtubeUrl: "https://youtube.com/shorts/a9sfrpw13cE"
  },
  valuesBlock: {
    title: "Valeurs et exigence de service",
    bullets: [
      "Qualité, rigueur et exigence de service comme priorités",
      "Travail soigné et prestations fiables",
      "Réactivité opérationnelle pour valoriser vos espaces et votre image"
    ]
  },
  toolsBlock: {
    title: "Matériel et protocoles qualité",
    text: "Matériel professionnel (injection-extraction, vapeur, brosses techniques) et produits adaptés à chaque surface : textiles, cuirs, plastiques, vitrages et équipements sensibles. Chaque intervention se termine par un contrôle qualité systématique.",
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
    description: "Analyse sur site des surfaces, flux, zones sensibles et priorités."
  },
  {
    step: "03",
    title: "Devis",
    description: "Proposition détaillée avec fréquence, périmètre et plan d'exécution."
  },
  {
    step: "04",
    title: "Intervention",
    description: "Mise en place opérationnelle avec procédures et équipe adaptées."
  },
  {
    step: "05",
    title: "Contrôle qualité",
    description: "Vérification régulière de la conformité et ajustements immédiats."
  },
  {
    step: "06",
    title: "Suivi",
    description: "Pilotage continu via un interlocuteur unique et des points de suivi."
  }
];

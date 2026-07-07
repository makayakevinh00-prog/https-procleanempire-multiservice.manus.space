export type VideoEntry = {
  id: string;
  title: string;
  youtubeUrl?: string;
  videoSrc?: string;
  poster?: string;
  description: string;
  category:
    | "Présentation"
    | "Demonstrations"
    | "Conseils"
    | "Études de cas"
    | "Coulisses"
    | "Interventions";
};

export type BlogCategory =
  | "Entretien bureaux"
  | "Restaurants"
  | "Hôtels"
  | "Conseils"
  | "Hygiène"
  | "Entreprise"
  | "Google Business"
  | "SEO local";

export const videosPageContent = {
  title: "Vidéos ProClean Empire",
  description:
    "Une bibliothèque vidéo structurée pour montrer nos méthodes, nos standards et nos interventions terrain.",
  youtubeChannelUrl: "https://www.youtube.com/@ProCleanEmpire",
  placeholder:
    "[A REMPLIR PAR VOUS] Ajoutez la liste des vidéos réelles (titre, lien YouTube, description, catégorie)."
};

export const videosList: VideoEntry[] = [
  {
    id: "intervention-terrain-1",
    title: "Intervention terrain - Extrait 1",
    youtubeUrl: "https://www.youtube.com/shorts/ek2_qMkBMYA",
    description: "Extrait d'une intervention ProClean Empire, filmée sur site.",
    category: "Interventions"
  },
  {
    id: "intervention-terrain-2",
    title: "Intervention terrain - Extrait 2",
    youtubeUrl: "https://www.youtube.com/shorts/UlTWulbv2Hs",
    description: "Extrait d'une intervention ProClean Empire, filmée sur site.",
    category: "Interventions"
  },
  {
    id: "intervention-terrain-3",
    title: "Intervention terrain - Extrait 3",
    youtubeUrl: "https://www.youtube.com/shorts/RvO-vX_zr3k",
    description: "Extrait d'une intervention ProClean Empire, filmée sur site.",
    category: "Interventions"
  },
  {
    id: "intervention-terrain-4",
    title: "Intervention terrain - Extrait 4",
    youtubeUrl: "https://youtube.com/shorts/zB8DzPshsR0",
    description: "Extrait d'une intervention ProClean Empire, filmée sur site.",
    category: "Interventions"
  },
  {
    id: "presentation-proclean-empire",
    title: "Présentation ProClean Empire",
    videoSrc: "/media/videos/proclean-presentation.mp4",
    poster: "/media/photos/nettoyage-avion-cessna.jpeg",
    description:
      "Présentation de notre approche, de nos standards qualité et de nos interventions sur le terrain.",
    category: "Présentation"
  },
  {
    id: "demonstration-nettoyage-1",
    title: "Démonstration d'entretien - Intérieur automobile",
    videoSrc: "/media/videos/proclean-demonstration-1.mp4",
    poster: "/media/photos/interieur-auto-apres.jpeg",
    description: "Intervention détaillage et remise en état d'un intérieur automobile.",
    category: "Demonstrations"
  },
  {
    id: "demonstration-nettoyage-2",
    title: "Démonstration d'entretien - Sièges et garnitures",
    videoSrc: "/media/videos/proclean-demonstration-2.mp4",
    poster: "/media/photos/banquette-arriere-apres.jpeg",
    description: "Traitement et remise en état des sièges et garnitures textiles/cuir.",
    category: "Demonstrations"
  }
];

export const realisationsVideos: VideoEntry[] = [
  {
    id: "realisation-extrait-video-1",
    title: "Entretien d'un logement Airbnb",
    youtubeUrl: "https://www.youtube.com/shorts/pNpWpXeaPZo",
    description: "Extrait vidéo d'une intervention ProClean Empire, en complément des études de cas.",
    category: "Interventions"
  },
  {
    id: "realisation-extrait-video-2",
    title: "Extrait d'intervention filmée sur site",
    youtubeUrl: "https://youtube.com/shorts/EK7Mhawwy_0",
    description: "Extrait vidéo d'une intervention ProClean Empire, en complément des études de cas.",
    category: "Interventions"
  }
];

export const blogPageContent = {
  title: "Blog ProClean Empire",
  description:
    "Structure éditoriale prête pour publier régulièrement des contenus utiles au SEO local et à la conversion B2B.",
  categories: [
    "Entretien bureaux",
    "Restaurants",
    "Hôtels",
    "Conseils",
    "Hygiène",
    "Entreprise",
    "Google Business",
    "SEO local"
  ] as BlogCategory[],
  placeholder:
    "[A REMPLIR PAR VOUS] Ajoutez vos articles réels (titre, extrait, catégorie, slug) pour éviter toute page fine."
};

export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  date: string;
};

export const blogPosts: BlogPost[] = [
  {
    id: "offre-nouvelle-annee-2026",
    title: "Offre exclusive 2026 : bien démarrer l'année avec des espaces conformes à vos standards",
    category: "Entreprise",
    excerpt:
      "L'année 2026 pointe le bout de son nez et avec elle, l'envie de renouveau. Pour bien démarrer, ProClean Empire a préparé une offre exclusive dédiée aussi bien aux entreprises qu'aux particuliers.",
    date: "28 décembre 2025"
  },
  {
    id: "un-seul-prestataire-plusieurs-expertises",
    title: "Un interlocuteur unique pour l'ensemble de vos prestations",
    category: "Conseils",
    excerpt:
      "Bureaux, flottes automobiles, aéronefs, locations Airbnb : ProClean Empire réunit plusieurs expertises au sein d'une seule organisation. Pour nos clients, cela signifie un interlocuteur unique, un même niveau d'exigence et un pilotage simplifié de l'ensemble de leurs prestations.",
    date: "15 décembre 2025"
  },
  {
    id: "qui-est-proclean-empire",
    title: "ProClean Empire : une organisation pensée pour les entreprises exigeantes",
    category: "Entreprise",
    excerpt:
      "Fondée par Kevinh Makaya, ProClean Empire accompagne les entreprises avec des prestations d'entretien et de detailing automobile haut de gamme. Notre organisation repose sur des protocoles clairs, des équipes formées et un contrôle qualité systématique à chaque intervention.",
    date: "2 décembre 2025"
  }
];

export const socialLinks = [
  {
    label: "YouTube",
    href: "https://www.youtube.com/@ProCleanEmpire",
    description: "Présentation, démonstrations et interventions en conditions réelles."
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/procelan-empire",
    description: "Actualités entreprise, coulisses et preuve de sérieux B2B."
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/proclean_empire/",
    description: "Avant/Après, quotidien des équipes et standards qualité."
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Proclean-Empire/61575993812750/",
    description: "Vie de l'entreprise, avis clients et mises à jour locales."
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@procleanempire",
    description: "Vidéos courtes d'interventions et coulisses des équipes terrain."
  }
];

export const faqThemes = [
  "Tarifs",
  "Interventions",
  "Qualité",
  "Contrat",
  "Zone",
  "Technique"
] as const;

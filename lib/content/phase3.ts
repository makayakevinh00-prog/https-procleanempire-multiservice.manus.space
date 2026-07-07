export type VideoEntry = {
  id: string;
  title: string;
  youtubeUrl?: string;
  videoSrc?: string;
  poster?: string;
  description: string;
  category:
    | "Presentation"
    | "Demonstrations"
    | "Conseils"
    | "Etudes de cas"
    | "Coulisses"
    | "Interventions";
};

export type BlogCategory =
  | "Entretien bureaux"
  | "Restaurants"
  | "Hotels"
  | "Conseils"
  | "Hygiene"
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
    id: "presentation-proclean-empire",
    title: "Présentation ProClean Empire",
    videoSrc: "/media/videos/proclean-presentation.mp4",
    poster: "/media/photos/nettoyage-avion-cessna.jpeg",
    description:
      "Présentation de notre approche, de nos standards qualité et de nos interventions sur le terrain.",
    category: "Presentation"
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

export const blogPageContent = {
  title: "Blog ProClean Empire",
  description:
    "Structure éditoriale prête pour publier régulièrement des contenus utiles au SEO local et à la conversion B2B.",
  categories: [
    "Entretien bureaux",
    "Restaurants",
    "Hotels",
    "Conseils",
    "Hygiene",
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
  "Qualite",
  "Contrat",
  "Zone",
  "Technique"
] as const;

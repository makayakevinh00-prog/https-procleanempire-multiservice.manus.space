export type VideoEntry = {
  id: string;
  title: string;
  youtubeUrl: string;
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
  | "Nettoyage bureaux"
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
  youtubeChannelUrl: "[A REMPLIR PAR VOUS - LIEN CHAINE YOUTUBE]",
  placeholder:
    "[A REMPLIR PAR VOUS] Ajoutez la liste des vidéos réelles (titre, lien YouTube, description, catégorie)."
};

export const videosList: VideoEntry[] = [];

export const blogPageContent = {
  title: "Blog ProClean Empire",
  description:
    "Structure éditoriale prête pour publier régulièrement des contenus utiles au SEO local et à la conversion B2B.",
  categories: [
    "Nettoyage bureaux",
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

export const socialLinks = [
  {
    label: "YouTube",
    href: "[A REMPLIR PAR VOUS - YOUTUBE]",
    description: "Présentation, démonstrations et interventions en conditions réelles."
  },
  {
    label: "LinkedIn",
    href: "[A REMPLIR PAR VOUS - LINKEDIN]",
    description: "Actualités entreprise, coulisses et preuve de sérieux B2B."
  },
  {
    label: "Instagram",
    href: "[A REMPLIR PAR VOUS - INSTAGRAM]",
    description: "Avant/Après, quotidien des équipes et standards qualité."
  },
  {
    label: "Facebook",
    href: "[A REMPLIR PAR VOUS - FACEBOOK]",
    description: "Vie de l'entreprise, avis clients et mises à jour locales."
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

export type VideoEntry = {
  id: string;
  title: string;
  description: string;
  category:
    | "Presentation"
    | "Demonstrations"
    | "Conseils"
    | "Etudes de cas"
    | "Coulisses"
    | "Interventions";
  youtubeUrl: string;
};

export const videosList: VideoEntry[] = [];

export const videosPageContent = {
  title: "Vidéos",
  description:
    "Un espace dédié pour visionner nos contenus réels : présentation, démonstrations, études de cas et coulisses.",
  placeholder:
    "Les vidéos de cette catégorie seront ajoutées prochainement sur notre chaîne YouTube.",
  youtubeChannelUrl: "[A REMPLIR PAR VOUS] Lien de la chaîne YouTube ProClean Empire"
};

export const socialLinks = [
  {
    label: "Instagram",
    description: "Coulisses et interventions en images.",
    href: "#"
  },
  {
    label: "Facebook",
    description: "Actualités et avis clients.",
    href: "#"
  },
  {
    label: "LinkedIn",
    description: "Suivi professionnel et opportunités B2B.",
    href: "#"
  },
  {
    label: "Google Business",
    description: "Avis et fiche établissement.",
    href: "#"
  }
];

export const blogPageContent = {
  title: "Blog",
  description:
    "Structure blog ProClean Empire pour publier des contenus SEO local et expertise nettoyage professionnel.",
  categories: [
    "Nettoyage de bureaux",
    "Hygiène en restauration",
    "Entretien hôtelier",
    "Conseils propreté",
    "Réglementation et normes",
    "Actualités ProClean Empire"
  ],
  placeholder:
    "Les premiers articles seront publiés ici. Chaque catégorie ci-dessous accueillera des contenus SEO local dédiés."
};

export const faqThemes = ["Tarifs", "Interventions", "Qualite", "Contrat", "Zone", "Technique"] as const;

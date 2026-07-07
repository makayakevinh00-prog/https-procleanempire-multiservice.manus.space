export const conversionHeroContent = {
  eyebrow: "Nettoyage professionnel premium",
  title: "Des locaux impeccables, une équipe fiable, un interlocuteur unique",
  subtitle:
    "ProClean Empire accompagne les entreprises de Pontoise et d'Île-de-France avec un service de propreté haut de gamme, pensé pour les dirigeants, office managers et services généraux.",
  ctaPrimary: {
    label: "Demander un devis",
    href: "/devis"
  },
  ctaSecondary: {
    label: "Voir la présentation"
  },
  stats: [
    {
      label: "Délai de réponse moyen",
      value: undefined as number | undefined,
      suffix: undefined as string | undefined,
      fallback: "Sous 24h"
    },
    {
      label: "Zone d'intervention",
      value: undefined as number | undefined,
      suffix: undefined as string | undefined,
      fallback: "Pontoise & Île-de-France"
    },
    {
      label: "Contrats",
      value: undefined as number | undefined,
      suffix: undefined as string | undefined,
      fallback: "Ajustables, sans engagement long"
    }
  ]
};

export const presentationVideo = {
  title: "Découvrez ProClean Empire en vidéo",
  description:
    "Une courte présentation de notre méthode de travail, de nos équipes et de notre exigence qualité sur le terrain.",
  ctaLabel: "Voir la vidéo de présentation",
  youtubeUrl: "[A REMPLIR PAR VOUS] Lien YouTube de la vidéo de présentation",
  thumbnail: "/media/placeholders/video-thumbnail.svg"
};

export const premiumReviewsData = {
  sectionTitle: "Ce qu'en pensent nos clients",
  sectionDescription:
    "Avis écrits, témoignages vidéo et retours clients seront publiés ici au fur et à mesure des interventions réalisées.",
  textReviews: [] as Array<{
    id: string;
    rating: number;
    text: string;
    name: string;
    role: string;
    company: string;
  }>,
  videoTestimonials: [] as Array<{
    id: string;
    title: string;
    description: string;
    youtubeUrl: string;
  }>,
  googleReviewScreenshots: [] as string[],
  placeholders: {
    textReviews: "Les premiers avis clients seront publiés ici prochainement.",
    videoTestimonials: "Les témoignages vidéo seront ajoutés après les premières interventions filmées.",
    googleReviewScreenshots: "Les captures d'avis Google seront ajoutées ici."
  }
};

export const commitments = [
  {
    title: "Interlocuteur unique",
    description: "Un référent dédié pour piloter votre contrat et répondre rapidement à vos demandes."
  },
  {
    title: "Réactivité",
    description: "Une prise en charge rapide des demandes urgentes ou des ajustements de planning."
  },
  {
    title: "Équipes formées",
    description: "Des agents formés aux protocoles adaptés à chaque type de local et de secteur d'activité."
  },
  {
    title: "Produits adaptés",
    description: "Des produits sélectionnés selon les surfaces, dans le respect des normes d'hygiène en vigueur."
  },
  {
    title: "Contrôle qualité",
    description: "Un suivi régulier des prestations pour garantir un niveau de propreté constant dans le temps."
  },
  {
    title: "Disponibilité",
    description: "Des interventions organisées en dehors ou en marge de vos horaires d'activité."
  },
  {
    title: "Engagement de confiance",
    description: "Des contrats clairs, ajustables à votre activité réelle, sans mauvaise surprise."
  }
];

export const phase1Contact = {
  title: "Parlons de vos locaux",
  description:
    "Décrivez votre besoin ou appelez-nous directement : nous revenons vers vous rapidement avec une solution adaptée.",
  address: "3 rue Stéphane Charbonnier, 95300 Pontoise",
  phone: "06 17 21 22 30",
  phoneHref: "tel:+33617212230",
  email: "contact@procleanempire.com",
  zone: "Pontoise, Val d'Oise et Île-de-France",
  hours: "Ouvert 7j/7, de 8h à 18h",
  directContactCta: {
    label: "Nous contacter",
    href: "/contact"
  },
  mapsEmbedUrl:
    "https://www.google.com/maps?q=3+rue+Stéphane+Charbonnier,+95300+Pontoise,+France&output=embed"
};

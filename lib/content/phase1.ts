export type AnimatedStat = {
  label: string;
  value?: number;
  suffix?: string;
  fallback: string;
};

export type ReviewItem = {
  id: string;
  name: string;
  company: string;
  role: string;
  rating: number;
  text: string;
  photo?: string;
};

export type VideoTestimonial = {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnail?: string;
  description: string;
};

export const conversionHeroContent = {
  eyebrow: "Proprete professionnelle premium a Pontoise",
  title: "Des locaux impeccables qui valorisent votre entreprise",
  subtitle:
    "ProClean Empire vous aide a proteger votre image, gagner du temps de pilotage et maintenir un niveau d'hygiene constant sur vos sites professionnels.",
  ctaPrimary: {
    label: "Demander un devis",
    href: "/devis"
  },
  ctaSecondary: {
    label: "Voir notre presentation",
    action: "open-presentation-video"
  },
  stats: [
    {
      label: "Reponse a toute demande de devis",
      fallback: "Sous 24h"
    },
    {
      label: "Zone d'intervention",
      fallback: "Pontoise & Île-de-France"
    },
    {
      label: "Secteurs couverts",
      fallback: "Bureaux, commerces, auto, aeronautique"
    }
  ] as AnimatedStat[]
};

export const presentationVideo = {
  title: "Decouvrez ProClean Empire",
  description:
    "Presentation de notre approche, de nos standards qualite et de la maniere dont nous accompagnons les entreprises au quotidien.",
  videoSrc: "/media/videos/proclean-presentation.mp4",
  thumbnail: "/media/photos/nettoyage-avion-cessna.jpeg",
  ctaLabel: "Regarder la presentation complete"
};

export const premiumReviewsData = {
  sectionTitle: "Avis clients",
  sectionDescription:
    "Chaque avis ci-dessous est prevu pour etre renseigne avec vos preuves sociales reelles (texte, video et captures Google Reviews).",
  textReviews: [] as ReviewItem[],
  videoTestimonials: [] as VideoTestimonial[],
  googleReviewScreenshots: [] as string[],
  placeholders: {
    textReviews: "[A REMPLIR PAR VOUS] Liste des avis clients verifies",
    videoTestimonials: "[A REMPLIR PAR VOUS] Liens des temoignages video",
    googleReviewScreenshots: "[A REMPLIR PAR VOUS] Captures d'ecran Google Reviews"
  }
};

export const commitments = [
  {
    title: "Qualite",
    description: "Protocoles clairs et controle des points sensibles."
  },
  {
    title: "Respect des horaires",
    description: "Interventions calees sur vos contraintes d'exploitation."
  },
  {
    title: "Personnel forme",
    description: "Equipes preparees aux exigences des environnements pro."
  },
  {
    title: "Produits professionnels",
    description: "Produits adaptes aux surfaces et standards d'hygiene."
  },
  {
    title: "Controle qualite",
    description: "Suivi terrain regulier pour maintenir un niveau constant."
  },
  {
    title: "Reactivite",
    description: "Ajustements rapides en cas d'imprevu."
  },
  {
    title: "Suivi client",
    description: "Un interlocuteur unique pour piloter sereinement."
  }
];

export const phase1Contact = {
  title: "Contact ProClean Empire",
  description:
    "Prenez contact avec notre equipe pour organiser une visite de site ou obtenir un devis personnalise.",
  address: "3 rue Stephane Charbonnier, 95800 Pontoise",
  zone: "Pontoise et Île-de-France",
  phone: "06 17 21 22 30",
  phoneHref: "tel:+33617212230",
  email: "contact@procleanempire.com",
  hours: "7j/7 de 8h à 18h",
  mapsEmbedUrl:
    "https://www.google.com/maps?q=3+rue+Stephane+Charbonnier,+95800+Pontoise&output=embed",
  directContactCta: {
    label: "Prendre rendez-vous",
    href: "/contact"
  }
};

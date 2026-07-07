export type AnimatedStat = {
  label: string;
  value?: number;
  suffix?: string;
  fallback: string;
};

export type ReviewItem = {
  id: string;
  name: string;
  company?: string;
  role?: string;
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
  eyebrow: "Prestations de propreté et multiservices pour les entreprises exigeantes",
  title: "La propreté au service de la performance de vos espaces professionnels",
  subtitle:
    "Nous accompagnons les entreprises, commerces, syndics et établissements professionnels avec des prestations de propreté planifiées, un suivi qualité rigoureux et des interventions adaptées à vos contraintes d'exploitation.",
  ctaPrimary: {
    label: "Demander un devis",
    href: "/devis"
  },
  ctaSecondary: {
    label: "Voir notre présentation",
    action: "open-presentation-video"
  },
  stats: [
    {
      label: "Réponse à toute demande de devis",
      fallback: "Sous 24h"
    },
    {
      label: "Zone d'intervention",
      fallback: "Pontoise & Île-de-France"
    },
    {
      label: "Secteurs couverts",
      fallback: "Bureaux, commerces, auto, aéronautique"
    }
  ] as AnimatedStat[]
};

export const presentationVideo = {
  title: "Découvrez ProClean Empire",
  description:
    "Présentation de notre approche, de nos standards qualité et de la manière dont nous accompagnons les entreprises au quotidien.",
  youtubeUrl: "https://youtube.com/shorts/GZ7cPlNzFi8",
  ctaLabel: "Regarder la présentation complète"
};

export const premiumReviewsData = {
  sectionTitle: "Avis clients",
  sectionDescription:
    "Note de 5,0/5 sur Google (30 avis) - découvrez les retours de nos clients.",
  textReviews: [
    {
      id: "ilhame-kamil",
      name: "Ilhame Kamil",
      rating: 5,
      text: "Très satisfait du nettoyage de mes 2 voitures. Travail soigné, résultat impeccable et équipe professionnelle."
    },
    {
      id: "concierg-air",
      name: "Concierg'air",
      rating: 5,
      text: "Très satisfait de ProClean Empire. Service sérieux, équipe professionnelle et résultat impeccable à chaque intervention. Je recommande sans hésitation."
    },
    {
      id: "jordan-germany",
      name: "Jordan Germany",
      rating: 5,
      text: "Merci pour votre excellent travail. Tout était impeccable. Le personnel est très chaleureux, accueillant et professionnel. Je recommande vivement !"
    },
    {
      id: "haris",
      name: "Haris",
      rating: 5,
      text: "Franchement le résultat au top, rapport qualité prix imbattable, je recommande !!!!"
    },
    {
      id: "sam-mel",
      name: "Sam Mel",
      rating: 5,
      text: "Très sérieux et professionnelle ! Qualité de la prestation au top, merci d'avoir sauvé ma voiture !"
    },
    {
      id: "victor-nicot",
      name: "Victor Nicot",
      rating: 5,
      text: "Très bon service, je recommande Kevin et son équipe."
    },
    {
      id: "livio-enzo-ornetti",
      name: "Livio Enzo Ornetti",
      rating: 5,
      text: "Je recommande, c'était nickel !"
    }
  ] as ReviewItem[],
  videoTestimonials: [] as VideoTestimonial[],
  googleReviewScreenshots: [] as string[],
  placeholders: {
    textReviews: "[A REMPLIR PAR VOUS] Liste des avis clients vérifiés",
    videoTestimonials: "[A REMPLIR PAR VOUS] Liens des témoignages vidéo",
    googleReviewScreenshots: "[A REMPLIR PAR VOUS] Captures d'écran Google Reviews"
  }
};

export type Partner = {
  name: string;
  logo: string;
};

export const partners: Partner[] = [];

export const commitments = [
  {
    title: "Engagement qualité",
    description: "Protocoles clairs et contrôle des points sensibles."
  },
  {
    title: "Respect des horaires",
    description: "Interventions calées sur vos contraintes d'exploitation."
  },
  {
    title: "Agents qualifiés et formés",
    description: "Équipes préparées aux exigences des environnements professionnels."
  },
  {
    title: "Produits professionnels",
    description: "Produits et protocoles adaptés aux surfaces et standards d'hygiène."
  },
  {
    title: "Contrôle qualité",
    description: "Suivi terrain régulier pour maintenir un niveau constant."
  },
  {
    title: "Réactivité opérationnelle",
    description: "Ajustements organisés en cas d'imprévu."
  },
  {
    title: "Interlocuteur dédié",
    description: "Un interlocuteur unique pour piloter sereinement."
  }
];

export const phase1Contact = {
  title: "Contact ProClean Empire",
  description:
    "Décrivez votre besoin afin que nous puissions vous proposer une solution adaptée à votre activité.",
  address: "3 rue Stéphane Charbonnier, 95800 Pontoise",
  zone: "Pontoise et Île-de-France",
  phone: "06 17 21 22 30",
  phoneHref: "tel:+33617212230",
  email: "contact@procleanempire.com",
  hours: "7j/7 de 8h à 18h",
  mapsEmbedUrl:
    "https://www.google.com/maps?q=3+rue+Stephane+Charbonnier,+95800+Pontoise&output=embed",
  directContactCta: {
    label: "Planifier une visite technique",
    href: "/contact"
  }
};

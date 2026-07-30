/**
 * Identité de marque ProClean Empire.
 * Les couleurs reprennent `tailwind.config.ts` du site pour que les visuels
 * générés soient cohérents avec le reste de la communication.
 */
export const brand = {
  name: "ProClean Empire",
  website: "www.procleanempire.com",
  phone: "06 17 21 22 30",
  email: "contact@procleanempire.com",
  city: "Pontoise",
  zone: "Pontoise & Île-de-France",
  hours: "7j/7 de 8h à 18h",
  quoteDelay: "24h",
  googleRating: "5,0/5 sur 30 avis",

  colors: {
    navy: "#14213d",
    navyDeep: "#0b1326",
    gold: "#c9a227",
    goldLight: "#f3dd8f",
    white: "#f7f5ef",
  },

  /** Ce que l'entreprise fait réellement — sert de garde-fou à la rédaction. */
  services: [
    "nettoyage de bureaux et locaux professionnels",
    "nettoyage de commerces et restaurants",
    "conciergerie Airbnb et locations courte durée",
    "entretien d'hôtels et de résidences",
    "nettoyage automobile intérieur et extérieur",
    "nettoyage aéronautique (cabines, cockpits)",
    "vitrerie",
    "remise en état après chantier",
    "traitement de textiles et mobilier",
  ],

  /**
   * Règles de ton, injectées dans chaque prompt de rédaction.
   * Formulées en interdictions explicites : c'est ce qui tient le mieux un
   * modèle sur la durée.
   */
  voice: {
    do: [
      "premium, professionnel, humain, moderne",
      "phrases courtes, concrètes, ancrées dans le métier",
      "parler du résultat pour le client, pas de l'entreprise",
      "vouvoiement",
      "français impeccable",
    ],
    avoid: [
      "vente agressive, urgence artificielle, superlatifs creux",
      "« n'hésitez pas », « leader », « votre partenaire de confiance »",
      "promesses chiffrées non vérifiables",
      "emojis en rafale (2 maximum, jamais dans la première phrase)",
      "jargon marketing anglais",
    ],
  },
} as const;

export type Brand = typeof brand;

/**
 * Texte de la vidéo de présentation cinématique.
 * Un écran = une idée : les phrases doivent rester courtes, sinon le rythme
 * tombe et le spectateur passe à la vidéo suivante.
 */

export const script = {
  /**
   * 👉 REMPLACEZ CETTE LIGNE PAR L'ACCROCHE DE VOTRE VIDÉO QUI A FAIT LE BUZZ.
   * C'est la seule phrase que 100 % des spectateurs verront : elle décide de
   * tout le reste. Gardez-la courte et frontale.
   */
  hook: "Vous ne verrez plus jamais vos locaux pareil",

  brand: "ProClean Empire",
  subtitle: "Propreté & Multiservices",

  /** Trois temps : le constat, la tension, la promesse. */
  manifesto: [
    "Vos locaux parlent de vous",
    "avant que vous ouvriez la bouche",
    "Nous faisons en sorte qu'ils disent la bonne chose",
  ],

  proof: [
    { value: "24H", label: "Réponse à votre demande de devis" },
    { value: "5,0", label: "Note Google sur 30 avis clients" },
    { value: "7J/7", label: "Interventions de 8h à 18h" },
  ],

  services: [
    "Bureaux",
    "Commerces",
    "Hôtels",
    "Automobile",
    "Aéronautique",
    "Vitrerie",
  ],

  showcase: [
    { src: "media/photos/cockpit-avion-detailing.jpeg", label: "Aéronautique" },
    { src: "media/photos/interieur-mercedes-apres.jpeg", label: "Automobile" },
    { src: "media/photos/airbnb-entree-logement.jpeg", label: "Hôtellerie" },
    { src: "media/photos/canape-velours-apres.jpeg", label: "Mobilier" },
  ],

  finale: {
    line: "Demandez votre devis",
    delay: "Réponse sous 24h",
  },
};

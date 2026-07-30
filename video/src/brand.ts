/**
 * Brand tokens and copy for the ProClean Empire videos.
 *
 * Values mirror `tailwind.config.ts`, `lib/site.ts` and `lib/content/phase1.ts`
 * of the website. Keep them in sync when the site branding changes.
 */

export const colors = {
  brand50: "#eef2f7",
  brand100: "#d7deeb",
  brand500: "#14213d",
  brand700: "#0f1a32",
  brand900: "#0b1326",
  accent500: "#c9a227",
  accent600: "#b28f1f",
  white: "#ffffff",
};

export const fontFamily =
  '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

export const company = {
  name: "ProClean Empire",
  tagline: "Propreté & multiservices pour les entreprises exigeantes",
  phone: "06 17 21 22 30",
  email: "contact@procleanempire.com",
  website: "www.procleanempire.com",
  zone: "Pontoise & Île-de-France",
};

export const headline = {
  title: "La propreté au service de la performance de vos espaces professionnels",
  subtitle:
    "Prestations planifiées, suivi qualité rigoureux et interventions adaptées à vos contraintes d'exploitation.",
};

export const stats = [
  { value: "24h", label: "Réponse à toute demande de devis" },
  { value: "5,0/5", label: "Note Google sur 30 avis clients" },
  { value: "7j/7", label: "Interventions de 8h à 18h" },
];

export const services = [
  "Bureaux & locaux professionnels",
  "Commerces & restaurants",
  "Hôtels & logements courte durée",
  "Nettoyage automobile & aéronautique",
  "Vitrerie & remise en état",
];

export const commitments = [
  "Agents qualifiés et formés",
  "Contrôle qualité terrain",
  "Interlocuteur dédié",
];

/**
 * Paths are resolved against the website's `public/` folder, which is wired up
 * as the Remotion public directory in `remotion.config.ts`.
 */
export const media = {
  logo: "media/logo/proclean-empire-logo.png",
  showcase: [
    "media/photos/cockpit-avion-detailing.jpeg",
    "media/photos/canape-velours-apres.jpeg",
    "media/photos/airbnb-entree-logement.jpeg",
    "media/photos/interieur-mercedes-apres.jpeg",
  ],
  beforeAfter: [
    {
      before: "media/photos/cuir-rouge-avant.jpeg",
      after: "media/photos/cuir-rouge-apres.jpeg",
    },
    {
      before: "media/photos/siege-auto-avant.jpeg",
      after: "media/photos/interieur-auto-apres.jpeg",
    },
  ],
};

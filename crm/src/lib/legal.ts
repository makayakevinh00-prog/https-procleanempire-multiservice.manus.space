/**
 * Identité légale affichée sur les pages publiques (mentions légales, conditions, confidentialité).
 * Ces pages sont lues sans session : elles ne peuvent pas interroger les paramètres du CRM (réservés au patron).
 * Toute modification de la société (adresse, capital, SIRET) se reporte donc ici.
 */
export const COMPANY = {
  name: "ProClean Empire",
  form: "SASU",
  capital: "1 000,00 €",
  address: "3 rue Stéphane Charbonnier, 95300 Pontoise",
  rcs: "RCS Pontoise 106 602 659",
  siret: "106 602 659 00018",
  email: "contact@procleanempire.com",
  phone: "06 17 21 22 30",
  publisher: "Kevinh Makaya Mateve",
  site: "https://procleanempire.com",
} as const;

export const HOST = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  site: "https://vercel.com",
} as const;

/** Date de dernière mise à jour affichée en bas des pages légales. */
export const LEGAL_UPDATED = "23 novembre 2026";

export const LEGAL_LINKS: [string, string][] = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "Conditions d'utilisation"],
  ["/confidentialite", "Confidentialité"],
];

/**
 * Prestations qui ont leur propre page principale (/<slug>).
 * Module sans dépendance : il est aussi lu par next.config.ts (redirections de /services/<slug>).
 */
export const STANDALONE_PAGES = new Set([
  "nettoyage-automobile",
  "nettoyage-bureaux",
  "nettoyage-commerces",
  "nettoyage-restaurants",
  "nettoyage-hotels",
  "nettoyage-vitrerie",
  "apres-chantier",
  "remise-en-etat"
]);

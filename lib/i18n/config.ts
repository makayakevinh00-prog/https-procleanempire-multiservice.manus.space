/**
 * Structure multilingue (préparation, octobre 2026).
 * - Le site public reste 100 % en français : aucune page anglaise n'est publiée.
 * - Pour publier l'anglais plus tard : passer `publishedLocales` à ["fr", "en"],
 *   ajouter les routes /en (dossier app/en ou segment [lang]) et les balises hreflang.
 *   À VALIDER PAR KEVINH avant toute mise en ligne de l'anglais.
 */
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

/** Langues réellement visibles sur le site. */
export const publishedLocales: readonly Locale[] = ["fr"];

export const ogLocale: Record<Locale, string> = { fr: "fr_FR", en: "en_GB" };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

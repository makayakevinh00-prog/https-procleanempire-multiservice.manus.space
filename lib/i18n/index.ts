import { defaultLocale, type Locale } from "./config";
import { en } from "./en";
import { fr, type Dictionary } from "./fr";

export * from "./config";
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { fr, en };

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/** Menu principal (mêmes adresses quelle que soit la langue pour l'instant). */
export function getNavLinks(locale: Locale = defaultLocale) {
  const t = getDictionary(locale).nav;
  return [
    { label: t.home, href: "/" },
    { label: t.airbnb, href: "/menage-airbnb" },
    { label: t.offices, href: "/nettoyage-bureaux" },
    { label: t.concierge, href: "/conciergerie-entreprise" },
    { label: t.contact, href: "/contact" }
  ];
}

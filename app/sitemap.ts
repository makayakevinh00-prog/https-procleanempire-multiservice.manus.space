import { MetadataRoute } from "next";
import { services, STANDALONE_PAGES } from "@/lib/data";
import { siteConfig } from "@/lib/site";
import { localPages } from "@/lib/content/local-pages";

export const dynamic = "force-static";

// Date de dernière mise à jour des pages : fixe (une date qui change à chaque déploiement fait perdre confiance à Google). À mettre à jour quand le contenu change vraiment.
const LAST_UPDATE = new Date("2026-11-23");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/menage-airbnb",
    "/conciergerie-entreprise",
    "/a-propos",
    "/realisations",
    "/galerie",
    "/equipe",
    "/videos",
    "/services",
    "/faq",
    "/blog",
    "/blog/decoration-noel-bureaux-commerces-val-doise",
    "/blog/menage-airbnb-val-doise-entre-deux-voyageurs",
    "/blog/nettoyage-bureaux-cergy-pontoise-frequence",
    "/devis",
    "/proprietaires",
    "/contact",
    "/mentions-legales",
    "/politique-confidentialite",
    "/nettoyage-automobile",
    "/nettoyage-bureaux",
    "/nettoyage-hotels",
    "/nettoyage-restaurants",
    "/nettoyage-commerces",
    "/nettoyage-vitrerie",
    "/apres-chantier",
    "/remise-en-etat",
    "/zones-intervention",
    ...localPages.map((page) => `/${page.slug}`)
  ];

  const staticEntries = staticRoutes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: LAST_UPDATE,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/menage-airbnb" ? 0.95 : 0.8
  }));

  const serviceEntries = services.filter((service) => !STANDALONE_PAGES.has(service.slug)).map((service) => ({
    url: `${siteConfig.url}/services/${service.slug}`,
    lastModified: LAST_UPDATE,
    changeFrequency: "weekly" as const,
    priority: 0.75
  }));

  return [...staticEntries, ...serviceEntries];
}

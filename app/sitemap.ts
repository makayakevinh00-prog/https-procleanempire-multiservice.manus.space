import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/a-propos",
    "/realisations",
    "/galerie",
    "/equipe",
    "/videos",
    "/services",
    "/faq",
    "/blog",
    "/devis",
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
    "/remise-en-etat"
  ];

  const staticEntries = staticRoutes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8
  }));

  // /services/[slug] pages aren't included here: every current service already
  // has a dedicated static route above, so adding both would submit two
  // indexable URLs for the same content.
  return staticEntries;
}

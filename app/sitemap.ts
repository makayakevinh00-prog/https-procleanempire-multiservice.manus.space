import { MetadataRoute } from "next";
import { services } from "@/lib/data";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/a-propos",
    "/realisations",
    "/galerie",
    "/equipe",
    "/services",
    "/faq",
    "/blog",
    "/devis",
    "/contact",
    "/mentions-legales",
    "/politique-confidentialite",
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

  const serviceEntries = services.map((service) => ({
    url: `${siteConfig.url}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75
  }));

  return [...staticEntries, ...serviceEntries];
}

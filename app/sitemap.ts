import { MetadataRoute } from "next";
import { services } from "@/lib/data";
import { siteConfig } from "@/lib/site";
import { cityPages } from "@/lib/content/cities";
import { articles } from "@/lib/content/articles";

export const dynamic = "force-static";

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
    "/remise-en-etat",
    "/zones-intervention",
    "/menage-airbnb",
    "/rendez-vous"
  ];

  const staticEntries = staticRoutes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/menage-airbnb" ? 0.95 : 0.8
  }));

  const serviceEntries = services.map((service) => ({
    url: `${siteConfig.url}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75
  }));

  const cityEntries = cityPages.map((city) => ({
    url: `${siteConfig.url}/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9
  }));

  const articleEntries = articles.map((article) => ({
    url: `${siteConfig.url}/blog/${article.slug}`,
    lastModified: new Date(article.isoDate),
    changeFrequency: "monthly" as const,
    priority: 0.6
  }));

  return [...staticEntries, ...cityEntries, ...serviceEntries, ...articleEntries];
}

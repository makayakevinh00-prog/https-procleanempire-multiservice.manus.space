import { Metadata } from "next";

export const siteConfig = {
  name: "ProClean Empire",
  url: "https://proclean-empire.fr",
  phone: "01 89 71 24 48",
  phoneHref: "tel:+33189712448",
  email: "contact@proclean-empire.fr",
  city: "Île-de-France",
  responseDelay: "Intervention sous 24 à 48h en Île-de-France"
};

export function buildMetadata({
  title,
  description,
  path = "/"
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const fullTitle = `${title} | ${siteConfig.name}`;
  const canonical = `${siteConfig.url}${path}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: "fr_FR",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description
    }
  };
}

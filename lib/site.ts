import { Metadata } from "next";

export const siteConfig = {
  name: "ProClean Empire",
  url: "https://proclean-empire.fr",
  phone: "[A REMPLIR PAR VOUS]",
  phoneHref: "tel:+33000000000",
  email: "[A REMPLIR PAR VOUS]",
  city: "Pontoise",
  region: "Île-de-France",
  addressLine: "3 rue Stephane Charbonnier, 95800 Pontoise",
  responseDelay: "Intervention rapide sur Pontoise et l'Île-de-France"
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

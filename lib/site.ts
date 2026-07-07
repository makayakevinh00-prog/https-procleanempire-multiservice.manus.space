export const siteConfig = {
  name: "ProClean Empire",
  url: "https://proclean-empire.fr",
  phone: "01 23 45 67 89",
  phoneHref: "tel:+33123456789",
  email: "contact@proclean-empire.fr",
  city: "Pontoise",
  region: "Île-de-France",
  addressLine: "12 rue des Entreprises",
  responseDelay: "Réponse sous 24h"
};

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function buildMetadata({ title, description, path }: BuildMetadataInput) {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = `${title} | ${siteConfig.name}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: "fr_FR",
      type: "website"
    },
    twitter: {
      card: "summary_large_image" as const,
      title: fullTitle,
      description
    }
  };
}

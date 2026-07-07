export const siteConfig = {
  name: "ProClean Empire",
  url: "https://www.procleanempire.com",
  phone: "06 17 21 22 30",
  phoneHref: "tel:+33617212230",
  email: "contact@procleanempire.com",
  city: "Pontoise",
  region: "Île-de-France",
  addressLine: "3 rue Stéphane Charbonnier",
  postalCode: "95300",
  openingHours: "Ouvert 7j/7, de 8h à 18h",
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

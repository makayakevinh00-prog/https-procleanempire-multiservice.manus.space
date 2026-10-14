import { Metadata } from "next";

// Lien public de la page de réservation Axonaut : À RENSEIGNER PAR KEVINH.
const axonautBookingUrl: string = "";

export const siteConfig = {
  name: "ProClean Empire",
  url: "https://www.procleanempire.com",
  phone: "06 17 21 22 30",
  phoneHref: "tel:+33617212230",
  email: "contact@procleanempire.com",
  city: "Pontoise",
  region: "Île-de-France",
  addressLine: "3 rue Stéphane Charbonnier, 95800 Pontoise",
  axonautBookingUrl,
  // Tous les boutons « Prendre RDV » : page Axonaut si renseignée, sinon types de RDV de /contact.
  bookingUrl: axonautBookingUrl || "/contact#rdv",
  whatsappHref: "https://wa.me/33617212230",
  responseDelay: "Réactivité opérationnelle sur Pontoise et l'Île-de-France"
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

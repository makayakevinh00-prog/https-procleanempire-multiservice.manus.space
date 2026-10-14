import { Metadata } from "next";

// Lien public de la page de réservation Axonaut (fourni par Kevinh le 14/10/2026).
const axonautBookingUrl: string =
  "https://axonaut.com/public/booking/cc8f49/pageShow/procleanempire-7962cc";

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
  hours: "7j/7 de 8h à 18h",
  googleReviewsUrl: "https://g.page/r/CXuyftubiMPuEAE/review",
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
      type: "website",
      images: [{ url: `${siteConfig.url}/media/photos/hero-showcase.jpg`, width: 1600, height: 1600, alt: "ProClean Empire" }]
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${siteConfig.url}/media/photos/hero-showcase.jpg`]
    }
  };
}

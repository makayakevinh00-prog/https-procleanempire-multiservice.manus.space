import { Metadata } from "next";

// Page de réservation Axonaut retirée le 19/10/2026 (bascule Axonaut → Qonto, règle §14) :
// les boutons « Prendre RDV » mènent aux types de rendez-vous de /contact (WhatsApp ou téléphone).

export const siteConfig = {
  name: "ProClean Empire",
  url: "https://www.procleanempire.com",
  phone: "06 17 21 22 30",
  phoneHref: "tel:+33617212230",
  email: "contact@procleanempire.com",
  city: "Pontoise",
  region: "Île-de-France",
  addressLine: "3 rue Stéphane Charbonnier, 95300 Pontoise",
  // Tous les boutons « Prendre RDV ».
  bookingUrl: "/contact#rdv",
  whatsappHref: "https://wa.me/33617212230",
  hours: "7j/7 de 8h à 18h",
  // Phrase unique (audit P0-4) : horaires de réponse, délai de devis, horaires d'intervention.
  promise:
    "Demandes reçues 7j/7. Réponse sous 24 h pendant les horaires de traitement (7j/7, 8h–18h). Interventions possibles tôt le matin, en soirée et le week-end selon la prestation et le planning.",
  googleReviewsUrl: "https://g.page/r/CXuyftubiMPuEAE/review",
  // Note Google affichée sur le site : à mettre à jour ici uniquement (relevé du 19/10/2026 : 5,0/5, 33 avis).
  googleRating: { value: "5,0", count: 33 },
  // Profils officiels (JSON-LD sameAs).
  sameAs: [
    "https://g.page/r/CXuyftubiMPuEAE",
    "https://www.facebook.com/people/Proclean-Empire/61575993812750/",
    "https://www.instagram.com/proclean_empire/",
    "https://www.linkedin.com/company/procelan-empire",
    "https://fr.trustpilot.com/review/procleanempire.com",
    "https://www.youtube.com/@ProCleanEmpire",
    "https://www.tiktok.com/@procleanempire"
  ],
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

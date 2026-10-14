import type { Metadata } from "next";
import "./globals.css";
import { Header, HeaderSpacer } from "@/components/layout/header";
import { BookingButton } from "@/components/layout/booking-button";
import { Footer } from "@/components/layout/footer";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "ProClean Empire | Ménage Airbnb, nettoyage de bureaux et conciergerie à Pontoise",
  description:
    "Ménage Airbnb, nettoyage de bureaux et commerces, conciergerie d'entreprise et detailing auto & avion à Pontoise, dans le Val-d'Oise et en Île-de-France.",
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    siteName: siteConfig.name,
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/media/photos/hero-showcase.jpg", width: 1600, height: 1600, alt: "ProClean Empire" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": `${siteConfig.url}/#entreprise`,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/media/logo/proclean-empire-logo.png`,
    image: `${siteConfig.url}/media/photos/hero-showcase.jpg`,
    openingHours: "Mo-Su 08:00-18:00",
    sameAs: [
      "https://www.youtube.com/@ProCleanEmpire",
      "https://www.linkedin.com/company/procelan-empire",
      "https://www.instagram.com/proclean_empire/",
      "https://www.facebook.com/people/Proclean-Empire/61575993812750/",
      "https://www.tiktok.com/@procleanempire"
    ],
    makesOffer: [
      "Ménage Airbnb",
      "Nettoyage de bureaux et commerces",
      "Conciergerie d'entreprise",
      "Remise en état"
    ].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
    areaServed: ["Pontoise", "Cergy", "Val-d'Oise", "Paris", "Saint-Ouen-sur-Seine", "Île-de-France"].map((name) => ({ "@type": "Place", name })),
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.addressLine,
      addressLocality: siteConfig.city,
      addressRegion: siteConfig.region,
      addressCountry: "FR"
    }
  };

  return (
    <html lang="fr">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow"
        >
          Aller au contenu
        </a>
        <Header />
        <HeaderSpacer />
        <main id="main-content">{children}</main>
        <Footer />
        <BookingButton />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}

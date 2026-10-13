import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteConfig } from "@/lib/site";
import { cityPages } from "@/lib/content/cities";
import { socialLinks } from "@/lib/content/phase3";

export const metadata: Metadata = {
  title: "Entreprise de nettoyage à Pontoise et Cergy (95) | ProClean Empire",
  description:
    "Entreprise de nettoyage professionnel à Pontoise (95) : bureaux, commerces, restaurants, vitrerie et remise en état en Île-de-France.",
  metadataBase: new URL(siteConfig.url)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "CleaningService",
    "@id": `${siteConfig.url}/#entreprise`,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/media/logo/proclean-empire-logo.png`,
    image: `${siteConfig.url}/media/logo/proclean-empire-logo.png`,
    description:
      "Entreprise de nettoyage professionnel basée à Pontoise (95) : ménage Airbnb et locations courte durée, nettoyage de bureaux, commerces, restaurants, hôtels, vitrerie, remise en état et detailing automobile en Île-de-France.",
    telephone: "+33617212230",
    email: siteConfig.email,
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.streetAddress,
      addressLocality: siteConfig.city,
      postalCode: siteConfig.postalCode,
      addressRegion: siteConfig.region,
      addressCountry: "FR"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 49.0507,
      longitude: 2.1008
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59"
      }
    ],
    areaServed: [
      ...cityPages.map((city) => ({ "@type": "City", name: city.name })),
      { "@type": "AdministrativeArea", name: "Val-d'Oise" },
      { "@type": "AdministrativeArea", name: "Île-de-France" }
    ],
    sameAs: socialLinks.map((social) => social.href).filter((href) => href.startsWith("http"))
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
        <main id="main-content">{children}</main>
        <Footer />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}

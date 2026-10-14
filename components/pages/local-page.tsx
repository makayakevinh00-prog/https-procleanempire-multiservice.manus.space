import { PremiumService } from "@/components/pages/premium-service";
import { buildMetadata, siteConfig } from "@/lib/site";
import { getLocalPage } from "@/lib/content/local-pages";

export function localMetadata(slug: string) {
  const page = getLocalPage(slug);
  return buildMetadata({ title: page.metaTitle, description: page.metaDescription, path: `/${page.slug}` });
}

export function LocalPageView({ slug }: { slug: string }) {
  const page = getLocalPage(slug);
  return (
    <PremiumService
      {...page.props}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: `Nettoyage et ménage Airbnb à ${page.city}`,
        serviceType: "Ménage Airbnb, nettoyage de bureaux et commerces",
        provider: {
          "@type": "LocalBusiness",
          name: siteConfig.name,
          telephone: siteConfig.phone,
          url: siteConfig.url,
          address: {
            "@type": "PostalAddress",
            streetAddress: siteConfig.addressLine,
            addressLocality: siteConfig.city,
            addressCountry: "FR"
          }
        },
        areaServed: { "@type": "City", name: page.city, address: { "@type": "PostalAddress", postalCode: page.postalCode, addressCountry: "FR" } },
        url: `${siteConfig.url}/${page.slug}`
      }}
    />
  );
}

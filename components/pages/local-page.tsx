import Link from "next/link";
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
      aside={
        page.related?.length ? (
          <section className="bg-white">
            <div className="mx-auto max-w-[1200px] px-5 pb-20 md:px-8 md:pb-28">
              <h2 className="text-2xl font-bold text-ink">Voir aussi</h2>
              <ul className="mt-5 flex flex-wrap gap-3">
                {page.related.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="btn-pill-ghost text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : undefined
      }
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: page.serviceName ?? `Nettoyage et ménage Airbnb à ${page.city}`,
        serviceType: page.serviceType ?? "Ménage Airbnb, nettoyage de bureaux et commerces",
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

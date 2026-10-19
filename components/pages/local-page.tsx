import Link from "next/link";
import { PremiumService } from "@/components/pages/premium-service";
import { buildMetadata, siteConfig } from "@/lib/site";
import { getLocalPage } from "@/lib/content/local-pages";
import { PartnersMarquee } from "@/components/phase1/partners-marquee";

/** Transforme « [libellé](/chemin) » en lien interne. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\(\/[^)]*\))/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/);
        return match ? (
          <Link key={index} href={match[2]} className="font-semibold text-[#1d6fe0] underline-offset-4 hover:underline">
            {match[1]}
          </Link>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

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
        page.related?.length || page.article?.length || page.districts || page.showPartners ? (
          <>
          {page.article?.map((section) => (
            <section key={section.heading} className="bg-white">
              <div className="mx-auto max-w-[900px] px-5 py-16 md:px-8 md:py-20">
                <h2 className="display-lg text-ink">{section.heading}</h2>
                <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>
                      <RichText text={paragraph} />
                    </p>
                  ))}
                </div>
              </div>
            </section>
          ))}
          {page.districts ? (
            <section className="bg-mist">
              <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-20">
                <h2 className="display-lg text-ink">{page.districts.heading}</h2>
                <p className="mt-4 max-w-2xl text-lg text-slate-700">{page.districts.intro}</p>
                {page.districts.highlight ? (
                  <p className="mt-6 max-w-3xl rounded-[24px] bg-white p-6 text-lg font-semibold text-ink shadow-soft">
                    {page.districts.highlight}
                  </p>
                ) : null}
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {page.districts.list.map((name) => (
                    <li key={name} className="rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-slate-700">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
          {page.showPartners ? <PartnersMarquee /> : null}
          {page.related?.length ? (
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
          ) : null}
          </>
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

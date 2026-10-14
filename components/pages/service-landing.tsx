import Link from "next/link";
import { notFound } from "next/navigation";
import { services } from "@/lib/data";
import { siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { VisualPlaceholder } from "@/components/ui/visual-placeholder";
import { serviceSeo } from "@/lib/content/service-seo";
import { cityPages } from "@/lib/content/cities";

export function ServiceLanding({
  slug,
  path
}: {
  slug: string;
  path: string;
}) {
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    notFound();
  }

  const seo = serviceSeo[slug];

  return (
    <>
      <PageHero
        title={seo?.h1 ?? service.title}
        description={service.detailedDescription}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: service.title }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/rendez-vous" className="btn-secondary">
              Planifier une visite technique
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <div className="grid gap-8 lg:grid-cols-[1fr,0.9fr]">
          <article className="card p-6 md:p-8">
            <p className="text-sm leading-relaxed text-slate-600">{service.shortDescription}</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700">
              {service.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <span aria-hidden className="text-brand-700">
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/devis" className="btn-primary">
                Recevoir une estimation
              </Link>
              <Link href={`/services/${slug}`} className="btn-secondary">
                Découvrir la prestation
              </Link>
            </div>
          </article>
          <VisualPlaceholder label={`PHOTO ${service.title.toUpperCase()}`} ratio="tall" />
        </div>
      </section>
      {seo ? (
        <section className="section pt-0">
          <div className="grid gap-6 md:grid-cols-2">
            {seo.sections.map((block) => (
              <article key={block.title} className="card p-6 md:p-8">
                <h2 className="text-xl font-semibold text-[#14213d]">{block.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">{block.body}</p>
              </article>
            ))}
          </div>
          <h2 className="mt-12 text-2xl font-semibold text-[#14213d]">Questions fréquentes</h2>
          <div className="mt-6 space-y-3">
            {seo.faqs.map((faq) => (
              <article key={faq.question} className="card p-6">
                <h3 className="font-semibold text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
          <h2 className="mt-12 text-2xl font-semibold text-[#14213d]">Nos villes d&apos;intervention</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {cityPages.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}`}
                  className="inline-block rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-white"
                >
                  {city.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/zones-intervention"
                className="inline-block rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-white"
              >
                Toute l&apos;Île-de-France
              </Link>
            </li>
          </ul>
        </section>
      ) : null}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: seo?.h1 ?? service.title,
            description: seo?.metaDescription ?? service.shortDescription,
            provider: { "@id": `${siteConfig.url}/#entreprise` },
            areaServed: ["Pontoise", "Cergy", "Val-d'Oise", "Île-de-France"],
            url: `${siteConfig.url}${path}`
          })
        }}
      />
      {seo ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: seo.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer }
              }))
            })
          }}
        />
      ) : null}
    </>
  );
}

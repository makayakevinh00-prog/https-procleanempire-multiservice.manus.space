import Link from "next/link";
import { notFound } from "next/navigation";
import { cityPages, cityServiceLinks, getCityPage } from "@/lib/content/cities";
import { siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { CtaBand } from "@/components/sections/cta-band";

export function CityLanding({ slug }: { slug: string }) {
  const city = getCityPage(slug);

  if (!city) {
    notFound();
  }

  const nearby = city.nearby
    .map((item) => cityPages.find((page) => page.slug === item))
    .filter((page): page is NonNullable<typeof page> => Boolean(page));

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: city.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Nettoyage professionnel",
    name: city.h1,
    provider: { "@id": `${siteConfig.url}/#entreprise` },
    areaServed: { "@type": "City", name: city.name, postalCode: city.postalCode },
    url: `${siteConfig.url}/${city.slug}`
  };

  return (
    <>
      <PageHero
        title={city.h1}
        description={city.intro}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Zones d'intervention", href: "/zones-intervention" },
          { label: city.name }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Devis gratuit sous 24 h
            </Link>
            <Link href="/rendez-vous" className="btn-secondary">
              Planifier une visite gratuite
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-8">
            {city.sections.map((section) => (
              <article key={section.title} className="card p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-[#14213d]">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
                    {paragraph}
                  </p>
                ))}
              </article>
            ))}
          </div>
          <aside className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#14213d]">Nos services à {city.name}</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {cityServiceLinks.map((service) => (
                  <li key={service.href}>
                    <Link href={service.href} className="text-slate-700 underline-offset-2 hover:underline">
                      {service.label} à {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#14213d]">Secteurs desservis</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {city.areas.join(" · ")} ({city.postalCode})
              </p>
            </div>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#14213d]">Villes voisines</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {nearby.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="text-slate-700 underline-offset-2 hover:underline">
                      Entreprise de nettoyage à {page.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
      <section className="section pt-0">
        <h2 className="text-2xl font-semibold text-[#14213d]">Questions fréquentes – nettoyage à {city.name}</h2>
        <div className="mt-6 space-y-3">
          {city.faqs.map((faq) => (
            <article key={faq.question} className="card p-6">
              <h3 className="font-semibold text-slate-900">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

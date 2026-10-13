import Link from "next/link";
import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { airbnbContent as c } from "@/lib/content/airbnb";

export const metadata = buildMetadata({
  title: c.metaTitle,
  description: c.metaDescription,
  path: "/menage-airbnb"
});

export default function MenageAirbnbPage() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Ménage Airbnb et location courte durée",
    name: c.h1,
    description: c.metaDescription,
    provider: { "@id": `${siteConfig.url}/#entreprise` },
    areaServed: ["Paris", "Saint-Ouen-sur-Seine", "Pontoise", "Cergy", "Île-de-France"],
    offers: { "@type": "Offer", priceCurrency: "EUR", price: "35", description: "Ménage studio, à partir de" },
    url: `${siteConfig.url}/menage-airbnb`
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };

  return (
    <>
      <PageHero
        title={c.h1}
        description={c.intro}
        breadcrumbs={[{ label: "Accueil", href: "/" }, { label: "Ménage Airbnb" }]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis Airbnb
            </Link>
            <a href={siteConfig.phoneHref} className="btn-secondary">
              Appeler le {siteConfig.phone}
            </a>
          </>
        }
      />
      <section className="section pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          {c.photos.map((photo) => (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="h-64 w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      </section>
      <section className="section pt-0">
        <div className="grid gap-8 lg:grid-cols-2">
          <article className="card p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-[#14213d]">Ce qui est inclus à chaque passage</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700">
              {c.included.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-brand-700">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="card p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-[#14213d]">Options</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700">
              {c.options.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-brand-700">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
      <section className="section pt-0">
        <h2 className="text-2xl font-semibold text-[#14213d]">Tarifs ménage Airbnb</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {c.prices.map((price) => (
            <div key={price.label} className="card flex items-center justify-between p-5">
              <span className="font-semibold text-slate-900">{price.label}</span>
              <span className="text-sm font-semibold text-[#c9a227]">{price.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Tarifs indicatifs par passage. Tarifs dégressifs pour les conciergeries selon le volume mensuel.
        </p>
      </section>
      <section className="section pt-0">
        <div className="grid gap-6 md:grid-cols-3">
          {c.conciergeries.map((block) => (
            <article key={block.title} className="card p-6">
              <h2 className="text-xl font-semibold text-[#14213d]">{block.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{block.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section pt-0">
        <h2 className="text-2xl font-semibold text-[#14213d]">Zones d&apos;intervention Airbnb</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{c.zones.join(" · ")}</p>
      </section>
      <section className="section pt-0">
        <h2 className="text-2xl font-semibold text-[#14213d]">Questions fréquentes – ménage Airbnb</h2>
        <div className="mt-6 space-y-3">
          {c.faqs.map((faq) => (
            <article key={faq.question} className="card p-6">
              <h3 className="font-semibold text-slate-900">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm">
          <Link href="/blog/menage-airbnb-checklist-prix" className="font-semibold text-[#14213d] underline">
            Lire notre guide : ménage Airbnb, prix et checklist entre deux voyageurs
          </Link>
        </p>
      </section>
      <CtaBand />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}

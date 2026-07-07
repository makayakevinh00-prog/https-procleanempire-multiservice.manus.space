import Link from "next/link";
import { notFound } from "next/navigation";
import { services } from "@/lib/data";
import { PageHero } from "@/components/sections/page-hero";
import { VisualPlaceholder } from "@/components/ui/visual-placeholder";

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

  return (
    <>
      <PageHero
        title={service.title}
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
            <Link href="/contact" className="btn-secondary">
              Être rappelé
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
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.title,
            description: service.shortDescription,
            areaServed: "Île-de-France",
            url: `https://proclean-empire.fr${path}`
          })
        }}
      />
    </>
  );
}

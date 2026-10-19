import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata, siteConfig } from "@/lib/site";
import { services, STANDALONE_PAGES } from "@/lib/data";
import { PageHero } from "@/components/sections/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { ServiceVisual } from "@/components/ui/service-visual";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  // Les prestations ayant leur propre page sont redirigées (next.config.ts) : pas de page en double.
  return services.filter((service) => !STANDALONE_PAGES.has(service.slug)).map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    return buildMetadata({
      title: "Service introuvable",
      description: "Le service demandé est introuvable.",
      path: `/services/${slug}`
    });
  }

  // Ces services ont leur propre page : on la désigne comme canonique (évite le contenu dupliqué).
  return buildMetadata({
    title: `${service.title} à Pontoise et en Île-de-France`,
    description: `${service.shortDescription} ProClean Empire, entreprise de nettoyage à Pontoise (Val-d'Oise), intervient aussi à Paris. Devis sous 24 h.`,
    path: STANDALONE_PAGES.has(service.slug) ? `/${service.slug}` : `/services/${service.slug}`
  });
}

export default async function ServiceDetailPage({ params }: Params) {
  const { slug } = await params;
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
          { label: "Nos services", href: "/services" },
          { label: service.title }
        ]}
        actions={
          <>
            <Link href="/contact#devis" className="btn-primary">
                Demander un devis
              </Link>
            <a href={siteConfig.bookingUrl} className="btn-secondary">
                Être rappelé
              </a>
          </>
        }
      />

      <section className="section pt-0">
        <div className="grid gap-8 lg:grid-cols-[1fr,0.9fr]">
          <article className="card p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">
              Ce que vous gagnez concrètement
            </h2>
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
            <h3 className="mt-8 text-lg font-semibold text-slate-900">Secteurs concernés</h3>
            <p className="mt-2 text-sm text-slate-600">{service.sectors.join(" · ")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact#devis" className="btn-primary">
                Demander un devis
              </Link>
              <a href={siteConfig.bookingUrl} className="btn-secondary">
                Être rappelé
              </a>
            </div>
          </article>
          <ServiceVisual slug={service.slug} />
        </div>
      </section>
      <CtaBand />
    </>
  );
}

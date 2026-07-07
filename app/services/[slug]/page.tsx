import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/site";
import { services } from "@/lib/data";
import { PageHero } from "@/components/sections/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { VisualPlaceholder } from "@/components/ui/visual-placeholder";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
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

  return buildMetadata({
    title: service.title,
    description: service.shortDescription,
    path: `/services/${service.slug}`
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
            <Link href="/devis" className="btn-primary">
              Recevoir une estimation
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
              <Link href="/devis" className="btn-primary">
                Demander un devis
              </Link>
              <Link href="/contact" className="btn-secondary">
                Planifier une visite
              </Link>
            </div>
          </article>
          <VisualPlaceholder label={`PHOTO ${service.title.toUpperCase()}`} ratio="tall" />
        </div>
      </section>
      <CtaBand />
    </>
  );
}

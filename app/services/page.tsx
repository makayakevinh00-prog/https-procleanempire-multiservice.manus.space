import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { services } from "@/lib/data";
import { PageHero } from "@/components/sections/page-hero";
import { ServiceCard } from "@/components/sections/service-card";
import { SectorsSection } from "@/components/sections/sectors-section";
import { CtaBand } from "@/components/sections/cta-band";

export const metadata = buildMetadata({
  title: "Nos prestations de propreté pour entreprises",
  description:
    "Découvrez nos prestations de propreté pour bureaux, commerces, hôtels, restaurants, vitrerie et interventions spécialisées.",
  path: "/services"
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        title="Nos services"
        description="Des solutions d'entretien construites pour vos contraintes métier: image de marque, fréquentation, hygiène et continuité d'activité."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Nos services" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Planifier une visite
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>
      <SectorsSection />
      <section className="section pt-0">
        <div className="card p-6 md:p-8">
          <p className="text-sm leading-relaxed text-slate-700">
            ProClean Empire accompagne les entreprises dans la gestion de leurs prestations de
            propreté grâce à une organisation rigoureuse, des équipes qualifiées et un suivi
            qualité permanent. Nous construisons des solutions adaptées aux contraintes de chaque
            site afin de garantir un environnement de travail conforme, structuré et valorisant.
          </p>
        </div>
      </section>
      <CtaBand />
    </>
  );
}

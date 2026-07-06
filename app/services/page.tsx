import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { services } from "@/lib/data";
import { PageHero } from "@/components/sections/page-hero";
import { ServiceCard } from "@/components/sections/service-card";
import { CtaBand } from "@/components/sections/cta-band";

export const metadata = buildMetadata({
  title: "Nos services de nettoyage professionnel",
  description:
    "Découvrez nos prestations de nettoyage pour bureaux, commerces, hôtels, restaurants, vitrerie et interventions spécialisées.",
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
      <CtaBand />
    </>
  );
}

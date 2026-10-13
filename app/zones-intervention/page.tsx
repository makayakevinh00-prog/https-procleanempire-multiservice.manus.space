import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { ZonesGrid } from "@/components/sections/zones-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { zonesPageContent } from "@/lib/content/zones";
import { cityPages } from "@/lib/content/cities";

export const metadata = buildMetadata({
  title: "Zones d'intervention : Pontoise, Cergy, Val-d'Oise et Île-de-France",
  description:
    "Découvrez les villes et départements d'Île-de-France où ProClean Empire intervient : Val-d'Oise, Hauts-de-Seine, Yvelines, Seine-Saint-Denis, Val-de-Marne, Essonne, Seine-et-Marne et Paris.",
  path: "/zones-intervention"
});

export default function ZonesInterventionPage() {
  return (
    <>
      <PageHero
        title={zonesPageContent.title}
        description={zonesPageContent.description}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Zones d'intervention" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Vérifier une zone précise
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <h2 className="text-2xl font-semibold text-[#14213d]">Entreprise de nettoyage près de chez vous</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Basés à Pontoise (95300), nous intervenons en priorité dans l&apos;agglomération de Cergy-Pontoise et le
          Val-d&apos;Oise, ainsi que dans toute l&apos;Île-de-France.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cityPages.map((city) => (
            <li key={city.slug}>
              <Link href={`/${city.slug}`} className="card block p-5 font-semibold text-[#14213d] hover:shadow-md">
                Nettoyage à {city.name} ({city.postalCode})
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ZonesGrid />
      <CtaBand />
    </>
  );
}

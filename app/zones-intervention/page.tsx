import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { ZonesGrid } from "@/components/sections/zones-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { zonesPageContent } from "@/lib/content/zones";
import { localPages } from "@/lib/content/local-pages";

export const metadata = buildMetadata({
  title: "Zones d'intervention : Pontoise, Val-d'Oise, Paris et Île-de-France",
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
        <h2 className="text-2xl font-bold text-slate-900">Nos pages par ville</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {localPages.map((page) => (
            <li key={page.slug}>
              <Link href={`/${page.slug}`} className="btn-pill-ghost text-ink">
                {page.label ?? page.city}
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

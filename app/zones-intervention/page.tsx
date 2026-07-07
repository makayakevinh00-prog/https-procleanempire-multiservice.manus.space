import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { ZonesGrid } from "@/components/sections/zones-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { zonesPageContent } from "@/lib/content/zones";

export const metadata = buildMetadata({
  title: "Zones d'intervention",
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
      <ZonesGrid />
      <CtaBand />
    </>
  );
}

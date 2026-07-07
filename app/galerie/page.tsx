import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { GalleryFilterGrid } from "@/components/phase2/gallery-filter-grid";

export const metadata = buildMetadata({
  title: "Galerie",
  description:
    "Galerie ProClean Empire avec filtres par catégories : bureaux, restaurants, hôtels, vitrerie, après chantier, avant/après, équipe.",
  path: "/galerie"
});

export default function GaleriePage() {
  return (
    <>
      <PageHero
        title="Galerie"
        description="Parcourez nos photos par type d&apos;intervention pour évaluer notre niveau de finition."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Galerie" }
        ]}
        actions={
          <>
            <Link href="/realisations" className="btn-secondary">
              Voir les études de cas
            </Link>
            <Link href="/devis" className="btn-primary">
              Recevoir une estimation
            </Link>
          </>
        }
      />
      <GalleryFilterGrid />
    </>
  );
}

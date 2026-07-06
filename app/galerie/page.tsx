import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { GalleryFilterGrid } from "@/components/phase2/gallery-filter-grid";

export const metadata = buildMetadata({
  title: "Galerie",
  description:
    "Galerie photo ProClean Empire avec filtres par categories: bureaux, restaurants, hotels, vitrerie, apres chantier, avant/apres, equipe.",
  path: "/galerie"
});

export default function GaleriePage() {
  return (
    <>
      <PageHero
        title="Galerie"
        description="Parcourez nos photos par type d&apos;intervention pour evaluer rapidement le niveau de finition attendu."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Galerie" }
        ]}
        actions={
          <>
            <Link href="/realisations" className="btn-secondary">
              Voir les etudes de cas
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

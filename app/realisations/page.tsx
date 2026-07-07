import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { CaseStudyList } from "@/components/phase2/case-study-list";
import { RealisationsVideos } from "@/components/phase2/realisations-videos";
import { InteractiveProcessTimeline } from "@/components/phase2/interactive-process-timeline";

export const metadata = buildMetadata({
  title: "Réalisations",
  description:
    "Études de cas ProClean Empire avec avant/après, problématique, solution, résultat et témoignages clients.",
  path: "/realisations"
});

export default function RealisationsPage() {
  return (
    <>
      <PageHero
        title="Études de cas"
        description="Visualisez des interventions structurées avec preuves avant/après, contexte métier et résultats obtenus."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Réalisations" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/galerie" className="btn-secondary">
              Voir la galerie
            </Link>
          </>
        }
      />
      <CaseStudyList />
      <RealisationsVideos />
      <InteractiveProcessTimeline />
    </>
  );
}

import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { CaseStudyList } from "@/components/phase2/case-study-list";
import { RealisationsVideos } from "@/components/phase2/realisations-videos";
import { InteractiveProcessTimeline } from "@/components/phase2/interactive-process-timeline";

export const metadata = buildMetadata({
  title: "Realisations",
  description:
    "Etudes de cas ProClean Empire avec avant/apres, problematique, solution, resultat et temoignages clients.",
  path: "/realisations"
});

export default function RealisationsPage() {
  return (
    <>
      <PageHero
        title="Etudes de cas"
        description="Visualisez des interventions structurees avec preuves avant/apres, contexte metier et resultats obtenus."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Realisations" }
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
      <RealisationsVideos />
      <CaseStudyList />
      <InteractiveProcessTimeline />
    </>
  );
}

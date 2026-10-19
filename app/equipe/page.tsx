import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { TeamPremiumSection } from "@/components/phase2/team-premium-section";
import { InteractiveProcessTimeline } from "@/components/phase2/interactive-process-timeline";

export const metadata = buildMetadata({
  title: "L'équipe de nettoyage ProClean Empire à Pontoise",
  description:
    "Rencontrez l'équipe de ProClean Empire, entreprise de nettoyage à Pontoise : fondateur, méthodes de travail et contrôle qualité des interventions en Val-d'Oise et à Paris.",
  path: "/equipe"
});

export default function EquipePage() {
  return (
    <>
      <PageHero
        title="Équipe ProClean Empire"
        description="Présentez le visage humain de l&apos;entreprise : fondateur, équipes, valeurs et rigueur opérationnelle."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Équipe" }
        ]}
        actions={
          <>
            <Link href="/contact" className="btn-secondary">
              Échanger avec notre équipe
            </Link>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
          </>
        }
      />
      <TeamPremiumSection />
      <InteractiveProcessTimeline />
    </>
  );
}

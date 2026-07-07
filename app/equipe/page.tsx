import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { TeamPremiumSection } from "@/components/phase2/team-premium-section";
import { InteractiveProcessTimeline } from "@/components/phase2/interactive-process-timeline";

export const metadata = buildMetadata({
  title: "Équipe",
  description:
    "Découvrez le fondateur, les équipes terrain, les méthodes et le processus qualité de ProClean Empire.",
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

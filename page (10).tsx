import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { TeamPremiumSection } from "@/components/phase2/team-premium-section";
import { InteractiveProcessTimeline } from "@/components/phase2/interactive-process-timeline";

export const metadata = buildMetadata({
  title: "Equipe",
  description:
    "Decouvrez le fondateur, les equipes terrain, les methodes et le processus qualite de ProClean Empire.",
  path: "/equipe"
});

export default function EquipePage() {
  return (
    <>
      <PageHero
        title="Equipe ProClean Empire"
        description="Presentez le visage humain de l&apos;entreprise: fondateur, equipes, valeurs et rigueur operationnelle."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Equipe" }
        ]}
        actions={
          <>
            <Link href="/contact" className="btn-secondary">
              Echanger avec notre equipe
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

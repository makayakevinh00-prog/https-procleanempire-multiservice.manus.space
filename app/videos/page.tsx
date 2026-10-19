import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { VideosGrid } from "@/components/phase3/videos-grid";
import { SocialNetworksSection } from "@/components/phase3/social-networks-section";

export const metadata = buildMetadata({
  title: "Vidéos de nettoyage : nos interventions à Pontoise et en Île-de-France",
  description:
    "Vidéos de ProClean Empire, entreprise de nettoyage à Pontoise : présentation, démonstrations et interventions sur le terrain dans le Val-d'Oise et en Île-de-France.",
  path: "/videos"
});

export default function VideosPage() {
  return (
    <>
      <PageHero
        title="Vidéos"
        description="Un espace dédié pour visionner nos contenus réels: présentation, démonstrations, études de cas et coulisses."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Videos" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Prendre rendez-vous
            </Link>
          </>
        }
      />
      <VideosGrid />
      <SocialNetworksSection />
    </>
  );
}

import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { VideosGrid } from "@/components/phase3/videos-grid";
import { SocialNetworksSection } from "@/components/phase3/social-networks-section";

export const metadata = buildMetadata({
  title: "Videos",
  description:
    "Videos ProClean Empire: presentation, demonstrations, conseils et interventions sur le terrain.",
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

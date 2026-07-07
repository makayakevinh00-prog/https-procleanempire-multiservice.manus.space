import { HomeConversionPhase1 } from "@/components/phase1/home-conversion-phase1";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Prestations de proprete pour entreprises exigeantes a Pontoise",
  description:
    "ProClean Empire accompagne bureaux, restaurants, hotels et commerces avec des prestations de proprete planifiees et un suivi qualite rigoureux, basee a Pontoise.",
  path: "/"
});

export default function HomePage() {
  return <HomeConversionPhase1 />;
}

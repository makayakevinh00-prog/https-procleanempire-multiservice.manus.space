import { HomeConversionPhase1 } from "@/components/phase1/home-conversion-phase1";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Nettoyage professionnel premium a Pontoise",
  description:
    "ProClean Empire accompagne bureaux, restaurants, hotels et commerces avec un service de proprete haut de gamme base a Pontoise.",
  path: "/"
});

export default function HomePage() {
  return <HomeConversionPhase1 />;
}

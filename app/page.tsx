import { HomeConversionPhase1 } from "@/components/phase1/home-conversion-phase1";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Prestations de propreté pour entreprises exigeantes à Pontoise",
  description:
    "ProClean Empire accompagne bureaux, restaurants, hôtels et commerces avec des prestations de propreté planifiées et un suivi qualité rigoureux, basée à Pontoise.",
  path: "/"
});

export default function HomePage() {
  return <HomeConversionPhase1 />;
}

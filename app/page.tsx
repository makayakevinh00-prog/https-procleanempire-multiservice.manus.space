import { HomeConversionPhase1 } from "@/components/phase1/home-conversion-phase1";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Entreprise de nettoyage à Pontoise et Cergy (95)",
  description:
    "Entreprise de nettoyage à Pontoise (95) : ménage Airbnb pour conciergeries, nettoyage de bureaux, commerces, restaurants et remise en état à Cergy, Paris et en Île-de-France. Devis sous 24 h.",
  path: "/"
});

export default function HomePage() {
  return <HomeConversionPhase1 />;
}

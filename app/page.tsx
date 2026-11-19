import { ImmersiveLanding } from "@/components/landing/immersive-landing";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Entreprise de nettoyage à Pontoise, Val-d'Oise et Paris",
  description:
    "ProClean Empire, entreprise de nettoyage à Pontoise : nettoyage de bureaux, commerces et remise en état dans le Val-d'Oise et à Paris, ménage Airbnb à Paris. Devis sous 24h.",
  path: "/"
});

export default function HomePage() {
  return <ImmersiveLanding />;
}

import { ImmersiveHome } from "@/components/home/immersive-home";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Entreprise de nettoyage à Pontoise, Val-d'Oise et Paris",
  description:
    "ProClean Empire, entreprise de nettoyage à Pontoise : nettoyage de bureaux, commerces, ménage Airbnb et remise en état dans le Val-d'Oise et à Paris. Devis sous 24h.",
  path: "/"
});

export default function HomePage() {
  return <ImmersiveHome />;
}

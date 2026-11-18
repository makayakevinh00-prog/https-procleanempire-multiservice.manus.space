import { ImmersiveLanding } from "@/components/landing/immersive-landing";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Ménage Airbnb et nettoyage de bureaux – Devis sous 24 h",
  description:
    "Ménage Airbnb entre deux voyageurs, nettoyage de bureaux et de commerces dans le Val-d'Oise et à Paris. Un interlocuteur unique, un devis clair sous 24 h.",
  path: "/offre"
});

export default function OffrePage() {
  return <ImmersiveLanding />;
}

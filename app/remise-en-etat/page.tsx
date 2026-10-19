import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Remise en état et grand nettoyage à Pontoise et en Île-de-France",
  description:
    "Remise en état et grand nettoyage à Pontoise, dans le Val-d'Oise et à Paris : locaux professionnels et logements avant location, fin de bail ou emménagement. Devis sous 24 h.",
  path: "/remise-en-etat"
});

export default function DeepRecoveryPage() {
  return <ServiceLanding slug="remise-en-etat" path="/remise-en-etat" />;
}

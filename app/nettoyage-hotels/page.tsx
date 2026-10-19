import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage d'hôtels à Pontoise et Paris",
  description:
    "Nettoyage d'hôtels à Pontoise, dans le Val-d'Oise et à Paris : chambres, parties communes, réception et sanitaires entretenus selon votre standing. Contrôle qualité à chaque passage. Devis sous 24 h.",
  path: "/nettoyage-hotels"
});

export default function HotelCleaningPage() {
  return <ServiceLanding slug="nettoyage-hotels" path="/nettoyage-hotels" />;
}

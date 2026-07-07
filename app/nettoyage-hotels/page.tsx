import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Entretien hôtelier",
  description:
    "Prestations d'entretien hotelier pilotees avec un controle qualite renforce pour une experience client conforme a votre standing.",
  path: "/nettoyage-hotels"
});

export default function HotelCleaningPage() {
  return <ServiceLanding slug="nettoyage-hotels" path="/nettoyage-hotels" />;
}

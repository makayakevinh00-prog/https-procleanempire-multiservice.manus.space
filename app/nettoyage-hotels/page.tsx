import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Entretien hôtelier",
  description:
    "Prestations d'entretien hôtelier pilotées avec un contrôle qualité renforcé pour une expérience client conforme à votre standing.",
  path: "/nettoyage-hotels"
});

export default function HotelCleaningPage() {
  return <ServiceLanding slug="nettoyage-hotels" path="/nettoyage-hotels" />;
}

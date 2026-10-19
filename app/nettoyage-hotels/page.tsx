import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage d'hôtels à Pontoise et en Île-de-France",
  description:
    "Prestations d'entretien hôtelier pilotées avec un contrôle qualité renforcé pour une expérience client conforme à votre standing.",
  path: "/nettoyage-hotels"
});

export default function HotelCleaningPage() {
  return <ServiceLanding slug="nettoyage-hotels" path="/nettoyage-hotels" />;
}

import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Entretien des espaces hôteliers",
  description:
    "Prestations d'entretien d'hotels et d'espaces d'accueil avec un controle qualite renforce pour votre image client.",
  path: "/nettoyage-hotels"
});

export default function HotelCleaningPage() {
  return <ServiceLanding slug="nettoyage-hotels" path="/nettoyage-hotels" />;
}

import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Entretien des espaces de travail",
  description:
    "Prestations d'entretien des espaces de travail en Île-de-France, pour des environnements conformes aux standards de votre entreprise.",
  path: "/nettoyage-bureaux"
});

export default function OfficeCleaningPage() {
  return <ServiceLanding slug="nettoyage-bureaux" path="/nettoyage-bureaux" />;
}

import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage automobile et avion (detailing) à Pontoise et en Île-de-France",
  description:
    "Prise en charge organisée du detailing intérieur et extérieur pour flottes d'entreprise et véhicules de particuliers exigeants.",
  path: "/nettoyage-automobile"
});

export default function VehicleCleaningPage() {
  return <ServiceLanding slug="nettoyage-automobile" path="/nettoyage-automobile" />;
}

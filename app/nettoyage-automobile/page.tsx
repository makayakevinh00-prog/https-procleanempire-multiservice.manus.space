import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage automobile et avion (detailing) à Pontoise et en Île-de-France",
  description:
    "Nettoyage automobile et avion (detailing) à Pontoise et en Île-de-France : intérieur et extérieur des véhicules de société, flottes et particuliers, sur votre parking ou à domicile. Devis sous 24 h.",
  path: "/nettoyage-automobile"
});

export default function VehicleCleaningPage() {
  return <ServiceLanding slug="nettoyage-automobile" path="/nettoyage-automobile" />;
}

import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage de bureaux",
  description:
    "Service de nettoyage de bureaux en Île-de-France pour maintenir des espaces de travail propres et valorisants.",
  path: "/nettoyage-bureaux"
});

export default function OfficeCleaningPage() {
  return <ServiceLanding slug="nettoyage-bureaux" path="/nettoyage-bureaux" />;
}

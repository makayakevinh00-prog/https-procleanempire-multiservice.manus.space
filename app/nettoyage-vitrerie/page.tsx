import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Entretien de la vitrerie professionnelle",
  description:
    "Entretien de vitrerie interieure et exterieure pour bureaux, commerces et etablissements professionnels.",
  path: "/nettoyage-vitrerie"
});

export default function GlassCleaningPage() {
  return <ServiceLanding slug="nettoyage-vitrerie" path="/nettoyage-vitrerie" />;
}

import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Entretien des surfaces vitrées",
  description:
    "Entretien des surfaces vitrees interieures et exterieures pour bureaux, commerces et etablissements professionnels.",
  path: "/nettoyage-vitrerie"
});

export default function GlassCleaningPage() {
  return <ServiceLanding slug="nettoyage-vitrerie" path="/nettoyage-vitrerie" />;
}

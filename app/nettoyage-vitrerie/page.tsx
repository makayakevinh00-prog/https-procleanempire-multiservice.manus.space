import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage de vitres et vitrines à Pontoise et en Île-de-France",
  description:
    "Entretien des surfaces vitrées intérieures et extérieures pour bureaux, commerces et établissements professionnels.",
  path: "/nettoyage-vitrerie"
});

export default function GlassCleaningPage() {
  return <ServiceLanding slug="nettoyage-vitrerie" path="/nettoyage-vitrerie" />;
}

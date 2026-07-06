import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage vitrerie",
  description:
    "Nettoyage de vitrerie intérieure et extérieure pour bureaux, commerces et établissements professionnels.",
  path: "/nettoyage-vitrerie"
});

export default function GlassCleaningPage() {
  return <ServiceLanding slug="nettoyage-vitrerie" path="/nettoyage-vitrerie" />;
}

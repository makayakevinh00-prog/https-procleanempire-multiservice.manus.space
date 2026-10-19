import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage de vitres et vitrines à Pontoise et en Île-de-France",
  description:
    "Nettoyage de vitres et vitrines à Pontoise, Cergy et Paris : surfaces vitrées intérieures et extérieures de bureaux, commerces et immeubles, en passage régulier ou ponctuel. Devis sous 24 h.",
  path: "/nettoyage-vitrerie"
});

export default function GlassCleaningPage() {
  return <ServiceLanding slug="nettoyage-vitrerie" path="/nettoyage-vitrerie" />;
}

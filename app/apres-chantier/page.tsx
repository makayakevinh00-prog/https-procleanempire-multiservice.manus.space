import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage après travaux à Pontoise et en Île-de-France",
  description:
    "Intervention après chantier pour remettre les locaux en état avant reprise d'activité.",
  path: "/apres-chantier"
});

export default function PostConstructionPage() {
  return <ServiceLanding slug="apres-chantier" path="/apres-chantier" />;
}

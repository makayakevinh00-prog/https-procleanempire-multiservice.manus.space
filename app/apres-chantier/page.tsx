import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Remise en propreté après travaux",
  description:
    "Intervention après chantier pour remettre les locaux en état avant reprise d'activité.",
  path: "/apres-chantier"
});

export default function PostConstructionPage() {
  return <ServiceLanding slug="apres-chantier" path="/apres-chantier" />;
}

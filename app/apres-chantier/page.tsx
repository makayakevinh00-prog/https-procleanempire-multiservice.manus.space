import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage après travaux à Pontoise et en Île-de-France",
  description:
    "Nettoyage après travaux à Pontoise, Cergy et Paris : poussières de chantier, traces de peinture et de plâtre, sols et vitres, pour reprendre l'activité dans des locaux propres. Devis sous 24 h.",
  path: "/apres-chantier"
});

export default function PostConstructionPage() {
  return <ServiceLanding slug="apres-chantier" path="/apres-chantier" />;
}

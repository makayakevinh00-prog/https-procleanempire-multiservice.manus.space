import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Propreté des établissements de restauration",
  description:
    "Prestation pour restaurants avec protocoles adaptés aux exigences d'hygiène, de conformité et de service.",
  path: "/nettoyage-restaurants"
});

export default function RestaurantCleaningPage() {
  return <ServiceLanding slug="nettoyage-restaurants" path="/nettoyage-restaurants" />;
}

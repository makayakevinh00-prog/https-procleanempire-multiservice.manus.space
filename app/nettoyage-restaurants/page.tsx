import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage restaurants",
  description:
    "Prestation de nettoyage pour restaurants avec protocoles adaptés aux exigences d'hygiène et de service.",
  path: "/nettoyage-restaurants"
});

export default function RestaurantCleaningPage() {
  return <ServiceLanding slug="nettoyage-restaurants" path="/nettoyage-restaurants" />;
}

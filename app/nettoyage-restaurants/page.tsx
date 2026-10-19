import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage de restaurants à Pontoise et Paris",
  description:
    "Nettoyage de restaurants à Pontoise, Cergy et Paris : salle, cuisine, sanitaires et sols, avant le service ou après la fermeture, dans le respect des règles d'hygiène. Devis sous 24 h.",
  path: "/nettoyage-restaurants"
});

export default function RestaurantCleaningPage() {
  return <ServiceLanding slug="nettoyage-restaurants" path="/nettoyage-restaurants" />;
}

import { serviceSeo } from "@/lib/content/service-seo";
import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: serviceSeo["nettoyage-restaurants"].metaTitle,
  description: serviceSeo["nettoyage-restaurants"].metaDescription,
  path: "/nettoyage-restaurants"
});

export default function RestaurantCleaningPage() {
  return <ServiceLanding slug="nettoyage-restaurants" path="/nettoyage-restaurants" />;
}

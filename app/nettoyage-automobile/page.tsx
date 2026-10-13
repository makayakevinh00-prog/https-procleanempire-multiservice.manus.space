import { serviceSeo } from "@/lib/content/service-seo";
import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: serviceSeo["nettoyage-automobile"].metaTitle,
  description: serviceSeo["nettoyage-automobile"].metaDescription,
  path: "/nettoyage-automobile"
});

export default function VehicleCleaningPage() {
  return <ServiceLanding slug="nettoyage-automobile" path="/nettoyage-automobile" />;
}

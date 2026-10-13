import { serviceSeo } from "@/lib/content/service-seo";
import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: serviceSeo["nettoyage-commerces"].metaTitle,
  description: serviceSeo["nettoyage-commerces"].metaDescription,
  path: "/nettoyage-commerces"
});

export default function RetailCleaningPage() {
  return <ServiceLanding slug="nettoyage-commerces" path="/nettoyage-commerces" />;
}

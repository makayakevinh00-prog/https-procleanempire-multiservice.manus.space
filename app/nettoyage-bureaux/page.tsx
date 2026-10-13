import { serviceSeo } from "@/lib/content/service-seo";
import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: serviceSeo["nettoyage-bureaux"].metaTitle,
  description: serviceSeo["nettoyage-bureaux"].metaDescription,
  path: "/nettoyage-bureaux"
});

export default function OfficeCleaningPage() {
  return <ServiceLanding slug="nettoyage-bureaux" path="/nettoyage-bureaux" />;
}

import { serviceSeo } from "@/lib/content/service-seo";
import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: serviceSeo["remise-en-etat"].metaTitle,
  description: serviceSeo["remise-en-etat"].metaDescription,
  path: "/remise-en-etat"
});

export default function DeepRecoveryPage() {
  return <ServiceLanding slug="remise-en-etat" path="/remise-en-etat" />;
}

import { serviceSeo } from "@/lib/content/service-seo";
import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: serviceSeo["apres-chantier"].metaTitle,
  description: serviceSeo["apres-chantier"].metaDescription,
  path: "/apres-chantier"
});

export default function PostConstructionPage() {
  return <ServiceLanding slug="apres-chantier" path="/apres-chantier" />;
}

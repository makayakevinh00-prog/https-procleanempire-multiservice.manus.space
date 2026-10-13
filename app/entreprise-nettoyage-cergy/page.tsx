import { buildMetadata } from "@/lib/site";
import { CityLanding } from "@/components/pages/city-landing";
import { getCityPage } from "@/lib/content/cities";

const city = getCityPage("entreprise-nettoyage-cergy")!;

export const metadata = buildMetadata({
  title: city.metaTitle,
  description: city.metaDescription,
  path: "/entreprise-nettoyage-cergy"
});

export default function Page() {
  return <CityLanding slug="entreprise-nettoyage-cergy" />;
}

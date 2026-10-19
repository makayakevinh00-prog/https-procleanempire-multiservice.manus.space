import { LocalPageView, localMetadata } from "@/components/pages/local-page";

export const metadata = localMetadata("menage-airbnb-paris");

export default function Page() {
  return <LocalPageView slug="menage-airbnb-paris" />;
}

import { LocalPageView, localMetadata } from "@/components/pages/local-page";

export const metadata = localMetadata("nettoyage-paris");

export default function Page() {
  return <LocalPageView slug="nettoyage-paris" />;
}

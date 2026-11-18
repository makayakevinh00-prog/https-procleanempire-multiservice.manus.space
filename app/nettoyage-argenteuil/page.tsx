import { LocalPageView, localMetadata } from "@/components/pages/local-page";

export const metadata = localMetadata("nettoyage-argenteuil");

export default function Page() {
  return <LocalPageView slug="nettoyage-argenteuil" />;
}

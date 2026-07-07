import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Remise en état",
  description:
    "Remise en etat de locaux professionnels pour repartir sur une base conforme a vos standards.",
  path: "/remise-en-etat"
});

export default function DeepRecoveryPage() {
  return <ServiceLanding slug="remise-en-etat" path="/remise-en-etat" />;
}

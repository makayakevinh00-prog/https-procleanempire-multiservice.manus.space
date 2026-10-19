import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage de commerces et boutiques à Pontoise, Cergy et en Île-de-France",
  description:
    "Nettoyage de commerces et boutiques à Pontoise, Cergy, Paris et en Île-de-France : surface de vente, vitrine et sanitaires prêts avant l'ouverture. Passages réguliers ou ponctuels. Devis sous 24 h.",
  path: "/nettoyage-commerces"
});

export default function RetailCleaningPage() {
  return <ServiceLanding slug="nettoyage-commerces" path="/nettoyage-commerces" />;
}

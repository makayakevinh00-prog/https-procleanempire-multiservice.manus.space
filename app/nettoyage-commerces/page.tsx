import { buildMetadata } from "@/lib/site";
import { ServiceLanding } from "@/components/pages/service-landing";

export const metadata = buildMetadata({
  title: "Nettoyage de commerces et boutiques à Pontoise, Cergy et en Île-de-France",
  description:
    "Prestations d'entretien pour commerces et points de vente afin de renforcer l'expérience client.",
  path: "/nettoyage-commerces"
});

export default function RetailCleaningPage() {
  return <ServiceLanding slug="nettoyage-commerces" path="/nettoyage-commerces" />;
}

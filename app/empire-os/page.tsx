import { EmpireOsLanding } from "@/components/empire-os/landing";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Empire OS – Logiciel de gestion pour entreprises de nettoyage",
  description:
    "Empire OS réunit demandes, devis, planning, factures et paiements dans un seul outil pour les entreprises de nettoyage et les conciergeries. Accès anticipé : rejoignez la liste d'attente.",
  path: "/empire-os",
});

export default function EmpireOsPage() {
  return <EmpireOsLanding />;
}

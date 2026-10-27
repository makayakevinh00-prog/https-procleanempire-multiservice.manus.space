import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { formatDate, formatEUR, formatHours } from "@/lib/utils";
import { numOrNull } from "@/lib/data";

export default async function ContractsPage() {
  const { data, error } = await createClient()
    .from("contracts").select("*, clients(id, name, is_reserved)").order("status").order("label");
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Contrats récurrents" subtitle={`${data?.length ?? 0} contrat(s)`}
        actions={<Link href="/contrats/new"><Button><Plus className="h-4 w-4" /> Nouveau contrat</Button></Link>} />
      <Card>
        {!data?.length ? <Empty>Aucun contrat.</Empty> : (
          <Table>
            <thead><tr><Th>Client</Th><Th>Contrat</Th><Th>Montant HT</Th><Th>Période</Th><Th>Par passage × fréq.</Th><Th>Heures / sem</Th><Th>Statut</Th></tr></thead>
            <tbody>
              {data.map((k: any) => (
                <Tr key={k.id}>
                  <Td><ClientName id={k.clients.id} name={k.clients.name} reserved={k.clients.is_reserved} /></Td>
                  <Td><Link href={`/contrats/${k.id}`} className="hover:underline">{k.label}</Link></Td>
                  <Td>{k.monthly_amount_ht != null ? `${formatEUR(k.monthly_amount_ht)} / mois` : k.per_visit_amount_ht != null ? `${formatEUR(k.per_visit_amount_ht)} / passage` : "—"}</Td>
                  <Td className="whitespace-nowrap">{k.start_date ? formatDate(k.start_date) : "—"} → {k.end_date ? formatDate(k.end_date) : "—"}</Td>
                  <Td>{k.hours_per_visit != null ? `${k.hours_per_visit} h` : "?"} × {k.visits_per_week != null ? `${k.visits_per_week}/sem` : "?"}</Td>
                  <Td className="font-semibold">{numOrNull(k.weekly_hours) != null ? formatHours(numOrNull(k.weekly_hours)) : <span className="font-normal text-amber-700">à renseigner</span>}</Td>
                  <Td><StatusBadge status={k.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

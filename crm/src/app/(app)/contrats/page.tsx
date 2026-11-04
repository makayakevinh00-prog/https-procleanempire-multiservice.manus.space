import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { contractIssues } from "@/lib/domain/contract-check";
import { WEEKDAYS } from "@/lib/domain/schedule";
import { formatDate, formatEUR, formatHours } from "@/lib/utils";
import { numOrNull } from "@/lib/data";

export default async function ContractsPage({ searchParams }: { searchParams: { filtre?: string } }) {
  const { data, error } = await createClient()
    .from("contracts").select("*, clients(id, name, is_reserved)").order("status").order("label");
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((k: any) => {
    const issues = contractIssues({ ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht), hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) });
    return { k, issues, incomplete: k.status === "actif" && issues.blocking.length + issues.warnings.length > 0 };
  });
  const incompleteCount = rows.filter((r) => r.incomplete).length;
  const shown = searchParams.filtre === "incomplets" ? rows.filter((r) => r.incomplete) : rows;

  return (
    <>
      <PageHeader title="Contrats récurrents" subtitle={`${rows.length} contrat(s)`}
        actions={<Link href="/contrats/new"><Button><Plus className="h-4 w-4" /> Nouveau contrat</Button></Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/contrats" className={`rounded-full border px-3 py-1 text-sm ${!searchParams.filtre ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>Tous</Link>
        <Link href="/contrats?filtre=incomplets" className={`rounded-full border px-3 py-1 text-sm ${searchParams.filtre === "incomplets" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
          Incomplets ({incompleteCount})
        </Link>
      </div>
      {incompleteCount > 0 && !searchParams.filtre && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>{incompleteCount} contrat(s) actif(s) incomplet(s)</b> : sans jours de passage ou durée, ils ne peuvent pas alimenter le planning automatique ni le suivi des heures. Cliquez sur l&apos;alerte d&apos;un contrat pour le compléter.</span>
        </div>
      )}
      <Card>
        {!shown.length ? <Empty>Aucun contrat.</Empty> : (
          <Table>
            <thead><tr><Th>Client</Th><Th>Contrat</Th><Th>Montant HT</Th><Th>Période</Th><Th>Jours · durée</Th><Th>Heures / sem</Th><Th>Statut</Th></tr></thead>
            <tbody>
              {shown.map(({ k, issues, incomplete }) => (
                <Tr key={k.id}>
                  <Td><ClientName id={k.clients.id} name={k.clients.name} reserved={k.clients.is_reserved} /></Td>
                  <Td>
                    <Link href={`/contrats/${k.id}`} className="hover:underline">{k.label}</Link>
                    {incomplete && (
                      <Link href={`/contrats/${k.id}`} className="mt-1 block">
                        <Badge tone={issues.blocking.length ? "red" : "orange"}>⚠ À compléter : {[...issues.blocking, ...issues.warnings].slice(0, 3).join(", ")}{issues.blocking.length + issues.warnings.length > 3 ? "…" : ""}</Badge>
                      </Link>
                    )}
                  </Td>
                  <Td>{k.monthly_amount_ht != null ? `${formatEUR(k.monthly_amount_ht)} / mois` : k.per_visit_amount_ht != null ? `${formatEUR(k.per_visit_amount_ht)} / passage` : <Badge tone="red">à renseigner</Badge>}</Td>
                  <Td className="whitespace-nowrap">{k.start_date ? formatDate(k.start_date) : "—"} → {k.end_date ? formatDate(k.end_date) : "—"}</Td>
                  <Td className="text-xs">
                    {k.weekdays?.length ? WEEKDAYS.filter(([n]) => k.weekdays.includes(n)).map(([, l]) => l).join(" · ") : k.visits_per_week != null ? `${k.visits_per_week}×/sem` : "—"}
                    {k.hours_per_visit != null ? ` · ${k.hours_per_visit} h` : ""}
                    {k.assignee ? <span className="block text-muted-foreground">{k.assignee}</span> : null}
                  </Td>
                  <Td className="font-semibold">{numOrNull(k.weekly_hours) != null ? formatHours(numOrNull(k.weekly_hours)) : <span className="text-xs font-normal text-muted-foreground">—</span>}</Td>
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

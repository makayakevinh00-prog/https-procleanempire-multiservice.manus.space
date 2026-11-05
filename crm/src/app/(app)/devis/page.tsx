import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { formatDate, formatEUR } from "@/lib/utils";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { deleteQuoteAction } from "@/app/actions/quotes";

export default async function QuotesPage({ searchParams }: { searchParams: { statut?: string } }) {
  let query = createClient().from("quotes").select("*, clients(id, name, is_reserved), invoices:invoice_id(status)").order("number", { ascending: false });
  if (searchParams.statut) query = query.eq("status", searchParams.statut);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const tabs = [["", "Tous"], ["brouillon", "Brouillons"], ["envoye", "Envoyés"], ["accepte", "Acceptés"], ["refuse", "Refusés"], ["expire", "Expirés"]];
  return (
    <>
      <PageHeader title="Devis" actions={<Link href="/devis/new"><Button><Plus className="h-4 w-4" /> Nouveau devis</Button></Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([v, l]) => (
          <Link key={v} href={v ? `/devis?statut=${v}` : "/devis"}
            className={`rounded-full border px-3 py-1 text-sm ${(searchParams.statut ?? "") === v ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{l}</Link>
        ))}
      </div>
      <Card>
        {!data?.length ? <Empty>Aucun devis.</Empty> : (
          <Table>
            <thead><tr><Th>N°</Th><Th>Client</Th><Th>Objet</Th><Th>Date</Th><Th className="text-right">HT</Th><Th className="text-right">TTC</Th><Th>Statut</Th><Th></Th></tr></thead>
            <tbody>
              {data.map((q: any) => {
                const toInvoice = q.status === "accepte" && (!q.invoice_id || q.invoices?.status === "annule");
                return (
                  <Tr key={q.id} className={q.clients.is_reserved ? "bg-red-50/60" : ""}>
                    <Td><Link href={`/devis/${q.id}`} className="font-semibold hover:underline">{q.number}</Link></Td>
                    <Td><ClientName id={q.clients.id} name={q.clients.name} reserved={q.clients.is_reserved} /></Td>
                    <Td className="text-muted-foreground">{q.subject}</Td>
                    <Td>{formatDate(q.issue_date)}</Td>
                    <Td className="text-right">{formatEUR(q.total_ht)}</Td>
                    <Td className="text-right">{formatEUR(q.total_ttc)}</Td>
                    <Td className="space-x-1"><StatusBadge status={q.status} />{toInvoice && <Badge tone="orange">À facturer</Badge>}</Td>
                    <Td className="text-right">{(!q.invoice_id || q.invoices?.status === "annule") && (
                      <ConfirmAction action={deleteQuoteAction.bind(null, q.id)} label="Supprimer" variant="ghost" size="sm" className="text-red-700"
                        title={`Supprimer le devis ${q.number} ?`}
                        description={q.status === "accepte" ? "Ce devis est ACCEPTÉ : le supprimer efface la trace de l'acceptation (elle reste dans le journal). Définitif." : "Le devis et ses lignes seront supprimés définitivement (trace dans le journal)."}
                        confirmLabel="Oui, supprimer" reservedName={q.clients.is_reserved ? q.clients.name : null} />
                    )}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { daysBetween, formatDate, formatEUR } from "@/lib/utils";

export default async function InvoicesPage({ searchParams }: { searchParams: { statut?: string } }) {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const settings = await getSettings(supabase);
  let query = supabase.from("invoices").select("*, clients(id, name, is_reserved)").order("created_at", { ascending: false });
  if (searchParams.statut) query = query.eq("status", searchParams.statut);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const tabs = [["", "Toutes"], ["brouillon", "Brouillons"], ["envoye", "Envoyées"], ["en_retard", "En retard"], ["paye", "Payées"], ["annule", "Annulées"]];
  return (
    <>
      <PageHeader title="Factures" subtitle="Toute facture reste en brouillon jusqu'à votre validation manuelle."
        actions={<Link href="/factures/new"><Button><Plus className="h-4 w-4" /> Nouvelle facture</Button></Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([v, l]) => (
          <Link key={v} href={v ? `/factures?statut=${v}` : "/factures"}
            className={`rounded-full border px-3 py-1 text-sm ${(searchParams.statut ?? "") === v ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{l}</Link>
        ))}
      </div>
      <Card>
        {!data?.length ? <Empty>Aucune facture.</Empty> : (
          <Table>
            <thead><tr><Th>N°</Th><Th>Client</Th><Th>Objet</Th><Th>Échéance</Th><Th className="text-right">HT</Th><Th className="text-right">TTC</Th><Th>Relances</Th><Th>Statut</Th></tr></thead>
            <tbody>
              {data.map((i: any) => {
                const lateDays = ["envoye", "en_retard"].includes(i.status) && i.due_date ? daysBetween(i.due_date) : 0;
                return (
                  <Tr key={i.id} className={i.clients.is_reserved ? "bg-red-50/60" : ""}>
                    <Td><Link href={`/factures/${i.id}`} className="font-semibold hover:underline">{i.number ?? "Brouillon"}</Link></Td>
                    <Td><ClientName id={i.clients.id} name={i.clients.name} reserved={i.clients.is_reserved} /></Td>
                    <Td className="text-muted-foreground">{i.subject}</Td>
                    <Td>{formatDate(i.due_date)}{lateDays > 0 && <span className="ml-1 text-xs text-red-700">(+{lateDays} j)</span>}</Td>
                    <Td className="text-right">{formatEUR(i.total_ht)}</Td>
                    <Td className="text-right">{formatEUR(i.total_ttc)}</Td>
                    <Td>{i.reminder_count > 0 ? `${i.reminder_count} · ${formatDate(i.last_reminder_at)}` : "—"}</Td>
                    <Td className="space-x-1">
                      <StatusBadge status={i.status} />
                      {i.status === "en_retard" && lateDays >= settings.unpaid_alert_days && <Badge tone="red">⚠ &gt; {settings.unpaid_alert_days} j</Badge>}
                    </Td>
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

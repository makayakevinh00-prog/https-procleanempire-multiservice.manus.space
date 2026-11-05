import Link from "next/link";
import { CheckCircle2, FilePen, FileText, Plus, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge, ReservedBadge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { deleteQuoteAction } from "@/app/actions/quotes";
import { cn, formatDate, formatEUR } from "@/lib/utils";

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export default async function QuotesPage({ searchParams }: { searchParams: { statut?: string } }) {
  const { data: all, error } = await createClient().from("quotes").select("*, clients(id, name, is_reserved), invoices:invoice_id(status)").order("number", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (all ?? []) as any[];
  const KEYS = ["brouillon", "envoye", "accepte", "refuse", "expire"];
  const current = KEYS.includes(searchParams.statut ?? "") ? searchParams.statut! : "";
  const data = current ? rows.filter((q) => q.status === current) : rows;
  const by = (s: string) => rows.filter((q) => q.status === s);
  const toInvoice = (q: any) => q.status === "accepte" && (!q.invoice_id || q.invoices?.status === "annule");
  const sum = (l: any[]) => l.reduce((a, q) => a + n(q.total_ht), 0);

  const tabs = [
    { href: "/devis", label: "Tous", count: rows.length, active: !current },
    ...[["brouillon", "Brouillons"], ["envoye", "Envoyés"], ["accepte", "Acceptés"], ["refuse", "Refusés"], ["expire", "Expirés"]].map(([k, l]) => ({ href: `/devis?statut=${k}`, label: l, count: by(k).length, active: current === k }))
  ];

  return (
    <>
      <PageHeader title="Devis" subtitle="Préparez, envoyez et suivez vos devis. Un devis accepté peut devenir un contrat puis une facture en un clic."
        actions={<Link href="/devis/new" className={cn(buttonVariants({}))}><Plus className="h-5 w-5" /> Nouveau devis</Link>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Brouillons" value={by("brouillon").length} sub={`${formatEUR(sum(by("brouillon")))} HT`} tone="slate" icon={FilePen} href="/devis?statut=brouillon" />
        <Stat label="En attente de réponse" value={by("envoye").length} sub={`${formatEUR(sum(by("envoye")))} HT`} tone="blue" icon={Send} href="/devis?statut=envoye" />
        <Stat label="Acceptés" value={by("accepte").length} sub={`${formatEUR(sum(by("accepte")))} HT`} tone="green" icon={CheckCircle2} href="/devis?statut=accepte" />
        <Stat label="À facturer" value={rows.filter(toInvoice).length} sub="acceptés sans facture" tone="orange" icon={FileText} />
      </div>

      <Tabs items={tabs} />

      <Card>
        {!data.length ? <Empty icon={FileText} action={<Link href="/devis/new" className={cn(buttonVariants({ size: "sm" }))}>Créer un devis</Link>}>Aucun devis dans cette vue.</Empty> : (
          <Table>
            <thead><tr><Th>N°</Th><Th>Client</Th><Th className="hidden xl:table-cell">Objet</Th><Th className="hidden md:table-cell">Date</Th><Th className="hidden 2xl:table-cell text-right">HT</Th><Th className="text-right">TTC</Th><Th>Statut</Th><Th /></tr></thead>
            <tbody>
              {data.map((q: any) => (
                <Tr key={q.id} className={q.clients.is_reserved ? "bg-red-50/60" : ""}>
                  <Td><Link href={`/devis/${q.id}`} className="font-bold text-slate-900 hover:text-primary hover:underline">{q.number}</Link></Td>
                  <Td>
                    <Link href={`/clients/${q.clients.id}`} className="flex items-center gap-3 hover:underline"><Avatar name={q.clients.name} size="sm" /><span className="font-medium text-slate-800">{q.clients.name}</span></Link>
                    {q.clients.is_reserved && <ReservedBadge className="mt-1" />}
                  </Td>
                  <Td className="hidden max-w-[14rem] truncate text-slate-500 xl:table-cell">{q.subject}</Td>
                  <Td className="hidden whitespace-nowrap md:table-cell">{formatDate(q.issue_date)}</Td>
                  <Td className="hidden whitespace-nowrap text-right text-slate-600 2xl:table-cell">{formatEUR(q.total_ht)}</Td>
                  <Td className="whitespace-nowrap text-right font-bold text-slate-900">{formatEUR(q.total_ttc)}</Td>
                  <Td><div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={q.status} />{toInvoice(q) && <Badge tone="orange">À facturer</Badge>}</div></Td>
                  <Td className="text-right">{(!q.invoice_id || q.invoices?.status === "annule") && (
                    <ConfirmAction action={deleteQuoteAction.bind(null, q.id)} label="Supprimer" variant="ghost" size="sm" className="text-red-700"
                      title={`Supprimer le devis ${q.number} ?`}
                      description={q.status === "accepte" ? "Ce devis est ACCEPTÉ : le supprimer efface la trace de l'acceptation (elle reste dans le journal). Définitif." : "Le devis et ses lignes seront supprimés définitivement (trace dans le journal)."}
                      confirmLabel="Oui, supprimer" reservedName={q.clients.is_reserved ? q.clients.name : null} />
                  )}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

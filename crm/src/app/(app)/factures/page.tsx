import Link from "next/link";
import { AlertTriangle, FilePen, Plus, Receipt, Send, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { ReservedBadge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { deleteDraftAction } from "@/app/actions/invoices";
import { cn, daysBetween, formatDate, formatEUR } from "@/lib/utils";

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export default async function InvoicesPage({ searchParams }: { searchParams: { statut?: string } }) {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const settings = await getSettings(supabase);
  const { data: all, error } = await supabase.from("invoices").select("*, clients(id, name, is_reserved)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (all ?? []) as any[];

  const toSend = (i: any) => i.billing_month && !i.sent_at && ["envoye", "en_retard"].includes(i.status);
  const filters: Record<string, (i: any) => boolean> = {
    a_valider: (i) => i.status === "brouillon", a_envoyer: toSend, envoye: (i) => i.status === "envoye", en_retard: (i) => i.status === "en_retard", paye: (i) => i.status === "paye", annule: (i) => i.status === "annule"
  };
  const current = searchParams.statut && filters[searchParams.statut] ? searchParams.statut : "";
  const data = current ? rows.filter(filters[current]) : rows;
  const count = (k: string) => rows.filter(filters[k]).length;

  const open = rows.filter((i) => ["envoye", "en_retard"].includes(i.status));
  const outstanding = open.reduce((a, i) => a + n(i.total_ttc) - n(i.paid_amount), 0);
  const late = rows.filter(filters.en_retard);
  const drafts = rows.filter(filters.a_valider);
  const month = new Date().toISOString().slice(0, 7);
  const billedMonth = rows.filter((i) => i.status !== "brouillon" && i.status !== "annule" && i.issue_date?.startsWith(month)).reduce((a, i) => a + n(i.total_ht), 0);

  const tabs = [
    { href: "/factures", label: "Toutes", count: rows.length, active: !current },
    { href: "/factures?statut=a_valider", label: "À valider", count: count("a_valider"), active: current === "a_valider" },
    { href: "/factures?statut=a_envoyer", label: "À envoyer", count: count("a_envoyer"), active: current === "a_envoyer" },
    { href: "/factures?statut=envoye", label: "Émises", count: count("envoye"), active: current === "envoye" },
    { href: "/factures?statut=en_retard", label: "En retard", count: count("en_retard"), active: current === "en_retard" },
    { href: "/factures?statut=paye", label: "Payées", count: count("paye"), active: current === "paye" },
    { href: "/factures?statut=annule", label: "Annulées", count: count("annule"), active: current === "annule" }
  ];

  return (
    <>
      <PageHeader title="Factures" subtitle="Les factures créées à la main restent en brouillon jusqu'à votre validation ; les factures mensuelles automatiques suivent les règles de « Facturation automatique »."
        actions={<Link href="/factures/new" className={cn(buttonVariants({}))}><Plus className="h-5 w-5" /> Nouvelle facture</Link>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="À encaisser (TTC)" value={formatEUR(outstanding)} sub={`${open.length} facture(s) ouverte(s)`} tone="orange" icon={Wallet} href="/factures?statut=envoye" />
        <Stat label="En retard" value={late.length} sub={late.length ? formatEUR(late.reduce((a, i) => a + n(i.total_ttc) - n(i.paid_amount), 0)) : "rien en retard"} tone={late.length ? "red" : "green"} icon={AlertTriangle} href="/factures?statut=en_retard" />
        <Stat label="Brouillons à valider" value={drafts.length} sub={formatEUR(drafts.reduce((a, i) => a + n(i.total_ht), 0)) + " HT"} tone="violet" icon={FilePen} href="/factures?statut=a_valider" />
        <Stat label="Facturé ce mois (HT)" value={formatEUR(billedMonth)} tone="green" icon={Send} />
      </div>

      <Tabs items={tabs} />

      <Card>
        {!data.length ? <Empty icon={Receipt} action={<Link href="/factures/new" className={cn(buttonVariants({ size: "sm" }))}>Créer une facture</Link>}>Aucune facture dans cette vue.</Empty> : (
          <Table>
            <thead><tr><Th>N°</Th><Th>Client</Th><Th className="hidden xl:table-cell">Objet</Th><Th className="hidden md:table-cell">Échéance</Th><Th className="hidden 2xl:table-cell text-right">HT</Th><Th className="text-right">TTC</Th><Th>Statut</Th><Th /></tr></thead>
            <tbody>
              {data.map((i: any) => {
                const lateDays = ["envoye", "en_retard"].includes(i.status) && i.due_date ? daysBetween(i.due_date) : 0;
                return (
                  <Tr key={i.id} className={i.clients.is_reserved ? "bg-red-50/60" : ""}>
                    <Td><Link href={`/factures/${i.id}`} className="font-bold text-slate-900 hover:text-primary hover:underline">{i.number ?? "Brouillon"}</Link></Td>
                    <Td>
                      <Link href={`/clients/${i.clients.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar name={i.clients.name} size="sm" /><span className="font-medium text-slate-800">{i.clients.name}</span>
                      </Link>
                      {i.clients.is_reserved && <ReservedBadge className="mt-1" />}
                    </Td>
                    <Td className="hidden max-w-[14rem] truncate text-slate-500 xl:table-cell">{i.subject}</Td>
                    <Td className="hidden whitespace-nowrap md:table-cell">{formatDate(i.due_date)}{lateDays > 0 && <span className="ml-1 text-xs font-semibold text-red-700">+{lateDays} j</span>}</Td>
                    <Td className="hidden whitespace-nowrap text-right text-slate-600 2xl:table-cell">{formatEUR(i.total_ht)}</Td>
                    <Td className="whitespace-nowrap text-right font-bold text-slate-900">{formatEUR(i.total_ttc)}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={i.status} />
                        {i.status === "brouillon" && i.billing_month && <Badge tone="blue">auto</Badge>}
                        {["envoye", "en_retard"].includes(i.status) && !i.sent_at && <Badge tone="orange">non envoyée</Badge>}
                        {i.sent_at && ["envoye", "en_retard"].includes(i.status) && <Badge tone="green">envoyée</Badge>}
                        {i.reminder_count > 0 && i.status !== "paye" && <Badge tone="gray">relancée ×{i.reminder_count}</Badge>}
                        {i.status === "en_retard" && lateDays >= settings.unpaid_alert_days && <Badge tone="red">⚠ &gt; {settings.unpaid_alert_days} j</Badge>}
                      </div>
                    </Td>
                    <Td className="text-right">{i.status === "brouillon" && (
                      <ConfirmAction action={deleteDraftAction.bind(null, i.id)} label="Supprimer" variant="ghost" size="sm" className="text-red-700"
                        title="Supprimer ce brouillon ?" description={`Brouillon de ${formatEUR(i.total_ht)} HT pour ${i.clients.name}. Aucun numéro n'a été consommé : la suppression est sans conséquence comptable (trace dans le journal).`} confirmLabel="Oui, supprimer" />
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

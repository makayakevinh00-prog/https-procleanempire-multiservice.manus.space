import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ClientName, ReservedBanner } from "@/components/crm/client-name";
import { addInteractionAction } from "@/app/actions/clients";
import { formatDate, formatEUR, formatHours } from "@/lib/utils";

const KIND: Record<string, string> = { appel: "📞 Appel", email: "✉️ E-mail", rdv: "📅 RDV", note: "📝 Note", relance: "🔔 Relance", devis: "📄 Devis", facture: "🧾 Facture", autre: "• Autre" };

export default async function ClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: c } = await supabase.from("clients").select("*").eq("id", params.id).maybeSingle();
  if (!c) notFound();

  const [contracts, quotes, invoices, interactions] = await Promise.all([
    supabase.from("contracts").select("*").eq("client_id", c.id).order("created_at"),
    supabase.from("quotes").select("id, number, status, subject, total_ht, invoice_id").eq("client_id", c.id).order("number", { ascending: false }),
    supabase.from("invoices").select("id, number, status, subject, total_ttc, due_date").eq("client_id", c.id).order("created_at", { ascending: false }),
    supabase.from("interactions").select("*").eq("client_id", c.id).order("occurred_at", { ascending: false }).limit(50)
  ]);

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={[c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || undefined}
        actions={<Link href={`/clients/${c.id}/edit`}><Button variant="outline"><Pencil className="h-4 w-4" /> Modifier</Button></Link>}
      />
      {c.is_reserved && <ReservedBanner name={c.name} reason={c.reserved_reason} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Coordonnées</CardTitle><StatusBadge status={c.status} /></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><ClientName name={c.name} reserved={c.is_reserved} link={false} /></div>
            <div>✉️ {c.email ?? "—"}</div>
            <div>📞 {c.phone ?? "—"}</div>
            <div>SIRET : {c.siret ?? "—"}</div>
            {c.notes && <p className="whitespace-pre-wrap rounded-md bg-muted p-3">{c.notes}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Contrats récurrents</CardTitle>
            <Link href={`/contrats/new?client=${c.id}`} className="text-xs font-medium text-primary hover:underline">+ Ajouter</Link></CardHeader>
          {!contracts.data?.length ? <Empty>Aucun contrat.</Empty> : (
            <Table><tbody>
              {contracts.data.map((k) => (
                <Tr key={k.id}>
                  <Td><Link href={`/contrats/${k.id}`} className="font-medium hover:underline">{k.label}</Link></Td>
                  <Td>{k.monthly_amount_ht != null ? `${formatEUR(k.monthly_amount_ht)}/mois` : k.per_visit_amount_ht != null ? `${formatEUR(k.per_visit_amount_ht)}/passage` : "—"}</Td>
                  <Td>{formatHours(k.weekly_hours == null ? null : Number(k.weekly_hours))}/sem</Td>
                  <Td><StatusBadge status={k.status} /></Td>
                </Tr>
              ))}
            </tbody></Table>
          )}
        </Card>

        <Card className="lg:col-span-3 lg:grid lg:grid-cols-2">
          <div>
            <CardHeader><CardTitle>Devis</CardTitle><Link href={`/devis/new?client=${c.id}`} className="text-xs font-medium text-primary hover:underline">+ Nouveau</Link></CardHeader>
            {!quotes.data?.length ? <Empty>Aucun devis.</Empty> : (
              <Table><tbody>{quotes.data.map((q) => (
                <Tr key={q.id}><Td><Link href={`/devis/${q.id}`} className="font-medium hover:underline">{q.number}</Link></Td>
                  <Td className="text-muted-foreground">{q.subject}</Td><Td>{formatEUR(q.total_ht)} HT</Td><Td><StatusBadge status={q.status} /></Td></Tr>
              ))}</tbody></Table>
            )}
          </div>
          <div className="border-t lg:border-l lg:border-t-0">
            <CardHeader><CardTitle>Factures</CardTitle></CardHeader>
            {!invoices.data?.length ? <Empty>Aucune facture.</Empty> : (
              <Table><tbody>{invoices.data.map((i) => (
                <Tr key={i.id}><Td><Link href={`/factures/${i.id}`} className="font-medium hover:underline">{i.number ?? "Brouillon"}</Link></Td>
                  <Td className="text-muted-foreground">{i.subject}</Td><Td>{formatEUR(i.total_ttc)} TTC</Td><Td><StatusBadge status={i.status} /></Td></Tr>
              ))}</tbody></Table>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Historique des interactions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form action={addInteractionAction.bind(null, c.id)} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
              <Field label="Type"><Select name="kind">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Field label="Résumé"><Input name="summary" required placeholder="Ex. : appelé pour confirmer le passage de jeudi" /></Field>
              <Button>Ajouter</Button>
            </form>
            {!interactions.data?.length ? <p className="text-sm text-muted-foreground">Aucune interaction enregistrée.</p> : (
              <ul className="divide-y text-sm">
                {interactions.data.map((i) => (
                  <li key={i.id} className="flex gap-3 py-2">
                    <span className="w-28 shrink-0 text-muted-foreground">{formatDate(i.occurred_at)}</span>
                    <span className="w-24 shrink-0">{KIND[i.kind] ?? i.kind}</span>
                    <span>{i.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { isLargeAmount } from "@/lib/domain/billing";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ClientName, ReservedBanner } from "@/components/crm/client-name";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { convertQuoteAction, setQuoteStatusAction } from "@/app/actions/quotes";
import { formatDate, formatEUR, cn } from "@/lib/utils";

export default async function QuotePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: q } = await supabase.from("quotes")
    .select("*, clients(id, name, is_reserved, reserved_reason), quote_lines(*), invoices:invoice_id(id, number, status)").eq("id", params.id).maybeSingle();
  if (!q) notFound();
  const settings = await getSettings(supabase);
  const c = q.clients;
  const lines = [...q.quote_lines].sort((a: any, b: any) => a.position - b.position);
  const large = isLargeAmount(num(q.total_ht), settings);
  const linked = q.invoices as { id: string; number: string | null; status: string } | null;
  const alreadyInvoiced = !!linked && linked.status !== "annule";
  const reservedName = c.is_reserved ? c.name : null;
  const largeAmount = large ? { totalHt: formatEUR(q.total_ht), threshold: formatEUR(settings.large_amount_threshold_ht) } : null;

  const statusBtn = (status: "envoye" | "accepte" | "refuse", label: string, variant: "outline" | "default" | "destructive" = "outline") => (
    <ConfirmAction action={setQuoteStatusAction.bind(null, q.id, status)} label={label} variant={variant} size="sm"
      title={`${label} ?`} confirmLabel="Confirmer" reservedName={reservedName} />
  );

  return (
    <>
      <PageHeader title={q.number} subtitle={q.subject ?? undefined}
        actions={<>
          <a href={`/api/devis/${q.id}/pdf`} className={cn(buttonVariants({ variant: "outline" }))}><Download className="h-4 w-4" /> PDF</a>
          {!alreadyInvoiced && <Link href={`/devis/${q.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}><Pencil className="h-4 w-4" /> Modifier</Link>}
        </>} />
      {c.is_reserved && <ReservedBanner name={c.name} reason={c.reserved_reason} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Prestations</CardTitle><StatusBadge status={q.status} /></CardHeader>
          <Table>
            <thead><tr><Th>Désignation</Th><Th className="text-right">Qté</Th><Th className="text-right">PU HT</Th><Th className="text-right">TVA</Th><Th className="text-right">Total HT</Th></tr></thead>
            <tbody>{lines.map((l: any) => (
              <Tr key={l.id}><Td>{l.description}</Td><Td className="text-right">{num(l.quantity)}</Td><Td className="text-right">{formatEUR(l.unit_price_ht)}</Td>
                <Td className="text-right">{num(l.vat_rate)} %</Td><Td className="text-right">{formatEUR(num(l.quantity) * num(l.unit_price_ht))}</Td></Tr>
            ))}</tbody>
          </Table>
          <dl className="ml-auto w-full max-w-xs space-y-1 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Total HT</dt><dd>{formatEUR(q.total_ht)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">TVA</dt><dd>{formatEUR(q.total_vat)}</dd></div>
            <div className="flex justify-between border-t pt-1 text-base font-bold"><dt>Total TTC</dt><dd>{formatEUR(q.total_ttc)}</dd></div>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><ClientName id={c.id} name={c.name} reserved={c.is_reserved} /></div>
              <div>Date : {formatDate(q.issue_date)}</div>
              <div>Valable jusqu&apos;au : {formatDate(q.valid_until)}</div>
              {q.notes && <p className="whitespace-pre-wrap rounded-md bg-muted p-3">{q.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {q.status === "brouillon" && statusBtn("envoye", "Marquer envoyé")}
                {["brouillon", "envoye"].includes(q.status) && statusBtn("accepte", "Marquer accepté")}
                {["brouillon", "envoye"].includes(q.status) && statusBtn("refuse", "Marquer refusé")}
              </div>
              {q.status === "accepte" && (alreadyInvoiced ? (
                <p className="text-sm">Facturé : <Link className="font-medium text-primary hover:underline" href={`/factures/${linked!.id}`}>{linked!.number ?? "facture brouillon"}</Link> <StatusBadge status={linked!.status} /></p>
              ) : (
                <ConfirmAction action={convertQuoteAction.bind(null, q.id)} label="Convertir en facture" className="w-full"
                  title="Créer la facture brouillon ?"
                  description="Une facture BROUILLON est créée avec les lignes du devis. Elle ne sera ni numérotée ni envoyée : vous devrez la relire puis la valider manuellement."
                  confirmLabel="Créer le brouillon" reservedName={reservedName} largeAmount={largeAmount} />
              ))}
              {linked?.status === "annule" && <p className="text-xs text-muted-foreground">La facture précédente est annulée : une nouvelle peut être créée.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

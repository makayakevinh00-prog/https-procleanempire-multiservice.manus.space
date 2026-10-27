import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "@/components/crm/document-form";
import { updateQuoteAction } from "@/app/actions/quotes";

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: q } = await supabase.from("quotes").select("*, clients(id, name, is_reserved), quote_lines(*)").eq("id", params.id).maybeSingle();
  if (!q) notFound();
  if (q.invoice_id) redirect(`/devis/${q.id}?error=${encodeURIComponent("Devis déjà facturé : non modifiable.")}`);
  const settings = await getSettings(supabase);
  const lines = [...q.quote_lines].sort((a: any, b: any) => a.position - b.position)
    .map((l: any) => ({ description: l.description, quantity: num(l.quantity), unit_price_ht: num(l.unit_price_ht), vat_rate: num(l.vat_rate) }));
  return (
    <>
      <PageHeader title={`Modifier ${q.number}`} />
      <Card><CardContent>
        <DocumentForm action={updateQuoteAction.bind(null, q.id)} kind="devis" clients={[q.clients]} lockedClientId={q.clients.id}
          defaults={{ subject: q.subject, notes: q.notes, valid_until: q.valid_until, lines }}
          defaultVat={Number(settings.default_vat_rate)} submitLabel="Enregistrer" />
      </CardContent></Card>
    </>
  );
}

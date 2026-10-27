import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "@/components/crm/document-form";
import { updateInvoiceAction } from "@/app/actions/invoices";

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: i } = await supabase.from("invoices").select("*, clients(id, name, is_reserved), invoice_lines(*)").eq("id", params.id).maybeSingle();
  if (!i) notFound();
  if (i.status !== "brouillon") redirect(`/factures/${i.id}?error=${encodeURIComponent("Facture validée : non modifiable.")}`);
  const settings = await getSettings(supabase);
  const lines = [...i.invoice_lines].sort((a: any, b: any) => a.position - b.position)
    .map((l: any) => ({ description: l.description, quantity: num(l.quantity), unit_price_ht: num(l.unit_price_ht), vat_rate: num(l.vat_rate) }));
  return (
    <>
      <PageHeader title="Modifier le brouillon" />
      <Card><CardContent>
        <DocumentForm action={updateInvoiceAction.bind(null, i.id)} kind="facture" clients={[i.clients]} lockedClientId={i.clients.id}
          defaults={{ subject: i.subject, notes: i.notes, lines }} defaultVat={Number(settings.default_vat_rate)} submitLabel="Enregistrer" />
      </CardContent></Card>
    </>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "@/components/crm/document-form";
import { createInvoiceAction } from "@/app/actions/invoices";

export default async function NewInvoicePage({ searchParams }: { searchParams: { client?: string } }) {
  const supabase = createClient();
  const [{ data: clients }, settings] = await Promise.all([
    supabase.from("clients").select("id, name, is_reserved").order("name"), getSettings(supabase)
  ]);
  return (
    <>
      <PageHeader title="Nouvelle facture" subtitle="Créée en brouillon, sans numéro. Le numéro F-AAAA-xxx est attribué à la validation." />
      <Card><CardContent>
        <DocumentForm action={createInvoiceAction} kind="facture" clients={clients ?? []} defaultClientId={searchParams.client}
          defaultVat={Number(settings.default_vat_rate)} submitLabel="Créer le brouillon" />
      </CardContent></Card>
    </>
  );
}

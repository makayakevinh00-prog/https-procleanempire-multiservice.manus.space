import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "@/components/crm/document-form";
import { createQuoteAction } from "@/app/actions/quotes";

export default async function NewQuotePage({ searchParams }: { searchParams: { client?: string } }) {
  const supabase = createClient();
  const [{ data: clients }, settings] = await Promise.all([
    supabase.from("clients").select("id, name, is_reserved").order("name"), getSettings(supabase)
  ]);
  return (
    <>
      <PageHeader title="Nouveau devis" subtitle="Le numéro DEV-xxx est attribué automatiquement." />
      <Card><CardContent>
        <DocumentForm action={createQuoteAction} kind="devis" clients={clients ?? []} defaultClientId={searchParams.client}
          defaultVat={Number(settings.default_vat_rate)} submitLabel="Créer le devis" />
      </CardContent></Card>
    </>
  );
}

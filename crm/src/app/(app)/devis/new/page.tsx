import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { loadServices } from "@/lib/services";
import { addDays, parisToday } from "@/lib/domain/dates";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "@/components/crm/document-form";
import { createQuoteAction } from "@/app/actions/quotes";

export default async function NewQuotePage({ searchParams }: { searchParams: { client?: string } }) {
  const supabase = createClient();
  const [{ data: clients }, settings, services] = await Promise.all([
    supabase.from("clients").select("id, name, is_reserved").order("name"), getSettings(supabase), loadServices(supabase)
  ]);
  return (
    <>
      <PageHeader title="Nouveau devis" subtitle="Choisissez une prestation du catalogue : désignation et prix se remplissent tout seuls." />
      <Card><CardContent>
        <DocumentForm action={createQuoteAction} kind="devis" clients={clients ?? []} defaultClientId={searchParams.client}
          defaults={{ valid_until: addDays(parisToday(), Number(settings.quote_default_validity_days ?? 30)) }}
          defaultVat={Number(settings.default_vat_rate)} services={services} submitLabel="Créer le devis" />
      </CardContent></Card>
    </>
  );
}

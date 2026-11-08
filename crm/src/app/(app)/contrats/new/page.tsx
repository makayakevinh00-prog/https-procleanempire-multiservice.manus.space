import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "@/components/crm/contract-form";
import { ACTIVITY, isActivity } from "@/lib/domain/activity";
import { createContractAction } from "@/app/actions/contracts";

export default async function NewContractPage({ searchParams }: { searchParams: { client?: string; activite?: string } }) {
  const supabase = createClient();
  const [{ data: clients }, { data: staff }] = await Promise.all([
    supabase.from("clients").select("id, name, is_reserved").order("name"),
    supabase.from("staff").select("id, full_name").eq("active", true).order("full_name")
  ]);
  return (
    <>
      <PageHeader title="Nouveau contrat" subtitle={isActivity(searchParams.activite) ? `Activité : ${ACTIVITY[searchParams.activite].label}` : undefined} />
      <Card><CardContent>
        <ContractForm action={createContractAction} clients={clients ?? []} defaultClient={searchParams.client} defaultActivity={isActivity(searchParams.activite) ? searchParams.activite : undefined} staff={staff ?? []} submitLabel="Créer le contrat" />
      </CardContent></Card>
    </>
  );
}

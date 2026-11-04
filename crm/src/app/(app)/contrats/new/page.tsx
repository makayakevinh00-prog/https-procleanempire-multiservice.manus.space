import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "@/components/crm/contract-form";
import { createContractAction } from "@/app/actions/contracts";

export default async function NewContractPage({ searchParams }: { searchParams: { client?: string } }) {
  const supabase = createClient();
  const [{ data: clients }, { data: staff }] = await Promise.all([
    supabase.from("clients").select("id, name, is_reserved").order("name"),
    supabase.from("staff").select("id, full_name").eq("active", true).order("full_name")
  ]);
  return (
    <>
      <PageHeader title="Nouveau contrat" />
      <Card><CardContent>
        <ContractForm action={createContractAction} clients={clients ?? []} defaultClient={searchParams.client} staff={staff ?? []} submitLabel="Créer le contrat" />
      </CardContent></Card>
    </>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "@/components/crm/contract-form";
import { createContractAction } from "@/app/actions/contracts";

export default async function NewContractPage({ searchParams }: { searchParams: { client?: string } }) {
  const { data: clients } = await createClient().from("clients").select("id, name, is_reserved").order("name");
  return (
    <>
      <PageHeader title="Nouveau contrat" />
      <Card><CardContent>
        <ContractForm action={createContractAction} clients={clients ?? []} defaultClient={searchParams.client} submitLabel="Créer le contrat" />
      </CardContent></Card>
    </>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/components/crm/client-form";
import { updateClientAction } from "@/app/actions/clients";
import type { Client } from "@/lib/domain/types";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const { data } = await createClient().from("clients").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={`Modifier — ${data.name}`} />
      <Card><CardContent>
        <ClientForm action={updateClientAction.bind(null, params.id)} client={data as unknown as Client} submitLabel="Enregistrer" />
      </CardContent></Card>
    </>
  );
}

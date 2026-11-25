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
  // « Même entreprise que » : proposé seulement quand la base connaît le lien entre fiches.
  const linkable = "same_as" in data;
  const others = linkable ? ((await createClient().from("clients").select("id, name").neq("id", params.id).order("name")).data ?? []) : undefined;
  return (
    <>
      <PageHeader title={`Modifier — ${data.name}`} />
      <Card><CardContent>
        <ClientForm action={updateClientAction.bind(null, params.id)} client={data as unknown as Client} submitLabel="Enregistrer" others={others} />
      </CardContent></Card>
    </>
  );
}

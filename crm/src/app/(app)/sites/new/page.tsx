import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SiteForm } from "@/components/crm/site-form";

export default async function NewSitePage({ searchParams }: { searchParams: { client?: string } }) {
  const { data: clients } = await createClient().from("clients").select("id, name").neq("status", "inactif").order("name");
  return (
    <>
      <PageHeader title="Nouveau site" subtitle="Un lieu où l'équipe intervient (bureaux, logement, local…)." />
      <Card><CardContent><SiteForm clients={clients ?? []} defaultClient={searchParams.client} /></CardContent></Card>
    </>
  );
}

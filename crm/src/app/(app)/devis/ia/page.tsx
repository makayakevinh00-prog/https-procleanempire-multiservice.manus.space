import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { QuoteAi } from "@/components/crm/quote-ai";

export const dynamic = "force-dynamic";
export const metadata = { title: "Devis avec l'IA" };

export default async function QuoteAiPage() {
  const { data } = await createClient().from("clients").select("id, name").neq("status", "inactif").order("name");
  return (
    <>
      <PageHeader title="Devis avec l'IA" subtitle="Photographiez le site : l'IA estime le travail, l'équipe, les produits à prévoir et ce qu'il faut demander au client." />
      <QuoteAi clients={(data ?? []) as { id: string; name: string }[]} />
    </>
  );
}

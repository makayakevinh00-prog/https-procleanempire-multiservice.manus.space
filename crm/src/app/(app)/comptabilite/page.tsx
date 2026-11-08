import { createClient } from "@/lib/supabase/server";
import { monthOf, parisToday } from "@/lib/domain/dates";
import { PageHeader } from "@/components/crm/page-header";
import { AccountingView, type ComptaData } from "@/components/crm/accounting-view";

export const dynamic = "force-dynamic";

/** Espace comptable du patron. Les chiffres viennent de compta_data(), la même source que l'accès de son comptable. */
export default async function AccountingPage({ searchParams }: { searchParams: { mois?: string } }) {
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mois ?? "") ? searchParams.mois! : monthOf(parisToday());
  const { data, error } = await createClient().rpc("compta_data", { p_month: month });
  if (error || !data) throw new Error(error?.message ?? "Comptabilité indisponible");
  return (
    <>
      <PageHeader title="Comptabilité" subtitle="Les chiffres du mois et les exports pour votre expert-comptable. Lecture seule : rien n'est modifié ici." />
      <AccountingView data={data as ComptaData} basePath="/comptabilite" owner />
    </>
  );
}

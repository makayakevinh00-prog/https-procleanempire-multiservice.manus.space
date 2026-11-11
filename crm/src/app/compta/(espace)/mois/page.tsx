import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewAccounting, isOwner } from "@/lib/auth";
import { monthOf, parisToday } from "@/lib/domain/dates";
import { AccountingView, type ComptaData } from "@/components/crm/accounting-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espace comptable" };

export default async function ComptaPage({ searchParams }: { searchParams: { mois?: string } }) {
  if (!(await canViewAccounting())) redirect("/compta/activer");
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mois ?? "") ? searchParams.mois! : monthOf(parisToday());
  const { data, error } = await createClient().rpc("compta_data", { p_month: month });
  if (error || !data) throw new Error("Comptabilité indisponible");
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Comptabilité</h1>
      <p className="mb-5 max-w-3xl text-[15px] text-muted-foreground">Factures émises, TVA collectée, virements reçus et paiements fournisseurs, mois par mois, avec exports CSV et FEC.</p>
      <AccountingView data={data as ComptaData} basePath="/compta/mois" owner={await isOwner()} />
    </>
  );
}

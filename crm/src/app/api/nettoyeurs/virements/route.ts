import { isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/domain/accounting";

export const dynamic = "force-dynamic";

/** Fichier de virements des paiements à régler (nom, IBAN, montant, référence) : à ouvrir dans Qonto. Réservé au patron : contient des IBAN. */
export async function GET() {
  if (!(await isOwner())) return new Response("Accès refusé", { status: 403 });
  const { data, error } = await createClient().from("cleaning_payouts").select("amount, period_start, period_end, cleaners(full_name, iban)").eq("status", "a_payer").order("created_at");
  if (error) return new Response("Erreur de lecture", { status: 500 });
  const rows = ((data ?? []) as any[]).map((p) => [p.cleaners?.full_name ?? "", p.cleaners?.iban ?? "IBAN MANQUANT", Number(p.amount), `ProClean menages ${String(p.period_start).slice(5)} au ${String(p.period_end).slice(5)}`]);
  return new Response(toCsv(["Bénéficiaire", "IBAN", "Montant (EUR)", "Référence"], rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="virements-nettoyeurs.csv"', "cache-control": "no-store" } });
}

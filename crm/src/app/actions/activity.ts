"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, str } from "@/lib/data";
import { contractActivity, isActivity } from "@/lib/domain/activity";
import { monthlyOf } from "@/lib/activity-data";

/** Enregistre la famille DEVINÉE des contrats qui n'en ont pas encore. Ne touche jamais une famille déjà choisie. */
export async function classifyContractsAction() {
  await requireOwner();
  const sb = createClient();
  const { data, error } = await sb.from("contracts").select("id, label, terms, activity, monthly_amount_ht, per_visit_amount_ht, visits_per_week, client_id, clients(name)").is("activity", null);
  if (error) flash("/contrats", "error", dbMessage(error));
  let n = 0;
  for (const k of (data ?? []) as any[]) {
    const a = contractActivity({ clientId: k.client_id, activity: null, label: k.label, terms: k.terms, clientName: k.clients?.name ?? null, monthly: monthlyOf(k) });
    const { error: e } = await sb.from("contracts").update({ activity: a }).eq("id", k.id).is("activity", null);
    if (e) flash("/contrats", "error", dbMessage(e));
    n++;
  }
  revalidatePath("/contrats"); revalidatePath("/activites");
  flash("/contrats", "ok", n ? `${n} contrat(s) classé(s) d'après leur intitulé. Corrigez-en un à tout moment dans sa fiche.` : "Tous les contrats ont déjà une famille.");
}

/** Change la famille d'une facture (sinon elle suit celle des contrats du client). `activity` vide = retour à la déduction automatique. */
export async function setInvoiceActivityAction(invoiceId: string, fd: FormData) {
  await requireOwner();
  const back = `/factures/${invoiceId}`;
  const v = str(fd, "activity");
  if (v && !isActivity(v)) flash(back, "error", "Famille inconnue.");
  const { error } = await createClient().from("invoices").update({ activity: v || null }).eq("id", invoiceId);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(back); revalidatePath("/factures"); revalidatePath("/activites");
  flash(back, "ok", v ? "Famille enregistrée." : "Famille automatique rétablie.");
}

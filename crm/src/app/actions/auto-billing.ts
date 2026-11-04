"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { planMonthlyInvoices } from "@/lib/domain/billing-plan";
import { parisToday } from "@/lib/domain/dates";
import { dbMessage, flash } from "@/lib/data";

/** Prépare MAINTENANT les factures brouillon du mois (jamais validées ni envoyées ici). */
export async function generateDraftsNowAction(month: string) {
  const sb = automationClient();
  let secret: string;
  try { secret = automationSecret(); } catch (e) { flash("/facturation-auto", "error", (e as Error).message); }
  const { data, error } = await sb.rpc("automation_month_data", { p_secret: secret!, p_month: month });
  if (error) flash("/facturation-auto", "error", error.message);
  const plan = planMonthlyInvoices({
    month, today: parisToday(), settings: { ...data.settings, auto_invoicing_start_month: "2000-01" }, clients: data.clients,
    contracts: data.contracts, interventions: data.interventions, invoicedClientIds: data.invoiced_clients
  });
  let created = 0;
  for (const p of plan) {
    const r = await sb.rpc("automation_create_invoice", {
      p_secret: secret!, p_client_id: p.clientId, p_month: month, p_subject: p.subject, p_lines: p.lines, p_intervention_ids: p.interventionIds, p_notes: null
    });
    if (r.error) flash("/facturation-auto", "error", `${p.clientName} : ${r.error.message}`);
    created++;
  }
  revalidatePath("/factures");
  revalidatePath("/facturation-auto");
  flash("/facturation-auto", "ok", created ? `${created} facture(s) brouillon préparée(s) : relisez-les dans « Factures » puis validez-les.` : "Rien à facturer pour ce mois (ou déjà préparé).");
}

/** Active / désactive l'envoi automatique pour tous les clients (contacts réservés toujours exclus). */
export async function setAutoSendAllAction(on: boolean) {
  const { data, error } = await createClient().from("clients").update({ auto_send_invoices: on }).eq("is_reserved", false).neq("status", "inactif").select("id");
  if (error) flash("/facturation-auto", "error", dbMessage(error));
  revalidatePath("/facturation-auto");
  flash("/facturation-auto", "ok", on ? `Envoi automatique activé pour ${data?.length ?? 0} client(s) (contacts réservés exclus).` : "Envoi automatique désactivé pour tous les clients.");
}

"use server";

import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { planMonthlyInvoices } from "@/lib/domain/billing-plan";
import { parisToday } from "@/lib/domain/dates";
import { dbMessage, flash, getSettings } from "@/lib/data";
import { mailConfigured, sendMail } from "@/lib/mail";
import { renderPdf } from "@/lib/pdf/document";
import { invoiceEmail } from "@/lib/mail-templates";
import { logEmail } from "@/lib/email-log";

/** Prépare MAINTENANT les factures brouillon du mois (jamais validées ni envoyées ici). */
export async function generateDraftsNowAction(month: string) {
  await requireOwner();
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
  await requireOwner();
  const { data, error } = await createClient().from("clients").update({ auto_send_invoices: on }).eq("is_reserved", false).neq("status", "inactif").select("id");
  if (error) flash("/facturation-auto", "error", dbMessage(error));
  revalidatePath("/facturation-auto");
  flash("/facturation-auto", "ok", on ? `Envoi automatique activé pour ${data?.length ?? 0} client(s) (contacts réservés exclus).` : "Envoi automatique désactivé pour tous les clients.");
}

/** Envoie à l'adresse de notification un e-mail identique à celui d'une facture (PDF d'exemple) pour vérifier toute la chaîne. */
export async function sendTestEmailAction() {
  await requireOwner();
  const supabase = createClient();
  const settings = await getSettings(supabase);
  const to = settings.notify_email || settings.company_email;
  if (!to) flash("/facturation-auto", "error", "Aucune adresse de notification : renseignez-la dans Paramètres.");
  if (!mailConfigured()) flash("/facturation-auto", "error", "Clé d'envoi d'e-mails absente : ajoutez RESEND_API_KEY dans les variables Vercel du projet CRM.");
  const bytes = await renderPdf({
    kind: "facture", number: "EXEMPLE-001", status: "envoye", issueDate: new Date().toISOString().slice(0, 10), dueOrValidUntil: null,
    subject: "Facture d'exemple (test d'envoi)", notes: "Ceci est un test : aucune facture réelle n'a été créée.",
    client: { name: "Client d'exemple", address: "1 rue de l'Exemple", postal_code: "95300", city: "Pontoise", siret: null, email: to! },
    lines: [{ description: "Entretien mensuel — exemple", quantity: 1, unit_price_ht: 100, vat_rate: 20 }], totals: { ht: 100, vat: 20, ttc: 120 }
  }, settings);
  const m = invoiceEmail({ company: settings.company_name, phone: settings.company_phone, number: "EXEMPLE-001", totalTtc: "120,00 €", period: "test", iban: settings.company_iban });
  const res = await sendMail({ to: to!, subject: `[TEST] ${m.subject}`, text: m.text, html: m.html, attachment: { filename: "EXEMPLE-001.pdf", bytes } });
  await logEmail(supabase, { kind: "test", to: to!, subject: `[TEST] ${m.subject}`, ok: res.sent, error: res.sent ? undefined : res.reason });
  if (!res.sent) flash("/facturation-auto", "error", `Test échoué : ${res.reason}`);
  flash("/facturation-auto", "ok", `E-mail de test envoyé à ${to} (avec un PDF d'exemple). Vérifiez votre boîte de réception et vos courriers indésirables.`);
}

export async function toggleClientAutoSendAction(clientId: string, on: boolean) {
  await requireOwner();
  const { error } = await createClient().from("clients").update({ auto_send_invoices: on }).eq("id", clientId).eq("is_reserved", false);
  if (error) flash("/facturation-auto", "error", dbMessage(error));
  revalidatePath("/facturation-auto");
  flash("/facturation-auto", "ok", on ? "Envoi automatique activé pour ce client." : "Envoi automatique désactivé pour ce client.");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, str } from "@/lib/data";
import { parseLines, requireReservedAck } from "@/lib/action-helpers";
import { buildPdf } from "@/lib/pdf/load";
import { sendMail } from "@/lib/mail";
import { quoteEmail } from "@/lib/mail-templates";
import { getSettings, num } from "@/lib/data";
import { isLargeAmount } from "@/lib/domain/billing";
import { logEmail } from "@/lib/email-log";
import { quoteFollowupEmail } from "@/lib/mail-templates";
import { formatEUR, formatDate } from "@/lib/utils";
import { contractIssues } from "@/lib/domain/contract-check";

export async function createQuoteAction(fd: FormData) {
  const back = "/devis/new";
  const clientId = str(fd, "client_id");
  if (!clientId) flash(back, "error", "Choisissez un client.");
  const lines = parseLines(fd, back);
  await requireReservedAck(clientId!, fd, back);

  const supabase = createClient();
  const { data: q, error } = await supabase.from("quotes").insert({
    client_id: clientId, subject: str(fd, "subject"), notes: str(fd, "notes"), valid_until: str(fd, "valid_until")
  }).select("id").single();
  if (error) flash(back, "error", dbMessage(error));

  const { error: le } = await supabase.from("quote_lines").insert(lines.map((l, position) => ({ ...l, position, quote_id: q!.id })));
  if (le) {
    await supabase.from("quotes").delete().eq("id", q!.id); // pas de devis vide à moitié créé
    flash(back, "error", dbMessage(le));
  }
  revalidatePath("/devis");
  flash(`/devis/${q!.id}`, "ok", "Devis créé.");
}

export async function updateQuoteAction(id: string, fd: FormData) {
  const back = `/devis/${id}/edit`;
  const supabase = createClient();
  const { data: cur } = await supabase.from("quotes").select("status, invoice_id, client_id").eq("id", id).single();
  if (cur?.invoice_id) flash(`/devis/${id}`, "error", "Ce devis est déjà facturé : il n'est plus modifiable.");
  const lines = parseLines(fd, back);
  await requireReservedAck(cur!.client_id, fd, back);

  const { error } = await supabase.from("quotes").update({
    subject: str(fd, "subject"), notes: str(fd, "notes"), valid_until: str(fd, "valid_until")
  }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  await supabase.from("quote_lines").delete().eq("quote_id", id);
  const { error: le } = await supabase.from("quote_lines").insert(lines.map((l, position) => ({ ...l, position, quote_id: id })));
  if (le) flash(back, "error", `Lignes non enregistrées : ${dbMessage(le)}`);
  revalidatePath("/devis");
  flash(`/devis/${id}`, "ok", "Devis mis à jour.");
}

export async function setQuoteStatusAction(id: string, status: "envoye" | "accepte" | "refuse" | "brouillon" | "expire", fd: FormData) {
  const back = `/devis/${id}`;
  const supabase = createClient();
  const { data: q } = await supabase.from("quotes").select("client_id, invoice_id").eq("id", id).single();
  await requireReservedAck(q!.client_id, fd, back);
  if (q?.invoice_id && status !== "accepte") flash(back, "error", "Devis déjà facturé : statut figé.");
  const patch: Record<string, unknown> = { status };
  if (status === "envoye") patch.sent_at = new Date().toISOString();
  if (status === "accepte") patch.accepted_at = new Date().toISOString();
  const { error } = await supabase.from("quotes").update(patch).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath("/devis");
  flash(back, "ok", "Statut du devis mis à jour.");
}

/** Crée une facture BROUILLON. La validation reste manuelle sur la facture (règle 2). */
export async function convertQuoteAction(id: string, fd: FormData) {
  const back = `/devis/${id}`;
  const { data, error } = await createClient().rpc("convert_quote_to_invoice", {
    p_quote_id: id, p_ack_large: checked(fd, "ack_large"), p_ack_reserved: checked(fd, "ack_reserved")
  });
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath("/devis");
  revalidatePath("/factures");
  flash(`/factures/${data}`, "ok", "Facture brouillon créée — à relire puis valider manuellement.");
}

/** Envoie le devis (PDF joint) par e-mail puis le passe en « envoyé ». */
export async function sendQuoteEmailAction(id: string, fd: FormData) {
  const back = `/devis/${id}`;
  const supabase = createClient();
  const { data: q } = await supabase.from("quotes").select("*, clients(name, email, is_reserved)").eq("id", id).maybeSingle();
  if (!q) flash("/devis", "error", "Devis introuvable.");
  const settings = await getSettings(supabase);
  if (q.clients.is_reserved && !checked(fd, "ack_reserved")) flash(back, "error", `Contact réservé (${q.clients.name}) : confirmation explicite du patron requise.`);
  if (isLargeAmount(num(q.total_ht), settings) && !checked(fd, "ack_large")) flash(back, "error", `Montant ${formatEUR(q.total_ht)} HT au-dessus du seuil d'alerte : confirmation requise.`);
  const to = str(fd, "to") ?? q.clients.email;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) flash(back, "error", "Adresse e-mail du destinataire manquante ou invalide.");
  const pdf = await buildPdf("devis", id, { sent: true });
  if (!pdf) flash(back, "error", "PDF introuvable.");
  const mail = quoteEmail({ company: settings.company_name, phone: settings.company_phone, clientName: q.clients.name, number: q.number, subject: q.subject, totalTtc: formatEUR(q.total_ttc), validUntil: q.valid_until ? formatDate(q.valid_until) : null });
  const res = await sendMail({ to: to!, subject: mail.subject, text: mail.text, html: mail.html, attachment: { filename: pdf!.filename, bytes: pdf!.bytes } });
  await logEmail(supabase, { kind: "devis", to: to!, subject: mail.subject, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "quote", entityId: id });
  if (!res.sent) flash(back, "error", `Le devis n'a PAS été envoyé : ${res.reason}.`);
  await supabase.from("quotes").update({ status: q.status === "brouillon" ? "envoye" : q.status, sent_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("interactions").insert({ client_id: q.client_id, kind: "devis", summary: `Devis ${q.number} envoyé par e-mail à ${to}` });
  revalidatePath("/devis");
  flash(back, "ok", `Devis ${q.number} envoyé à ${to}.`);
}

/** Relance manuelle immédiate d'un devis envoyé (ne dépend pas du délai automatique). */
export async function followupQuoteNowAction(id: string, fd: FormData) {
  const back = `/devis/${id}`;
  const supabase = createClient();
  const { data: q } = await supabase.from("quotes").select("*, clients(name, email, is_reserved)").eq("id", id).maybeSingle();
  if (!q) flash("/devis", "error", "Devis introuvable.");
  if (q.clients.is_reserved && !checked(fd, "ack_reserved")) flash(back, "error", `Contact réservé (${q.clients.name}) : confirmation explicite du patron requise.`);
  if (!q.clients.email) flash(back, "error", "Le client n'a pas d'adresse e-mail.");
  const settings = await getSettings(supabase);
  const level = (q.followup_count ?? 0) + 1;
  const mail = quoteFollowupEmail({ company: settings.company_name, phone: settings.company_phone, number: q.number, totalTtc: formatEUR(q.total_ttc), validUntil: q.valid_until ? formatDate(q.valid_until) : null, level });
  const res = await sendMail({ to: q.clients.email, subject: mail.subject, text: mail.text, html: mail.html });
  await logEmail(supabase, { kind: "relance_devis", to: q.clients.email, subject: mail.subject, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "quote", entityId: id });
  if (!res.sent) flash(back, "error", `Relance non envoyée : ${res.reason}.`);
  await supabase.from("quotes").update({ followup_count: level, followup_sent_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("interactions").insert({ client_id: q.client_id, kind: "devis", summary: `Relance n°${level} du devis ${q.number} (manuelle)` });
  revalidatePath("/devis");
  flash(back, "ok", `Relance envoyée à ${q.clients.email}.`);
}

/**
 * Devis accepté → contrat (son site est créé par la base). Action volontaire du patron : jamais automatique.
 * Le contrat reste « en cours » ; le message indique exactement ce qui manque pour l'activer.
 */
export async function createContractFromQuoteAction(id: string, fd: FormData) {
  const back = `/devis/${id}`;
  const supabase = createClient();
  const { data: q } = await supabase.from("quotes").select("number, subject, status, client_id, contract_id, total_ht").eq("id", id).maybeSingle();
  if (!q) flash(back, "error", "Devis introuvable.");
  await requireReservedAck(q!.client_id, fd, back);
  if (q!.status !== "accepte") flash(back, "error", "Seul un devis accepté peut devenir un contrat.");
  if (q!.contract_id) flash(`/contrats/${q!.contract_id}`, "error", "Ce devis a déjà un contrat.");
  const row = {
    client_id: q!.client_id, label: q!.subject ?? `Prestation ${q!.number}`, billing_mode: "mensuel" as const,
    status: "en_cours", terms: `Issu du devis ${q!.number} (${formatEUR(q!.total_ht)} HT)`, notes: `Créé depuis le devis ${q!.number}.`
  };
  const { data: k, error } = await supabase.from("contracts").insert(row).select("id").single();
  if (error) flash(back, "error", dbMessage(error));
  const { error: e2 } = await supabase.from("quotes").update({ contract_id: k!.id }).eq("id", id);
  if (e2) flash(back, "error", dbMessage(e2));
  const { blocking } = contractIssues({ ...row, weekdays: null, start_time: null, hours_per_visit: null, visits_per_week: null, monthly_amount_ht: null, per_visit_amount_ht: null, start_date: null, end_date: null, assignee: null, site_address: null, status: "actif" } as any);
  revalidatePath("/devis"); revalidatePath("/contrats"); revalidatePath("/sites"); revalidatePath("/", "layout");
  flash(`/contrats/${k!.id}`, "ok", `Contrat créé depuis ${q!.number}, avec son site. Pour l'activer et générer les missions, renseignez : ${blocking.length ? blocking.join(", ") : "rien de plus"}.`);
}

/**
 * Supprime un devis. Refusé s'il a déjà donné une facture encore valable (il faut d'abord l'annuler).
 * Contact réservé : confirmation explicite. La ligne complète reste consultable dans le journal des modifications.
 */
export async function deleteQuoteAction(id: string, fd: FormData) {
  const back = `/devis/${id}`;
  const supabase = createClient();
  const { data: q } = await supabase.from("quotes").select("number, client_id, status, invoice_id, invoices:invoice_id(status, number)").eq("id", id).maybeSingle();
  if (!q) flash("/devis", "error", "Devis introuvable.");
  await requireReservedAck(q!.client_id, fd, back);
  const inv = q!.invoices as unknown as { status: string; number: string | null } | null;
  if (q!.invoice_id && inv && inv.status !== "annule") {
    flash(back, "error", `Ce devis a donné la facture ${inv.number ?? "(brouillon)"} : supprimez ou annulez d'abord la facture.`);
  }
  const { error: le } = await supabase.from("quote_lines").delete().eq("quote_id", id);
  if (le) flash(back, "error", dbMessage(le));
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath("/devis"); revalidatePath("/", "layout");
  flash("/devis", "ok", `Devis ${q!.number} supprimé.`);
}

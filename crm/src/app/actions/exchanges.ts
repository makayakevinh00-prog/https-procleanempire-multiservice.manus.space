"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, getSettings, num, str } from "@/lib/data";
import { requireReservedAck } from "@/lib/action-helpers";
import { sendMail } from "@/lib/mail";
import { logEmail } from "@/lib/email-log";
import { buildContext, generateReply, type ClientKnowledge } from "@/lib/ai-reply";
import { formalNoticeEmail } from "@/lib/mail-templates";
import { formalNoticeEligibility } from "@/lib/domain/reminders";
import { addDays, parisToday } from "@/lib/domain/dates";
import { daysBetween, formatDate, formatEUR } from "@/lib/utils";

const tab = (clientId: string) => `/clients/${clientId}?onglet=echanges`;
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Prépare (sans rien envoyer) une réponse au dernier mail reçu, d'après tout ce que le CRM sait du client. */
export async function prepareReplyAction(clientId: string, fd: FormData) {
  const back = tab(clientId);
  await requireReservedAck(clientId, fd, back);
  const supabase = createClient();
  const [c, contracts, quotes, invoices, interactions, messages] = await Promise.all([
    supabase.from("clients").select("name, kind, email, phone, notes, is_reserved, pipeline").eq("id", clientId).single(),
    supabase.from("contracts").select("label, status, monthly_amount_ht, per_visit_amount_ht, start_date, end_date").eq("client_id", clientId),
    supabase.from("quotes").select("number, status, subject, total_ttc, sent_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(8),
    supabase.from("invoices").select("number, status, total_ttc, paid_amount, due_date, reminder_count").eq("client_id", clientId).neq("status", "annule").order("created_at", { ascending: false }).limit(10),
    supabase.from("interactions").select("kind, summary, occurred_at").eq("client_id", clientId).order("occurred_at", { ascending: false }).limit(12),
    supabase.from("client_messages").select("id, direction, kind, status, subject, body, created_at, received_at, sent_at").eq("client_id", clientId).in("status", ["recu", "traite", "envoye"]).order("created_at", { ascending: false }).limit(8)
  ]);
  for (const r of [c, contracts, quotes, invoices, interactions, messages]) if (r.error) flash(back, "error", dbMessage(r.error));
  const msgs = (messages.data ?? []) as any[];
  const last = msgs.find((m) => m.direction === "entrant");
  if (!last) flash(back, "error", "Aucun mail reçu de ce client à qui répondre.");
  const k: ClientKnowledge = {
    client: c.data as any,
    contracts: ((contracts.data ?? []) as any[]).map((x) => ({ ...x, monthly_amount_ht: x.monthly_amount_ht == null ? null : num(x.monthly_amount_ht), per_visit_amount_ht: x.per_visit_amount_ht == null ? null : num(x.per_visit_amount_ht) })),
    quotes: ((quotes.data ?? []) as any[]).map((x) => ({ ...x, total_ttc: num(x.total_ttc) })),
    invoices: ((invoices.data ?? []) as any[]).map((x) => ({ ...x, total_ttc: num(x.total_ttc), paid_amount: num(x.paid_amount) })),
    interactions: (interactions.data ?? []) as any[],
    messages: msgs.map((m) => ({ direction: m.direction, subject: m.subject, body: m.body, at: m.received_at ?? m.sent_at ?? m.created_at })),
    replyTo: { subject: last.subject, body: last.body, at: last.received_at ?? last.created_at }
  };
  const res = await generateReply(buildContext(k));
  if (!res.ok) flash(back, "error", `Réponse non préparée : ${res.reason}`);
  // Un seul brouillon à la fois par mail : le précédent est écarté, jamais envoyé.
  await supabase.from("client_messages").update({ status: "annule" }).eq("client_id", clientId).eq("kind", "reponse_ia").eq("status", "a_valider");
  const { error } = await supabase.from("client_messages").insert({
    client_id: clientId, direction: "sortant", kind: "reponse_ia", status: "a_valider", subject: res.draft.subject.startsWith("Re") ? res.draft.subject : `Re : ${last.subject ?? res.draft.subject}`,
    body: res.draft.body, to_email: (c.data as any).email, in_reply_to: last.id, ai_notes: res.draft.aVerifier.join("\n") || null
  });
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(`/clients/${clientId}`);
  flash(back, "ok", "Réponse préparée : relisez-la, modifiez-la si besoin, puis validez pour l'envoyer.");
}

/** Enregistre les modifications de Kevinh sur un brouillon (réponse ou mise en demeure) sans l'envoyer. */
export async function saveDraftAction(id: string, fd: FormData) {
  const supabase = createClient();
  const { data: m } = await supabase.from("client_messages").select("client_id, status").eq("id", id).maybeSingle();
  if (!m) flash("/clients", "error", "Brouillon introuvable.");
  const back = tab(m!.client_id);
  if (m!.status !== "a_valider") flash(back, "error", "Ce message n'est plus modifiable.");
  const body = str(fd, "body");
  if (!body) flash(back, "error", "Le message ne peut pas être vide.");
  const { error } = await supabase.from("client_messages").update({ subject: str(fd, "subject"), body, to_email: str(fd, "to") }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(`/clients/${m!.client_id}`);
  flash(back, "ok", "Brouillon enregistré (rien n'a été envoyé).");
}

/** Validation par Kevinh : le message part maintenant. Un échec laisse le brouillon intact. */
export async function sendDraftAction(id: string, fd: FormData) {
  const supabase = createClient();
  const { data: m } = await supabase.from("client_messages").select("*, clients(name, email, is_reserved)").eq("id", id).maybeSingle();
  if (!m) flash("/clients", "error", "Brouillon introuvable.");
  const back = tab(m!.client_id);
  if (m!.status !== "a_valider") flash(back, "error", "Ce message a déjà été traité.");
  await requireReservedAck(m!.client_id, fd, back);
  const to = str(fd, "to") ?? m!.to_email ?? m!.clients?.email;
  if (!to || !MAIL_RE.test(to)) flash(back, "error", "Adresse e-mail du destinataire manquante ou invalide.");
  const subject = str(fd, "subject") ?? m!.subject ?? "Votre message";
  const body = str(fd, "body") ?? m!.body;
  const res = await sendMail({ to: to!, subject, text: body });
  await logEmail(supabase, { kind: m!.kind === "mise_en_demeure" ? "mise_en_demeure" : "reponse_client", to: to!, subject, ok: res.sent, error: res.sent ? undefined : res.reason, entity: m!.entity ?? "client", entityId: m!.entity_id ?? m!.client_id });
  if (!res.sent) flash(back, "error", `Message NON envoyé : ${res.reason}. Le brouillon est conservé.`);
  await supabase.from("client_messages").update({ status: "envoye", sent_at: new Date().toISOString(), subject, body, to_email: to }).eq("id", id);
  if (m!.in_reply_to) await supabase.from("client_messages").update({ status: "traite" }).eq("id", m!.in_reply_to);
  await supabase.from("interactions").insert({ client_id: m!.client_id, kind: m!.kind === "mise_en_demeure" ? "relance" : "email", summary: `${m!.kind === "mise_en_demeure" ? "Mise en demeure envoyée" : "Réponse envoyée"} à ${to} : ${subject}` });
  revalidatePath("/", "layout");
  flash(back, "ok", `Message envoyé à ${to}.`);
}

export async function discardDraftAction(id: string) {
  const supabase = createClient();
  const { data: m } = await supabase.from("client_messages").select("client_id").eq("id", id).maybeSingle();
  if (!m) flash("/clients", "error", "Brouillon introuvable.");
  const { error } = await supabase.from("client_messages").update({ status: "annule" }).eq("id", id).eq("status", "a_valider");
  if (error) flash(tab(m!.client_id), "error", dbMessage(error));
  revalidatePath("/", "layout");
  flash(tab(m!.client_id), "ok", "Brouillon écarté.");
}

/** « Traité sans réponse » : le mail sort de l'accueil sans qu'aucune réponse ne parte. */
export async function markMailHandledAction(id: string) {
  const supabase = createClient();
  const { data: m } = await supabase.from("client_messages").select("client_id").eq("id", id).maybeSingle();
  if (!m) flash("/clients", "error", "Mail introuvable.");
  const { error } = await supabase.from("client_messages").update({ status: "traite" }).eq("id", id).eq("direction", "entrant");
  if (error) flash(tab(m!.client_id), "error", dbMessage(error));
  revalidatePath("/", "layout");
  flash(tab(m!.client_id), "ok", "Mail marqué comme traité.");
}

/**
 * Prépare le courrier de mise en demeure d'une facture. Refusé côté serveur si toutes les relances n'ont pas été dépassées,
 * même si le bouton est affiché. Ne l'envoie jamais : il reste « à valider ».
 */
export async function prepareFormalNoticeAction(invoiceId: string, fd: FormData) {
  const supabase = createClient();
  const { data: inv } = await supabase.from("invoices").select("id, number, status, due_date, total_ttc, paid_amount, reminder_count, last_reminder_at, client_id, clients(name, kind, email, is_reserved)").eq("id", invoiceId).maybeSingle();
  if (!inv) flash("/factures", "error", "Facture introuvable.");
  const back = tab(inv!.client_id);
  await requireReservedAck(inv!.client_id, fd, back);
  const settings = await getSettings(supabase);
  const ok = formalNoticeEligibility(inv as any, settings);
  if (!ok.eligible) flash(back, "error", `Mise en demeure impossible : ${ok.reason}.`);
  const client = (inv as any).clients;
  const remaining = num(inv!.total_ttc) - num(inv!.paid_amount);
  const mail = formalNoticeEmail({
    company: settings.company_name, phone: settings.company_phone, clientName: client.name, professional: client.kind === "entreprise", invoiceNumber: inv!.number ?? "",
    totalTtc: formatEUR(inv!.total_ttc), remaining: formatEUR(remaining), dueDate: formatDate(inv!.due_date), daysLate: daysBetween(inv!.due_date!),
    reminders: { count: inv!.reminder_count, lastDate: inv!.last_reminder_at ? formatDate(inv!.last_reminder_at) : null },
    deadline: formatDate(addDays(parisToday(), 8)), iban: settings.company_iban
  });
  await supabase.from("client_messages").update({ status: "annule" }).eq("entity", "invoice").eq("entity_id", invoiceId).eq("kind", "mise_en_demeure").eq("status", "a_valider");
  const { error } = await supabase.from("client_messages").insert({
    client_id: inv!.client_id, direction: "sortant", kind: "mise_en_demeure", status: "a_valider", subject: mail.subject, body: mail.text, to_email: client.email, entity: "invoice", entity_id: invoiceId
  });
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(`/clients/${inv!.client_id}`);
  flash(back, "ok", "Mise en demeure préparée : relisez-la ci-dessous. Elle ne part que si vous cliquez sur « Envoyer ».");
}

/** Envoi de la mise en demeure : double condition — éligibilité revérifiée et case de confirmation cochée par Kevinh. */
export async function sendFormalNoticeAction(id: string, fd: FormData) {
  const supabase = createClient();
  const { data: m } = await supabase.from("client_messages").select("client_id, entity_id, kind").eq("id", id).maybeSingle();
  if (!m || m.kind !== "mise_en_demeure") flash("/clients", "error", "Mise en demeure introuvable.");
  const back = tab(m!.client_id);
  if (!checked(fd, "confirm_notice")) flash(back, "error", "Cochez la case de confirmation pour envoyer la mise en demeure.");
  const { data: inv } = await supabase.from("invoices").select("status, due_date, reminder_count, last_reminder_at").eq("id", m!.entity_id).maybeSingle();
  const ok = inv ? formalNoticeEligibility(inv as any, await getSettings(supabase)) : { eligible: false, reason: "facture introuvable" };
  if (!ok.eligible) flash(back, "error", `Envoi refusé : ${ok.reason}.`);
  return sendDraftAction(id, fd);
}

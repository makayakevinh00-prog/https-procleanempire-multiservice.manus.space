"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, getSettings, num, str } from "@/lib/data";
import { requireReservedAck } from "@/lib/action-helpers";
import { sendMail } from "@/lib/mail";
import { logEmail } from "@/lib/email-log";
import { generateReply } from "@/lib/mail-ai";
import { formatClientContext } from "@/lib/domain/client-context";
import { buildFormalNotice } from "@/lib/domain/formal-notice";
import { formalNoticeEligibility } from "@/lib/domain/reminders";
import { formatDate } from "@/lib/utils";

const histo = (clientId: string) => `/clients/${clientId}?onglet=historique`;
const refresh = (clientId: string) => { revalidatePath(`/clients/${clientId}`); revalidatePath("/"); };

/** Prépare (sans rien envoyer) une réponse au mail reçu, d'après tout ce que le CRM sait du client. */
export async function prepareReplyAction(clientId: string, mailId: string) {
  const back = histo(clientId);
  const supabase = createClient();
  const { data: mail } = await supabase.from("client_mails").select("id, subject, body, client_id, direction").eq("id", mailId).eq("client_id", clientId).maybeSingle();
  if (!mail || mail.direction !== "recu") flash(back, "error", "Mail introuvable.");
  const { data: open } = await supabase.from("mail_drafts").select("id").eq("reply_to_mail_id", mailId).eq("status", "a_valider").maybeSingle();
  if (open) flash(back, "error", "Une réponse est déjà préparée pour ce mail : relisez-la ci-dessus.");

  const [client, invoices, quotes, contracts, mails, interactions] = await Promise.all([
    supabase.from("clients").select("name, kind, status, email, phone, address, notes, is_reserved").eq("id", clientId).single(),
    supabase.from("invoices").select("number, status, subject, total_ttc, paid_amount, due_date, reminder_count").eq("client_id", clientId).neq("status", "annule").order("created_at", { ascending: false }).limit(15),
    supabase.from("quotes").select("number, status, subject, total_ttc, sent_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
    supabase.from("contracts").select("label, status, monthly_amount_ht, per_visit_amount_ht").eq("client_id", clientId),
    supabase.from("client_mails").select("direction, kind, subject, body, occurred_at").eq("client_id", clientId).order("occurred_at", { ascending: false }).limit(8),
    supabase.from("interactions").select("kind, summary, occurred_at").eq("client_id", clientId).order("occurred_at", { ascending: false }).limit(15)
  ]);
  for (const r of [client, invoices, quotes, contracts, mails, interactions]) if (r.error) flash(back, "error", dbMessage(r.error));

  const context = formatClientContext({
    client: client.data as any,
    invoices: ((invoices.data ?? []) as any[]).map((i) => ({ ...i, total_ttc: num(i.total_ttc), paid_amount: num(i.paid_amount) })),
    quotes: ((quotes.data ?? []) as any[]).map((q) => ({ ...q, total_ttc: num(q.total_ttc) })),
    contracts: (contracts.data ?? []) as any[],
    mails: (mails.data ?? []) as any[],
    interactions: (interactions.data ?? []) as any[]
  });
  const r = await generateReply({ context, incoming: { subject: mail!.subject, body: mail!.body } });
  if (!r.ok) flash(back, "error", `Réponse non préparée : ${r.reason}.`);

  const { error } = await supabase.from("mail_drafts").insert({
    client_id: clientId, kind: "reponse", reply_to_mail_id: mailId, to_email: client.data!.email,
    subject: r.subject, body: r.body, generated_by: "ia"
  });
  if (error) flash(back, "error", dbMessage(error));
  refresh(clientId);
  flash(back, "ok", "Réponse préparée : relisez-la, modifiez-la, puis validez. Rien n'est parti.");
}

export async function saveDraftAction(draftId: string, clientId: string, fd: FormData) {
  const back = histo(clientId);
  const subject = str(fd, "subject"), body = str(fd, "body"), to = str(fd, "to_email");
  if (!subject || !body) flash(back, "error", "L'objet et le texte sont obligatoires.");
  const { data, error } = await createClient().from("mail_drafts").update({ subject, body, ...(to ? { to_email: to } : {}) }).eq("id", draftId).eq("client_id", clientId).eq("status", "a_valider").select("id");
  if (error) flash(back, "error", dbMessage(error));
  if (!data?.length) flash(back, "error", "Ce brouillon a déjà été traité.");
  refresh(clientId);
  flash(back, "ok", "Modifications enregistrées (rien n'est parti).");
}

export async function dismissDraftAction(draftId: string, clientId: string) {
  const { error } = await createClient().from("mail_drafts").update({ status: "ecarte", decided_at: new Date().toISOString() }).eq("id", draftId).eq("client_id", clientId).eq("status", "a_valider");
  if (error) flash(histo(clientId), "error", dbMessage(error));
  refresh(clientId);
  flash(histo(clientId), "ok", "Brouillon écarté.");
}

export async function markMailHandledAction(mailId: string, clientId: string) {
  const { error } = await createClient().from("client_mails").update({ handled: true }).eq("id", mailId).eq("client_id", clientId);
  if (error) flash(histo(clientId), "error", dbMessage(error));
  refresh(clientId);
  flash(histo(clientId), "ok", "Mail marqué comme traité.");
}

/**
 * « Valider et envoyer » : SEUL chemin d'envoi d'une réponse ou d'une mise en demeure, déclenché par le clic de Kevinh.
 * Le brouillon est « réservé » avant l'envoi (pas de double envoi sur double clic) et rouvert si l'envoi échoue.
 */
export async function sendDraftAction(draftId: string, clientId: string, fd: FormData) {
  const back = histo(clientId);
  const supabase = createClient();
  const { data: d } = await supabase.from("mail_drafts").select("id, kind, status, to_email, subject, body, reply_to_mail_id, related_invoice_id, clients(name, email)").eq("id", draftId).eq("client_id", clientId).maybeSingle();
  if (!d) flash(back, "error", "Brouillon introuvable.");
  if (d!.status !== "a_valider") flash(back, "error", "Ce brouillon a déjà été traité.");
  await requireReservedAck(clientId, fd, back);

  const subject = str(fd, "subject") ?? d!.subject, body = str(fd, "body") ?? d!.body;
  const client = (Array.isArray((d as any).clients) ? (d as any).clients[0] : (d as any).clients) as { name: string; email: string | null } | null;
  const to = str(fd, "to_email") ?? d!.to_email ?? client?.email;
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) flash(back, "error", "Aucune adresse e-mail valable pour ce client : renseignez-la dans sa fiche.");

  const claim = await supabase.from("mail_drafts").update({ status: "envoye", decided_at: new Date().toISOString(), subject, body }).eq("id", draftId).eq("status", "a_valider").select("id");
  if (claim.error) flash(back, "error", dbMessage(claim.error));
  if (!claim.data?.length) flash(back, "error", "Ce brouillon vient d'être traité ailleurs : rien n'a été envoyé deux fois.");

  const res = await sendMail({ to: to!, subject, text: body });
  await logEmail(supabase, { kind: d!.kind === "mise_en_demeure" ? "mise_en_demeure" : "reponse_client", to: to!, subject, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "client", entityId: clientId });
  if (!res.sent) {
    await supabase.from("mail_drafts").update({ status: "a_valider", decided_at: null }).eq("id", draftId);
    flash(back, "error", `Non envoyé (${res.reason}) : le brouillon reste à valider.`);
  }

  await supabase.from("client_mails").insert({ client_id: clientId, direction: "envoye", kind: d!.kind === "mise_en_demeure" ? "mise_en_demeure" : "mail", subject, body, to_email: to, related_invoice_id: d!.related_invoice_id, handled: true });
  if (d!.reply_to_mail_id) await supabase.from("client_mails").update({ handled: true }).eq("id", d!.reply_to_mail_id);
  if (d!.kind === "mise_en_demeure") await supabase.from("interactions").insert({ client_id: clientId, kind: "relance", summary: `Mise en demeure envoyée à ${to} (${subject})` });
  refresh(clientId);
  flash(back, "ok", d!.kind === "mise_en_demeure" ? "Mise en demeure envoyée." : "Réponse envoyée.");
}

/**
 * Prépare le courrier de mise en demeure (jamais envoyé ici). Éligibilité re-vérifiée côté serveur :
 * le bouton n'existe qu'après épuisement des relances, et rien ne se prépare sans cela.
 */
export async function prepareFormalNoticeAction(clientId: string, fd: FormData) {
  const back = histo(clientId);
  const supabase = createClient();
  await requireReservedAck(clientId, fd, back);
  const settings = await getSettings(supabase);
  const [client, inv] = await Promise.all([
    supabase.from("clients").select("name, kind, email").eq("id", clientId).single(),
    supabase.from("invoices").select("id, number, status, issue_date, due_date, total_ttc, paid_amount, reminder_count, last_reminder_at").eq("client_id", clientId).eq("status", "en_retard")
  ]);
  if (client.error) flash(back, "error", dbMessage(client.error));
  if (inv.error) flash(back, "error", dbMessage(inv.error));
  const eligible = ((inv.data ?? []) as any[]).filter((i) => formalNoticeEligibility(i, settings).eligible);
  if (!eligible.length) flash(back, "error", "Mise en demeure impossible : toutes les relances ne sont pas encore épuisées.");

  const { data: open } = await supabase.from("mail_drafts").select("id").eq("client_id", clientId).eq("kind", "mise_en_demeure").eq("status", "a_valider").maybeSingle();
  if (open) flash(back, "error", "Une mise en demeure est déjà préparée : relisez-la ci-dessus.");

  const notice = buildFormalNotice({
    company: { name: settings.company_name, legalForm: settings.company_legal_form, address: settings.company_address, siret: settings.company_siret },
    client: { name: client.data!.name, kind: client.data!.kind },
    today: formatDate(new Date().toISOString()),
    invoices: eligible.map((i) => ({ number: i.number, issueDate: formatDate(i.issue_date), dueDate: formatDate(i.due_date), remainingTtc: num(i.total_ttc) - num(i.paid_amount) }))
  });
  const { error } = await supabase.from("mail_drafts").insert({
    client_id: clientId, kind: "mise_en_demeure", related_invoice_id: eligible.length === 1 ? eligible[0].id : null,
    to_email: client.data!.email, subject: notice.subject, body: notice.body, generated_by: "modele"
  });
  if (error) flash(back, "error", dbMessage(error));
  refresh(clientId);
  flash(back, "ok", "Mise en demeure préparée. Relisez-la : elle ne part que sur votre clic.");
}

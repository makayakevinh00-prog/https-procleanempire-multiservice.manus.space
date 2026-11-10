"use server";

import { requireAccess, requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, getSettings, str } from "@/lib/data";
import { parseLines, requireReservedAck } from "@/lib/action-helpers";
import { buildPdf } from "@/lib/pdf/load";
import { sendMail } from "@/lib/mail";
import { formatEUR, formatDate } from "@/lib/utils";
import { mandateInvoiceEmail, reminderEmail } from "@/lib/mail-templates";
import { REMINDER_FEE_EUR, REMINDER_FEE_LEVEL } from "@/lib/domain/reminders";
import { logEmail } from "@/lib/email-log";
import { pickRecipients } from "@/lib/recipients";
import { syncQonto } from "@/lib/qonto";
import { createAdmin } from "@/lib/supabase/server";

export async function createInvoiceAction(fd: FormData) {
  await requireAccess("finances");
  const back = "/factures/new";
  const clientId = str(fd, "client_id");
  if (!clientId) flash(back, "error", "Choisissez un client.");
  const lines = parseLines(fd, back);
  await requireReservedAck(clientId!, fd, back);

  const supabase = createClient();
  const { data: inv, error } = await supabase.from("invoices").insert({
    client_id: clientId, subject: str(fd, "subject"), notes: str(fd, "notes")
  }).select("id").single();
  if (error) flash(back, "error", dbMessage(error));
  const { error: le } = await supabase.from("invoice_lines").insert(lines.map((l, position) => ({ ...l, position, invoice_id: inv!.id })));
  if (le) {
    await supabase.from("invoices").delete().eq("id", inv!.id);
    flash(back, "error", dbMessage(le));
  }
  revalidatePath("/factures");
  flash(`/factures/${inv!.id}`, "ok", "Facture brouillon créée.");
}

export async function updateInvoiceAction(id: string, fd: FormData) {
  await requireAccess("finances");
  const back = `/factures/${id}/edit`;
  const supabase = createClient();
  const { data: cur } = await supabase.from("invoices").select("status, client_id").eq("id", id).single();
  if (cur?.status !== "brouillon") flash(`/factures/${id}`, "error", "Seule une facture brouillon est modifiable.");
  const lines = parseLines(fd, back);
  await requireReservedAck(cur!.client_id, fd, back);

  const { error } = await supabase.from("invoices").update({ subject: str(fd, "subject"), notes: str(fd, "notes") }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  await supabase.from("invoice_lines").delete().eq("invoice_id", id);
  const { error: le } = await supabase.from("invoice_lines").insert(lines.map((l, position) => ({ ...l, position, invoice_id: id })));
  if (le) flash(back, "error", `Lignes non enregistrées : ${dbMessage(le)}`);
  revalidatePath("/factures");
  flash(`/factures/${id}`, "ok", "Brouillon mis à jour.");
}

export async function deleteDraftAction(id: string) {
  await requireAccess("finances");
  const { error } = await createClient().from("invoices").delete().eq("id", id);
  if (error) flash(`/factures/${id}`, "error", dbMessage(error));
  revalidatePath("/factures");
  flash("/factures", "ok", "Brouillon supprimé.");
}

const mailText = (inv: { number: string; total_ttc: number | string; due_date: string | null; status: string; paid_at: string | null }) =>
  inv.status === "paye"
    ? `Bonjour,\n\nVeuillez trouver ci-joint la facture ${inv.number} d'un montant de ${formatEUR(inv.total_ttc)} TTC, acquittée${inv.paid_at ? ` le ${formatDate(inv.paid_at)}` : ""}. Aucun règlement n'est à effectuer : merci pour votre confiance.\n\nCordialement,\nProClean Empire\ncontact@procleanempire.com`
    : `Bonjour,\n\nVeuillez trouver ci-joint la facture ${inv.number} d'un montant de ${formatEUR(inv.total_ttc)} TTC, à régler avant le ${formatDate(inv.due_date)}.\n\nCordialement,\nProClean Empire\ncontact@procleanempire.com`;

/**
 * « Valider & Envoyer » — SEUL chemin d'émission d'une facture (règle 2).
 * Numéro attribué, alertes contact réservé / montant élevé vérifiées par la base.
 * Options : plusieurs destinataires (cases à cocher / « tout cocher »), et prestation déjà payée
 * (virement Qonto rapproché : la facture part « acquittée », sans relance).
 */
export async function validateInvoiceAction(id: string, fd: FormData) {
  await requireOwner();
  const back = `/factures/${id}`;
  const supabase = createClient();
  const sendEmail = checked(fd, "send_email");
  const { list: to, invalid } = pickRecipients(fd);
  // Contrôles AVANT la validation : aucun numéro n'est consommé si l'envoi est impossible.
  if (invalid.length) flash(back, "error", `Adresse(s) invalide(s) : ${invalid.join(", ")}.`);
  if (sendEmail && !to.length) flash(back, "error", "Cochez au moins une adresse e-mail (ou décochez l'envoi).");
  const paymentId = str(fd, "payment_id");

  const { data: inv, error } = await supabase.rpc("validate_invoice", {
    p_invoice_id: id, p_ack_large: checked(fd, "ack_large"), p_ack_reserved: checked(fd, "ack_reserved")
  });
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath("/factures");
  revalidatePath("/");

  let paidNote = "";
  if (paymentId) {
    const { error: re } = await supabase.rpc("reconcile_payment", { p_payment_id: paymentId, p_invoice_id: id, p_ack_reserved: checked(fd, "ack_reserved") });
    if (re) flash(back, "error", `Facture ${inv.number} validée, mais le rapprochement avec le virement a échoué : ${dbMessage(re)}`);
    paidNote = " Elle est marquée payée (virement Qonto rapproché).";
    revalidatePath("/paiements");
  }

  if (!sendEmail) flash(back, "ok", `Facture ${inv.number} validée (aucun e-mail envoyé).${paidNote}`);

  const { data: fresh } = await supabase.from("invoices").select("number, total_ttc, due_date, status, paid_at").eq("id", id).single();
  const pdf = await buildPdf("facture", id);
  if (!pdf) flash(back, "error", `Facture ${inv.number} validée, mais le PDF est introuvable.`);
  const res = await sendMail({
    to, subject: `Facture ${inv.number} — ProClean Empire`, text: mailText(fresh as any),
    attachment: { filename: pdf!.filename, bytes: pdf!.bytes }
  });
  await logEmail(supabase, { kind: "facture", to: to.join(", "), subject: `Facture ${inv.number}`, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "invoice", entityId: id });
  if (!res.sent) flash(back, "error", `Facture ${inv.number} validée, mais l'e-mail n'est PAS parti : ${res.reason}.`);
  await supabase.from("invoices").update({ sent_at: new Date().toISOString(), sent_to: to.join(", ") }).eq("id", id);
  flash(back, "ok", `Facture ${inv.number} validée et envoyée à ${to.join(", ")}.${paidNote}`);
}

/** Renvoyer une facture déjà émise (à une ou plusieurs adresses, ou à toutes). Ne change ni son numéro ni son statut. */
export async function resendInvoiceAction(id: string, fd: FormData) {
  await requireOwner();
  const back = `/factures/${id}`;
  const supabase = createClient();
  const { list: to, invalid } = pickRecipients(fd);
  if (invalid.length) flash(back, "error", `Adresse(s) invalide(s) : ${invalid.join(", ")}.`);
  if (!to.length) flash(back, "error", "Cochez au moins une adresse e-mail.");
  const { data: inv } = await supabase.from("invoices").select("number, total_ttc, due_date, status, paid_at, client_id").eq("id", id).single();
  if (!inv || !(inv as any).number || (inv as any).status === "brouillon") flash(back, "error", "Seule une facture émise peut être renvoyée.");
  if ((inv as any).status === "annule") flash(back, "error", "Cette facture est annulée.");
  await requireReservedAck((inv as any).client_id, fd, back);
  const pdf = await buildPdf("facture", id);
  if (!pdf) flash(back, "error", "PDF introuvable.");
  const res = await sendMail({ to, subject: `Facture ${(inv as any).number} — ProClean Empire`, text: mailText(inv as any), attachment: { filename: pdf!.filename, bytes: pdf!.bytes } });
  await logEmail(supabase, { kind: "facture", to: to.join(", "), subject: `Facture ${(inv as any).number} (renvoi)`, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "invoice", entityId: id });
  if (!res.sent) flash(back, "error", `Facture non envoyée : ${res.reason}.`);
  await supabase.from("invoices").update({ sent_at: new Date().toISOString(), sent_to: to.join(", ") }).eq("id", id);
  revalidatePath(back);
  flash(back, "ok", `Facture ${(inv as any).number} envoyée à ${to.join(", ")}.`);
}

/** Actualise les virements Qonto depuis la fiche de la facture, pour retrouver un paiement récent. */
export async function syncQontoForInvoiceAction(id: string) {
  await requireOwner();
  const back = `/factures/${id}`;
  let inserted = 0, failure: string | null = null;
  try {
    inserted = (await syncQonto(createAdmin())).inserted;
  } catch (e) {
    failure = (e as Error).message;
  }
  // flash() redirige en levant une exception : il ne doit JAMAIS être appelé dans le try (sinon la réussite s'affichait comme une erreur « NEXT_REDIRECT »).
  if (failure) flash(back, "error", failure);
  revalidatePath(back); revalidatePath("/paiements");
  flash(back, "ok", `Qonto actualisé : ${inserted} nouveau(x) virement(s) lu(s).`);
}

export async function cancelInvoiceAction(id: string, fd: FormData) {
  await requireOwner();
  const back = `/factures/${id}`;
  const { error } = await createClient().rpc("cancel_invoice", { p_invoice_id: id, p_reason: str(fd, "reason") ?? "" });
  if (error) flash(back, "error", error.message.includes("MOTIF_REQUIS") ? "Indiquez un motif d'annulation." : dbMessage(error));
  revalidatePath("/factures");
  flash(back, "ok", "Facture annulée.");
}

/** Relance manuelle : la base vérifie l'historique avant d'enregistrer (règle 3). */
export async function remindInvoiceAction(id: string, fd: FormData) {
  await requireOwner();
  const back = `/factures/${id}`;
  const supabase = createClient();
  const channel = str(fd, "channel") ?? "email";
  const { data: r, error } = await supabase.rpc("register_reminder", {
    p_invoice_id: id, p_channel: channel, p_origin: "manuel", p_note: str(fd, "note"),
    p_force: checked(fd, "force"), p_ack_reserved: checked(fd, "ack_reserved")
  });
  if (error) flash(back, "error", dbMessage(error));

  if (channel === "email") {
    const { data: inv } = await supabase.from("invoices").select("number, total_ttc, due_date, clients(name, email)").eq("id", id).single();
    const client = (inv as any)?.clients;
    const fail = async (why: string) => {
      await supabase.rpc("undo_reminder", { p_reminder_id: r.id });
      flash(back, "error", `Relance non envoyée (${why}) — rien n'a été enregistré.`);
    };
    const chosen = pickRecipients(fd).list;
    const to = chosen.length ? chosen : client?.email ? [client.email] : [];
    if (!to.length) await fail("aucune adresse e-mail");
    const pdf = await buildPdf("facture", id);
    const mail = reminderEmail({ company: "ProClean Empire", phone: null, number: inv!.number, totalTtc: formatEUR(inv!.total_ttc), dueDate: formatDate(inv!.due_date), level: r.level, fee: formatEUR(REMINDER_FEE_EUR), feeLevel: REMINDER_FEE_LEVEL, totalWithFee: formatEUR(Number(inv!.total_ttc) + REMINDER_FEE_EUR) });
    const res = await sendMail({
      to,
      subject: mail.subject,
      text: mail.text, html: mail.html,
      attachment: pdf ? { filename: pdf.filename, bytes: pdf.bytes } : undefined
    });
    await logEmail(supabase, { kind: "relance_facture", to: to.join(", "), subject: mail.subject, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "invoice", entityId: id });
    if (!res.sent) await fail(res.reason);
  }
  revalidatePath("/factures");
  flash(back, "ok", `Relance n°${r.level} enregistrée.`);
}

/**
 * Méthode « mandat » (SWYFO) : envoie la facture avec le mandat d'intervention complété.
 * Enregistre aussi la date de prestation sur la facture. Action volontaire, jamais automatique.
 */
export async function sendMandateInvoiceAction(id: string, fd: FormData) {
  await requireOwner();
  const back = `/factures/${id}`;
  const supabase = createClient();
  const { list: to, invalid } = pickRecipients(fd);
  if (invalid.length) flash(back, "error", `Adresse(s) invalide(s) : ${invalid.join(", ")}.`);
  if (!to.length) flash(back, "error", "Cochez au moins une adresse e-mail.");
  const need = (k: string) => str(fd, k) ?? "";
  for (const [k, l] of [["intervention_date", "date d'intervention"], ["mandate_date", "date du mandat"], ["mission", "contenu de la mission"], ["site", "site d'intervention"]] as const)
    if (!need(k)) flash(back, "error", `Renseignez : ${l}.`);
  const { data: inv } = await supabase.from("invoices").select("number, total_ttc, due_date, status, client_id").eq("id", id).single();
  if (!inv || !(inv as any).number || (inv as any).status === "brouillon") flash(back, "error", "Validez d'abord la facture : le mandat part avec une facture émise.");
  await requireReservedAck((inv as any).client_id, fd, back);
  const settings = await getSettings(supabase) as any;
  const d = (x: string) => formatDate(x);
  const mail = mandateInvoiceEmail({
    company: "ProClean Empire", phone: settings.company_phone ?? null, number: (inv as any).number, interventionDate: d(need("intervention_date")), mandateDate: d(need("mandate_date")),
    mission: need("mission"), siteLabel: need("site"), keysNote: need("keys") || "sans objet",
    amountLine: `${formatEUR((inv as any).total_ttc)} TTC`, observations: str(fd, "observations"), dueDate: d((inv as any).due_date), paymentDaysLabel: "à 15 jours",
    provider: "ProClean Empire", iban: settings.company_iban ?? null, bic: settings.company_bic ?? null
  });
  const pdf = await buildPdf("facture", id);
  if (!pdf) flash(back, "error", "PDF introuvable.");
  const res = await sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html, attachment: { filename: pdf!.filename, bytes: pdf!.bytes } });
  await logEmail(supabase, { kind: "facture", to: to.join(", "), subject: mail.subject, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "invoice", entityId: id });
  if (!res.sent) flash(back, "error", `Mandat + facture non envoyés : ${res.reason}.`);
  await supabase.from("invoices").update({ service_date: need("intervention_date"), sent_at: new Date().toISOString(), sent_to: to.join(", ") }).eq("id", id);
  revalidatePath("/factures");
  flash(back, "ok", `Facture et mandat complété envoyés à ${to.join(", ")}.`);
}

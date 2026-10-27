"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, str } from "@/lib/data";
import { parseLines, requireReservedAck } from "@/lib/action-helpers";
import { buildPdf } from "@/lib/pdf/load";
import { sendMail } from "@/lib/mail";
import { formatEUR, formatDate } from "@/lib/utils";

export async function createInvoiceAction(fd: FormData) {
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
  const { error } = await createClient().from("invoices").delete().eq("id", id);
  if (error) flash(`/factures/${id}`, "error", dbMessage(error));
  revalidatePath("/factures");
  flash("/factures", "ok", "Brouillon supprimé.");
}

/**
 * « Valider & Envoyer » — SEUL chemin d'émission d'une facture (règle 2).
 * Numéro attribué, alertes contact réservé / montant élevé vérifiées par la base.
 */
export async function validateInvoiceAction(id: string, fd: FormData) {
  const back = `/factures/${id}`;
  const supabase = createClient();
  const { data: inv, error } = await supabase.rpc("validate_invoice", {
    p_invoice_id: id, p_ack_large: checked(fd, "ack_large"), p_ack_reserved: checked(fd, "ack_reserved")
  });
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath("/factures");
  revalidatePath("/");

  if (!checked(fd, "send_email")) {
    flash(back, "ok", `Facture ${inv.number} validée (aucun e-mail envoyé).`);
  }

  const { data: client } = await supabase.from("clients").select("name, email").eq("id", inv.client_id).single();
  if (!client?.email) flash(back, "error", `Facture ${inv.number} validée, mais le client n'a pas d'e-mail : envoi impossible.`);
  const pdf = await buildPdf("facture", id);
  if (!pdf) flash(back, "error", `Facture ${inv.number} validée, mais le PDF est introuvable.`);
  const res = await sendMail({
    to: client!.email!,
    subject: `Facture ${inv.number} — ProClean Empire`,
    text: `Bonjour,\n\nVeuillez trouver ci-joint la facture ${inv.number} d'un montant de ${formatEUR(inv.total_ttc)} TTC, à régler avant le ${formatDate(inv.due_date)}.\n\nCordialement,\nProClean Empire\ncontact@procleanempire.com`,
    attachment: { filename: pdf!.filename, bytes: pdf!.bytes }
  });
  if (!res.sent) flash(back, "error", `Facture ${inv.number} validée, mais l'e-mail n'est PAS parti : ${res.reason}.`);
  await supabase.from("invoices").update({ sent_at: new Date().toISOString(), sent_to: client!.email }).eq("id", id);
  flash(back, "ok", `Facture ${inv.number} validée et envoyée à ${client!.email}.`);
}

export async function cancelInvoiceAction(id: string, fd: FormData) {
  const back = `/factures/${id}`;
  const { error } = await createClient().rpc("cancel_invoice", { p_invoice_id: id, p_reason: str(fd, "reason") ?? "" });
  if (error) flash(back, "error", error.message.includes("MOTIF_REQUIS") ? "Indiquez un motif d'annulation." : dbMessage(error));
  revalidatePath("/factures");
  flash(back, "ok", "Facture annulée.");
}

/** Relance manuelle : la base vérifie l'historique avant d'enregistrer (règle 3). */
export async function remindInvoiceAction(id: string, fd: FormData) {
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
    if (!client?.email) await fail("le client n'a pas d'e-mail");
    const pdf = await buildPdf("facture", id);
    const res = await sendMail({
      to: client.email,
      subject: `Relance — facture ${inv!.number}`,
      text: `Bonjour,\n\nSauf erreur de notre part, la facture ${inv!.number} (${formatEUR(inv!.total_ttc)} TTC, échéance ${formatDate(inv!.due_date)}) n'a pas encore été réglée. Merci de procéder au règlement ou de nous contacter si c'est déjà fait.\n\nCordialement,\nProClean Empire\ncontact@procleanempire.com`,
      attachment: pdf ? { filename: pdf.filename, bytes: pdf.bytes } : undefined
    });
    if (!res.sent) await fail(res.reason);
  }
  revalidatePath("/factures");
  flash(back, "ok", `Relance n°${r.level} enregistrée.`);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, str } from "@/lib/data";
import { parseLines, requireReservedAck } from "@/lib/action-helpers";

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

export async function setQuoteStatusAction(id: string, status: "envoye" | "accepte" | "refuse" | "brouillon", fd: FormData) {
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

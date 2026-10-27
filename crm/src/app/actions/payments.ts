"use server";

import { revalidatePath } from "next/cache";
import { createAdmin, createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { syncQonto } from "@/lib/qonto";

export async function syncQontoAction() {
  const supabase = createClient();
  const { data: owner } = await supabase.rpc("is_owner");
  if (!owner) flash("/paiements", "error", "Accès refusé.");
  let msg: string;
  try {
    const r = await syncQonto(createAdmin());
    msg = `Qonto : ${r.fetched} virement(s) lu(s), ${r.inserted} nouveau(x), ${r.autoMatched} rapproché(s) automatiquement, ${r.proposed} à confirmer.`;
  } catch (e) {
    flash("/paiements", "error", (e as Error).message);
  }
  revalidatePath("/paiements");
  revalidatePath("/");
  flash("/paiements", "ok", msg!);
}

export async function reconcileAction(paymentId: string, fd: FormData) {
  const invoiceId = str(fd, "invoice_id");
  if (!invoiceId) flash("/paiements", "error", "Choisissez une facture.");
  const { error } = await createClient().rpc("reconcile_payment", {
    p_payment_id: paymentId, p_invoice_id: invoiceId, p_ack_reserved: checked(fd, "ack_reserved")
  });
  if (error) flash("/paiements", "error", dbMessage(error));
  revalidatePath("/paiements");
  revalidatePath("/factures");
  flash("/paiements", "ok", "Paiement rapproché.");
}

export async function unreconcileAction(paymentId: string) {
  const { error } = await createClient().rpc("unreconcile_payment", { p_payment_id: paymentId });
  if (error) flash("/paiements", "error", dbMessage(error));
  revalidatePath("/paiements");
  flash("/paiements", "ok", "Rapprochement annulé.");
}

export async function ignorePaymentAction(paymentId: string) {
  const { error } = await createClient().from("payments").update({ match_status: "ignore", suggested_invoice_id: null }).eq("id", paymentId).neq("match_status", "rapproche");
  if (error) flash("/paiements", "error", dbMessage(error));
  revalidatePath("/paiements");
  flash("/paiements", "ok", "Paiement ignoré.");
}

export async function addManualPaymentAction(fd: FormData) {
  const amount = numField(fd, "amount");
  if (!amount || amount <= 0) flash("/paiements", "error", "Montant invalide.");
  const { error } = await createClient().from("payments").insert({
    source: "manuel", amount, received_at: str(fd, "received_at") ?? new Date().toISOString(),
    counterparty: str(fd, "counterparty"), label: str(fd, "label")
  });
  if (error) flash("/paiements", "error", dbMessage(error));
  revalidatePath("/paiements");
  flash("/paiements", "ok", "Paiement ajouté.");
}

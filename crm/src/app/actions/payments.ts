"use server";

import { requireAccess, requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { syncQonto } from "@/lib/qonto";

export async function syncQontoAction() {
  await requireOwner();
  let msg: string;
  try {
    // Session du patron (RLS) : fonctionne sans clé « service » ; l'import est réservé au propriétaire.
    const r = await syncQonto(createClient());
    msg = `Qonto : ${r.fetched} virement(s) lu(s), ${r.inserted} nouveau(x), ${r.autoMatched} rapproché(s) automatiquement, ${r.proposed} à confirmer.`;
  } catch (e) {
    flash("/paiements", "error", (e as Error).message);
  }
  revalidatePath("/paiements");
  revalidatePath("/");
  flash("/paiements", "ok", msg!);
}

export async function reconcileAction(paymentId: string, fd: FormData) {
  await requireAccess("finances");
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
  await requireAccess("finances");
  const { error } = await createClient().rpc("unreconcile_payment", { p_payment_id: paymentId });
  if (error) flash("/paiements", "error", dbMessage(error));
  revalidatePath("/paiements");
  flash("/paiements", "ok", "Rapprochement annulé.");
}

export async function ignorePaymentAction(paymentId: string) {
  await requireAccess("finances");
  const { error } = await createClient().from("payments").update({ match_status: "ignore", suggested_invoice_id: null }).eq("id", paymentId).neq("match_status", "rapproche");
  if (error) flash("/paiements", "error", dbMessage(error));
  revalidatePath("/paiements");
  flash("/paiements", "ok", "Paiement ignoré.");
}

export async function addManualPaymentAction(fd: FormData) {
  await requireAccess("finances");
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

/** Synchronisation silencieuse (appelée à l'ouverture de la page et toutes les 5 minutes tant qu'elle reste ouverte). Ne produit aucun message. */
export async function syncQontoQuietAction(): Promise<{ ok: boolean; inserted: number; error?: string }> {
  await requireOwner();
  try {
    const r = await syncQonto(createClient());
    if (r.inserted > 0) { revalidatePath("/paiements"); revalidatePath("/"); }
    return { ok: true, inserted: r.inserted };
  } catch (e) {
    return { ok: false, inserted: 0, error: (e as Error).message.slice(0, 200) };
  }
}

/** Rapprochement lancé depuis la page d'une facture (retour sur la facture). */
export async function reconcileFromInvoiceAction(invoiceId: string, paymentId: string, fd: FormData) {
  await requireAccess("finances");
  const back = `/factures/${invoiceId}`;
  const { error } = await createClient().rpc("reconcile_payment", { p_payment_id: paymentId, p_invoice_id: invoiceId, p_ack_reserved: checked(fd, "ack_reserved") });
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(back); revalidatePath("/paiements"); revalidatePath("/factures"); revalidatePath("/");
  flash(back, "ok", "Paiement rapproché : la facture est mise à jour.");
}

/**
 * Marquer une facture payée à la main (espèces, chèque, virement non importé…).
 * Un paiement « manuel » est créé puis rapproché par la même fonction que Qonto : l'historique reste cohérent
 * et la facture ne sera plus relancée. Un montant inférieur au reste dû = paiement partiel.
 */
export async function markInvoicePaidAction(invoiceId: string, fd: FormData) {
  await requireAccess("finances");
  const back = `/factures/${invoiceId}`;
  const supabase = createClient();
  const { data: inv } = await supabase.from("invoices").select("id, number, total_ttc, paid_amount, status, clients(name)").eq("id", invoiceId).maybeSingle();
  if (!inv) flash(back, "error", "Facture introuvable.");
  if (!["envoye", "en_retard"].includes((inv as any).status)) flash(back, "error", "Seule une facture envoyée ou en retard peut être réglée.");
  const remaining = Math.round((Number((inv as any).total_ttc) - Number((inv as any).paid_amount)) * 100) / 100;
  const amount = numField(fd, "amount") ?? remaining;
  if (!(amount > 0) || amount > remaining + 0.005) flash(back, "error", `Montant invalide : le reste dû est ${remaining.toFixed(2).replace(".", ",")} €.`);
  const mode = str(fd, "mode") ?? "virement";
  const date = str(fd, "received_at") ?? new Date().toISOString().slice(0, 10);
  const { data: pay, error } = await supabase.from("payments").insert({
    source: "manuel", amount, received_at: date, counterparty: (inv as any).clients?.name ?? null, label: `Paiement ${mode} · ${(inv as any).number}`
  }).select("id").single();
  if (error) flash(back, "error", dbMessage(error));
  const { error: e2 } = await supabase.rpc("reconcile_payment", { p_payment_id: pay!.id, p_invoice_id: invoiceId, p_ack_reserved: checked(fd, "ack_reserved") });
  if (e2) { await supabase.from("payments").delete().eq("id", pay!.id); flash(back, "error", dbMessage(e2)); }
  revalidatePath(back); revalidatePath("/paiements"); revalidatePath("/factures"); revalidatePath("/");
  flash(back, "ok", amount >= remaining ? "Facture marquée comme payée." : "Paiement partiel enregistré.");
}

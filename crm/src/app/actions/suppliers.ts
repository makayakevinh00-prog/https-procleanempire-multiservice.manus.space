"use server";

import { requireAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, numField, str } from "@/lib/data";
import { parsePrices } from "@/lib/supplier-prices";
import { JUSTIF_MAX, JUSTIF_TYPES, safeFileName } from "@/lib/compta/period";

export async function saveSupplierAction(id: string | null, fd: FormData) {
  await requireAccess("finances");
  const name = str(fd, "name");
  const back = id ? `/fournisseurs/${id}` : "/fournisseurs";
  if (!name) flash(back, "error", "Le nom est obligatoire.");
  const row = {
    name: name!, category: str(fd, "category") ?? "autre", kind: str(fd, "kind") ?? "entreprise", status: str(fd, "status") ?? "actif",
    contact_name: str(fd, "contact_name"), email: str(fd, "email"), phone: str(fd, "phone"), siret: str(fd, "siret"), website: str(fd, "website"), address: str(fd, "address"),
    payment_terms: str(fd, "payment_terms"), notes: str(fd, "notes"), prices: parsePrices(str(fd, "prices")), updated_at: new Date().toISOString()
  };
  const sb = createClient();
  if (id) {
    const { error } = await sb.from("suppliers").update(row).eq("id", id);
    if (error) flash(back, "error", dbMessage(error));
    revalidatePath("/fournisseurs");
    flash(back, "ok", "Fournisseur mis à jour.");
  }
  const { data, error } = await sb.from("suppliers").insert(row).select("id").single();
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath("/fournisseurs");
  flash(`/fournisseurs/${data!.id}`, "ok", "Fournisseur ajouté.");
}

export async function deleteSupplierAction(id: string) {
  await requireAccess("finances");
  const { error } = await createClient().from("suppliers").delete().eq("id", id);
  if (error) flash(`/fournisseurs/${id}`, "error", dbMessage(error));
  revalidatePath("/fournisseurs");
  flash("/fournisseurs", "ok", "Fournisseur supprimé (ses paiements enregistrés aussi).");
}

export async function addSupplierPaymentAction(id: string, fd: FormData) {
  await requireAccess("finances");
  const back = `/fournisseurs/${id}`;
  const amount = numField(fd, "amount");
  const paid_on = str(fd, "paid_on");
  if (amount === null || amount <= 0 || !paid_on) flash(back, "error", "Date et montant obligatoires.");
  const { error } = await createClient().from("supplier_payments").insert({ supplier_id: id, paid_on: paid_on!, amount: amount!, label: str(fd, "label"), source: "manuel" });
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(back);
  flash(back, "ok", "Paiement enregistré.");
}

export async function deleteSupplierPaymentAction(supplierId: string, paymentId: string) {
  await requireAccess("finances");
  const { error } = await createClient().from("supplier_payments").delete().eq("id", paymentId);
  if (error) flash(`/fournisseurs/${supplierId}`, "error", dbMessage(error));
  revalidatePath(`/fournisseurs/${supplierId}`);
  flash(`/fournisseurs/${supplierId}`, "ok", "Paiement supprimé.");
}

/** Joint (ou remplace) le justificatif d'un paiement fournisseur : PDF ou image, 10 Mo maximum, visible du comptable invité. */
export async function attachPaymentDocumentAction(supplierId: string, paymentId: string, fd: FormData) {
  await requireAccess("finances");
  const back = `/fournisseurs/${supplierId}`;
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) flash(back, "error", "Choisissez un fichier.");
  const file = f as File;
  if (!JUSTIF_TYPES.includes(file.type)) flash(back, "error", "Format accepté : PDF, JPEG, PNG ou WebP.");
  if (file.size > JUSTIF_MAX) flash(back, "error", "Fichier trop lourd (10 Mo maximum).");
  const sb = createClient();
  const { data: old } = await sb.from("supplier_payments").select("document_path").eq("id", paymentId).eq("supplier_id", supplierId).maybeSingle();
  if (!old) flash(back, "error", "Paiement introuvable.");
  const path = `${paymentId}/${Date.now()}-${safeFileName(file.name)}`;
  const up = await sb.storage.from("justificatifs").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) flash(back, "error", `Envoi impossible : ${up.error.message}`);
  const { error } = await sb.from("supplier_payments").update({ document_path: path }).eq("id", paymentId);
  if (error) { await sb.storage.from("justificatifs").remove([path]); flash(back, "error", dbMessage(error)); }
  if ((old as any).document_path) await sb.storage.from("justificatifs").remove([(old as any).document_path]);
  revalidatePath(back);
  flash(back, "ok", "Justificatif joint.");
}

export async function removePaymentDocumentAction(supplierId: string, paymentId: string) {
  await requireAccess("finances");
  const back = `/fournisseurs/${supplierId}`;
  const sb = createClient();
  const { data: old } = await sb.from("supplier_payments").select("document_path").eq("id", paymentId).eq("supplier_id", supplierId).maybeSingle();
  const { error } = await sb.from("supplier_payments").update({ document_path: null }).eq("id", paymentId);
  if (error) flash(back, "error", dbMessage(error));
  if ((old as any)?.document_path) await sb.storage.from("justificatifs").remove([(old as any).document_path]);
  revalidatePath(back);
  flash(back, "ok", "Justificatif retiré.");
}

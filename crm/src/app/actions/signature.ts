"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { flash, getSettings } from "@/lib/data";
import { sendMail, mailConfigured } from "@/lib/mail";
import { logEmail } from "@/lib/email-log";
import { signatureRequestEmail } from "@/lib/mail-templates";
import { createSignatureRequest } from "@/lib/signature-server";
import { SIGNATURE_VALID_DAYS } from "@/lib/signature";

/** Contrat : envoi par e-mail avec lien de signature en ligne. */
export async function sendContractForSignatureAction(id: string, fd: FormData) {
  await requireOwner();
  const back = `/contrats/${id}`;
  const to = String(fd.get("to") ?? "").trim(), type = String(fd.get("type") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) flash(back, "error", "Adresse e-mail du client manquante ou invalide.");
  if (!mailConfigured()) flash(back, "error", "L'envoi d'e-mails n'est pas configuré.");
  const sb = createClient(), settings = await getSettings(sb);
  const r = await createSignatureRequest("contrat", id, to, type);
  if ("error" in r) return flash(back, "error", r.error);
  const m = signatureRequestEmail({ company: settings.company_name, phone: settings.company_phone, kind: "contrat", number: r.number, title: r.title, url: r.url, days: SIGNATURE_VALID_DAYS });
  const res = await sendMail({ to, subject: m.subject, text: m.text, html: m.html, fromName: m.fromName, attachment: { filename: r.filename, bytes: r.bytes } });
  await logEmail(sb, { kind: "contrat", to, subject: m.subject, ok: res.sent, error: res.sent ? undefined : res.reason, entity: "contract", entityId: id });
  if (!res.sent) flash(back, "error", `Le contrat n'a PAS été envoyé : ${res.reason}.`);
  revalidatePath(back);
  flash(back, "ok", `Contrat envoyé à ${to} avec un lien pour le signer en ligne.`);
}


/** Contrat signé hors signature en ligne (papier, PDF renvoyé par e-mail) : on enregistre la date pour qu'il apparaisse comme signé. */
export async function markContractSignedAction(id: string, fd: FormData) {
  await requireOwner();
  const back = `/contrats/${id}`;
  const on = String(fd.get("signed_on") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) flash(back, "error", "Indiquez la date de signature.");
  const note = String(fd.get("signed_note") ?? "").trim().slice(0, 200) || null;
  const { error } = await createClient().from("contracts").update({ signed_on: on, signed_note: note }).eq("id", id);
  if (error) flash(back, "error", error.message);
  revalidatePath(back); revalidatePath("/contrats");
  flash(back, "ok", "Contrat marqué comme signé.");
}

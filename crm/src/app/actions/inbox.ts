"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash } from "@/lib/data";
import { sendMail } from "@/lib/mail";
import { logEmail } from "@/lib/email-log";
import { senderName, signatureLines } from "@/lib/mail-identity";

const BACK = "/boite";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const refresh = () => { revalidatePath(BACK); revalidatePath("/"); };

/** Répond à un e-mail client depuis le CRM : part à l'expéditeur d'origine (jamais une autre adresse), signé du nom de l'entreprise. */
export async function replyInboxAction(id: string, fd: FormData) {
  await requireOwner();
  const body = String(fd.get("body") ?? "").trim();
  if (body.length < 2) flash(BACK, "error", "Écrivez votre réponse avant d'envoyer.");
  const sb = createClient();
  const { data: m } = await sb.from("inbound_emails").select("id, from_email, subject, client_id").eq("id", id).maybeSingle();
  if (!m) flash(BACK, "error", "Ce message n'existe plus.");
  const subject = /^(re|réf?)\s*:/i.test(m!.subject ?? "") ? (m!.subject as string) : `Re: ${m!.subject || "Votre message"}`;
  const text = `${body}\n\n--\n${signatureLines("ProClean Empire", "entreprise").join("\n")}`;
  const r = await sendMail({ to: m!.from_email, subject, text, fromName: senderName("ProClean Empire", "entreprise"), html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${esc(text)}</div>` });
  await logEmail(sb, { kind: "reponse", to: m!.from_email, subject, ok: r.sent, error: r.sent ? undefined : r.reason, entity: m!.client_id ? "client" : undefined, entityId: m!.client_id ?? undefined });
  if (!r.sent) flash(BACK, "error", `Réponse NON envoyée : ${r.reason}.`);
  const { error } = await sb.from("inbound_emails").update({ status: "repondu", replied_at: new Date().toISOString() }).eq("id", id);
  refresh();
  if (error) flash(BACK, "error", `Réponse envoyée, mais l'enregistrement a échoué : ${dbMessage(error)}`);
  flash(BACK, "ok", `Réponse envoyée à ${m!.from_email}.`);
}

/** Classe un message sans répondre (déjà traité par téléphone, sans suite…), ou le remet à répondre. */
export async function setInboxStatusAction(id: string, status: "traite" | "a_repondre", _fd?: FormData) {
  await requireOwner();
  const { error } = await createClient().from("inbound_emails").update({ status }).eq("id", id);
  refresh();
  if (error) flash(BACK, "error", dbMessage(error));
  flash(BACK, "ok", status === "traite" ? "Message classé." : "Message remis à répondre.");
}

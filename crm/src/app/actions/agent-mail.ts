"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash } from "@/lib/data";
import { sendMail } from "@/lib/mail";
import { logEmail } from "@/lib/email-log";
import { loadRecipients, pickRecipients } from "@/lib/recipients";

const BACK = "/jarvis";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Valide un e-mail proposé par un agent ET l'envoie. L'e-mail part aux adresses cochées (celles de la fiche client ou une adresse ajoutée par vous),
 * jamais à une adresse fournie par l'agent. La proposition n'est marquée « exécutée » qu'après l'envoi réel.
 */
export async function approveAndSendEmailAction(id: string, fd: FormData) {
  await requireOwner();
  const sb = createClient();
  const { data: a } = await sb.from("jarvis_actions").select("id, kind, status, payload, agent_key").eq("id", id).maybeSingle();
  if (!a || a.kind !== "send_email" || a.status !== "proposed") flash(BACK, "error", "Cette proposition n'existe plus ou a déjà été traitée.");
  const p = (a!.payload ?? {}) as { client_id?: string; subject?: string; body?: string };
  if (!p.client_id || !p.subject || !p.body) flash(BACK, "error", "Proposition incomplète : rien n'a été envoyé.");
  const { data: cl } = await sb.from("clients").select("id, name, is_reserved").eq("id", p.client_id!).maybeSingle();
  if (!cl) flash(BACK, "error", "Client introuvable : rien n'a été envoyé.");
  if (cl!.is_reserved) flash(BACK, "error", `${cl!.name} est un contact réservé : aucun e-mail automatique. Contactez-le vous-même.`);
  const { list, invalid } = pickRecipients(fd);
  if (invalid.length) flash(BACK, "error", `Adresse invalide : ${invalid.join(", ")}.`);
  if (!list.length) flash(BACK, "error", "Choisissez au moins un destinataire.");
  const known = (await loadRecipients(sb, cl!.id)).map((r) => r.email.toLowerCase());
  const extra = list.filter((e) => !known.includes(e.toLowerCase()));
  const r = await sendMail({ to: list, subject: p.subject!, text: p.body!, html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${esc(p.body!)}</div>` });
  for (const to of list) await logEmail(sb, { kind: "agent", to, subject: p.subject, ok: r.sent, error: r.sent ? undefined : r.reason, entity: "client", entityId: cl!.id });
  if (!r.sent) flash(BACK, "error", `E-mail NON envoyé : ${r.reason}. La proposition reste à valider.`);
  const { error } = await sb.rpc("jarvis_mark_sent", { p_id: id, p_result: `E-mail envoyé à ${list.join(", ")}${extra.length ? " (dont une adresse ajoutée par vous)" : ""}.` });
  revalidatePath(BACK);
  if (error) flash(BACK, "error", `E-mail envoyé, mais l'enregistrement a échoué : ${dbMessage(error)}`);
  flash(BACK, "ok", `E-mail envoyé à ${list.join(", ")}.`);
}

"use server";
// Actions PUBLIQUES (page de signature du client) : le lien secret fait office d'accès. Voir tests/direct-access.test.ts.

import { headers } from "next/headers";
import { sendMail, mailConfigured } from "@/lib/mail";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { signatureDoneEmail } from "@/lib/mail-templates";
import { CONTACT_EMAIL } from "@/lib/mail-identity";
import { isSignatureToken, parseSignaturePng, sha256Hex, stampSigned } from "@/lib/signature";

/** Signature par le client (page publique). Contrôle la saisie, fige le document signé, prévient le client et le patron. */
export async function signDocumentAction(token: string, name: string, pngDataUrl: string, accepted: boolean): Promise<{ error?: string; ok?: true }> {
  if (!isSignatureToken(token)) return { error: "Lien invalide." };
  const clean = name.replace(/\s+/g, " ").trim();
  if (!accepted) return { error: "Cochez « Lu et approuvé » pour signer." };
  if (clean.length < 3 || clean.length > 120) return { error: "Tapez votre nom et prénom." };
  const png = parseSignaturePng(pngDataUrl);
  if (!png) return { error: "Dessinez votre signature dans le cadre." };
  const a = automationClient();
  const { data: v } = await a.rpc("signature_view", { p_token: token });
  const view = v as { status: string; doc_number: string; kind: string; email: string; company: string } | null;
  if (!view) return { error: "Lien inconnu." };
  if (view.status === "signe") return { ok: true };
  if (view.status !== "en_attente") return { error: view.status === "expire" ? "Ce lien a expiré : demandez-en un nouveau." : "Ce document n'est plus à signer." };
  const { data: b64 } = await a.rpc("signature_pdf", { p_token: token, p_signed: false });
  if (typeof b64 !== "string") return { error: "Document introuvable." };
  const original = new Uint8Array(Buffer.from(b64, "base64"));
  const h = headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  const ua = h.get("user-agent") ?? "inconnu";
  const signed = await stampSigned(original, { docNumber: view.doc_number, docHash: sha256Hex(original), name: clean, email: view.email, ip, ua, at: new Date(), png, company: view.company });
  const done = await a.rpc("automation_signature_complete", { p_secret: automationSecret(), p_token: token, p_name: clean, p_png: pngDataUrl, p_ip: ip, p_ua: ua, p_signed_pdf: Buffer.from(signed).toString("base64") });
  if (done.error) return { error: done.error.message.replace(/^[A-Z_]{4,}:\s*/, "") };
  const res = done.data as { already?: boolean; doc_number: string; kind: string; email: string };
  if (!res.already && mailConfigured()) {
    const m = signatureDoneEmail({ company: view.company, kind: res.kind as "devis" | "contrat", number: res.doc_number, name: clean });
    const att = { filename: `${res.doc_number}-signe.pdf`, bytes: signed };
    await sendMail({ to: res.email, subject: m.subject, text: m.text, html: m.html, fromName: m.fromName, attachment: att }).catch(() => undefined);
    await sendMail({ to: process.env.MAIL_ADMIN ?? CONTACT_EMAIL, subject: `Signé : ${res.kind === "devis" ? "devis" : "contrat"} ${res.doc_number} par ${clean}`, text: `${clean} (${res.email}) vient de signer ${res.doc_number} en ligne. Le document signé est joint et gardé dans le CRM.`, attachment: att }).catch(() => undefined);
  }
  return { ok: true };
}

export async function refuseDocumentAction(token: string, reason: string): Promise<{ ok: true } | { error: string }> {
  if (!isSignatureToken(token)) return { error: "Lien invalide." };
  const { error } = await automationClient().rpc("automation_signature_refuse", { p_secret: automationSecret(), p_token: token, p_reason: reason.slice(0, 500) });
  return error ? { error: "Impossible d'enregistrer votre réponse." } : { ok: true };
}

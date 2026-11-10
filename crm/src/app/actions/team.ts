"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, str } from "@/lib/data";
import { sendMail, mailConfigured } from "@/lib/mail";
import { isRole, permsFromForm, ROLES, SECTIONS, type Perms } from "@/lib/team";

const BACK = "/parametres";
const sha = (c: string) => createHash("sha256").update(c).digest("hex");
const origin = () => { const h = headers(); return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`; };
const describe = (p: Perms) => SECTIONS.filter((s) => p[s.key]).map((s) => `${s.label} (${p[s.key] === "write" ? "modification" : "lecture"})`).join(", ") || "aucune section pour l'instant";

async function createInvite(email: string, label: string | null, role: string, perms: Perms) {
  const code = randomBytes(5).toString("hex").toUpperCase();
  const { error } = await createClient().rpc("team_invite", { p_email: email, p_label: label, p_role: role, p_perms: perms, p_code_hash: sha(code) });
  if (error) {
    const m = error.message;
    if (/EMAIL_PATRON/.test(m)) flash(BACK, "error", "C'est votre propre adresse : vous êtes déjà le patron.");
    if (/EMAIL_INVALIDE/.test(m)) flash(BACK, "error", "Adresse e-mail invalide.");
    if (/does not exist|PGRST202/.test(m)) flash(BACK, "error", "L'équipe n'est pas encore installée sur cette base (migration 0040).");
    flash(BACK, "error", dbMessage(error));
  }
  const url = `${origin()}/invitation`;
  // Un e-mail d'invitation part si la messagerie est configurée ; sinon (ou en cas d'échec) l'adresse et le code s'affichent ici, une seule fois.
  let mailed = false;
  if (mailConfigured()) {
    const r = await sendMail({
      to: email,
      subject: "Invitation à rejoindre ProClean Empire",
      text: `Bonjour,\n\nVous êtes invité(e) à rejoindre l'espace de gestion de ProClean Empire.\n\n1. Ouvrez : ${url}\n2. Créez votre compte avec CETTE adresse e-mail (${email}).\n3. Saisissez le code d'invitation : ${code} (valable 7 jours).\n\nVos accès : ${describe(perms)}.\n\nÀ bientôt,\nProClean Empire`
    });
    mailed = r.sent;
  }
  cookies().set("team_invite", JSON.stringify({ email, code, url, mailed }), { httpOnly: true, secure: true, sameSite: "strict", path: "/parametres", maxAge: 120 });
  revalidatePath(BACK);
  return mailed;
}

export async function inviteTeamAction(fd: FormData) {
  await requireOwner();
  const email = (str(fd, "email") ?? "").toLowerCase();
  const role = isRole(str(fd, "role")) ? (str(fd, "role") as string) : "autre";
  const perms = permsFromForm((n) => fd.get(n));
  const mailed = await createInvite(email, str(fd, "label"), role, perms);
  flash(BACK, "ok", mailed ? "Invitation envoyée par e-mail. Le code s'affiche aussi ci-dessous (une seule fois)." : "Invitation créée : transmettez l'adresse et le code ci-dessous (affichés une seule fois).");
}

export async function updateTeamMemberAction(id: string, fd: FormData) {
  await requireOwner();
  const role = isRole(str(fd, "role")) ? (str(fd, "role") as string) : "autre";
  const { error } = await createClient().from("team_members").update({ role, label: str(fd, "label"), perms: permsFromForm((n) => fd.get(n)), updated_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
  if (error) flash(BACK, "error", dbMessage(error));
  revalidatePath(BACK);
  flash(BACK, "ok", "Accès mis à jour : c'est effectif tout de suite.");
}

export async function revokeTeamMemberAction(id: string) {
  await requireOwner();
  const { error } = await createClient().from("team_members").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
  if (error) flash(BACK, "error", dbMessage(error));
  revalidatePath(BACK);
  flash(BACK, "ok", "Accès retiré : cette personne n'a plus accès à rien.");
}

/** Nouveau code pour une invitation non utilisée ou expirée : mêmes rôle et droits, l'ancien code cesse de marcher. */
export async function reinviteTeamMemberAction(id: string) {
  await requireOwner();
  const { data: m } = await createClient().from("team_members").select("email, label, role, perms, user_id").eq("id", id).is("revoked_at", null).maybeSingle();
  if (!m) flash(BACK, "error", "Invitation introuvable.");
  if ((m as any).user_id) flash(BACK, "error", "Cette personne a déjà activé son accès.");
  const mm = m as any;
  const mailed = await createInvite(mm.email, mm.label, mm.role in ROLES ? mm.role : "autre", mm.perms ?? {});
  flash(BACK, "ok", mailed ? "Nouvelle invitation envoyée par e-mail." : "Nouveau code créé : transmettez-le (affiché une seule fois).");
}

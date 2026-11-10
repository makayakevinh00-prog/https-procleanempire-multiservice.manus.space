import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requestCache } from "@/lib/request-cache";

/**
 * Vrai si la session courante est celle du patron (règle `is_owner()` de la base, qui est la référence).
 * Faux sans session, avec un autre compte, ou si la base répond par une erreur.
 */
async function checkOwner(): Promise<boolean> {
  const { data, error } = await createClient().rpc("is_owner");
  return !error && data === true;
}
/** Une seule vérification par requête : la mise en page, la page et l'action partagent le même résultat (la base reste la référence). */
export const isOwner = requestCache(checkOwner);

/**
 * À appeler en PREMIÈRE ligne de chaque action serveur réservée au patron.
 * Une action serveur Next.js est un point d'entrée HTTP appelable directement, même si le bouton n'est pas affiché :
 * le middleware et la mise en page ne suffisent donc pas.
 */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) throw new Error("ACCES_REFUSE");
}

async function checkAccountant(): Promise<boolean> {
  const { data, error } = await createClient().rpc("is_accountant");
  return !error && data === true;
}
/** Vrai pour le compte comptable invité par le patron (accès en lecture seule à la comptabilité, jamais au reste). */
export const isAccountant = requestCache(checkAccountant);
/** Peut voir la page Comptabilité : le patron ou son comptable. */
export async function canViewAccounting(): Promise<boolean> { return (await isOwner()) || (await isAccountant()); }

import { can, sanitizePerms, type Level, type Perms, type SectionKey } from "@/lib/team";

export type Access = { kind: "owner" } | { kind: "team"; role: string; label: string | null; perms: Perms } | { kind: "accountant" } | { kind: "none" };
async function loadAccess(): Promise<Access> {
  const { data, error } = await createClient().rpc("my_access");
  if (error || !data) return { kind: "none" };
  const d = data as any;
  if (d.kind === "owner") return { kind: "owner" };
  if (d.kind === "team") return { kind: "team", role: String(d.role ?? "autre"), label: d.label ?? null, perms: sanitizePerms(d.perms) };
  if (d.kind === "accountant") return { kind: "accountant" };
  return { kind: "none" };
}
/** Qui est connecté : patron, membre de l'équipe (avec ses droits), comptable invité ou personne. Une lecture par requête. */
export const getAccess = requestCache(loadAccess);

/**
 * À appeler en PREMIÈRE ligne d'une action serveur ouverte à l'équipe : le patron passe toujours ; un membre doit avoir le niveau demandé sur la section.
 * La base refuse de toute façon les écritures sans droit (politiques RLS) ; ce contrôle donne un refus clair et évite tout travail inutile.
 */
export async function requireAccess(section: SectionKey, need: Level = "write"): Promise<void> {
  const a = await getAccess();
  if (a.kind === "owner") return;
  if (a.kind === "team" && can(a.perms, section, need)) return;
  throw new Error("ACCES_REFUSE");
}

/** Peut lire une section : le patron, ou un membre de l'équipe à qui le patron l'a ouverte (routes de documents et de photos). */
export async function canRead(section: SectionKey): Promise<boolean> {
  const a = await getAccess();
  return a.kind === "owner" || (a.kind === "team" && can(a.perms, section, "read"));
}

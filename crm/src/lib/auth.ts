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

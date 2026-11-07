import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Vrai si la session courante est celle du patron (règle `is_owner()` de la base, qui est la référence).
 * Faux sans session, avec un autre compte, ou si la base répond par une erreur.
 */
export async function isOwner(): Promise<boolean> {
  const { data, error } = await createClient().rpc("is_owner");
  return !error && data === true;
}

/**
 * À appeler en PREMIÈRE ligne de chaque action serveur réservée au patron.
 * Une action serveur Next.js est un point d'entrée HTTP appelable directement, même si le bouton n'est pas affiché :
 * le middleware et la mise en page ne suffisent donc pas.
 */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) throw new Error("ACCES_REFUSE");
}

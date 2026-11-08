import "server-only";
import { createClient } from "@/lib/supabase/server";
import { allowedRedirect, validChallenge } from "@/lib/oauth";

/** Vérifie la demande d'autorisation contre le client inscrit. Retourne le client, ou un message d'erreur : on ne redirige JAMAIS vers une adresse non inscrite. */
export async function checkAuthRequest(p: { client_id?: string; redirect_uri?: string; code_challenge?: string; code_challenge_method?: string; response_type?: string }) {
  if (p.response_type !== "code") return { ok: false as const, error: "Type de réponse non pris en charge." };
  if (!p.client_id || !p.redirect_uri || !p.code_challenge) return { ok: false as const, error: "Demande incomplète." };
  if (p.code_challenge_method !== "S256" || !validChallenge(p.code_challenge)) return { ok: false as const, error: "La protection PKCE (S256) est obligatoire." };
  if (!allowedRedirect(p.redirect_uri)) return { ok: false as const, error: "Adresse de retour non autorisée." };
  const { data } = await createClient().from("oauth_clients").select("client_id, client_name, redirect_uris").eq("client_id", p.client_id).maybeSingle();
  if (!data || !(data.redirect_uris as string[]).includes(p.redirect_uri)) return { ok: false as const, error: "Application inconnue ou adresse de retour non inscrite." };
  return { ok: true as const, client: data as { client_id: string; client_name: string | null; redirect_uris: string[] } };
}

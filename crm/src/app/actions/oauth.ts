"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/oauth";
import { checkAuthRequest } from "@/lib/oauth-check";

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const back = (uri: string, params: Record<string, string>) => { const u = new URL(uri); for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v); return u.toString(); };

/** Le patron autorise Claude : un jeton d'agent « JARVIS Core » est créé (révocable dans Paramètres > Agents) et un code à usage unique est renvoyé à Claude. */
export async function approveOAuthAction(fd: FormData) {
  await requireOwner();
  const req = { client_id: field(fd, "client_id"), redirect_uri: field(fd, "redirect_uri"), code_challenge: field(fd, "code_challenge"), code_challenge_method: field(fd, "code_challenge_method"), response_type: field(fd, "response_type") };
  const c = await checkAuthRequest(req);
  if (!c.ok) redirect(`/authorize/erreur?m=${encodeURIComponent(c.error)}`);
  const sb = createClient();
  const token = randomBytes(32).toString("hex"), code = randomBytes(32).toString("hex");
  const a = await sb.from("agent_connectors").insert({ agent_key: "core", label: `Connexion Claude (${c.client.client_name ?? "Claude"})`, token_hash: sha256Hex(token) });
  if (a.error) redirect(back(req.redirect_uri, { error: "server_error", state: field(fd, "state") }));
  const k = await sb.from("oauth_codes").insert({ code_hash: sha256Hex(code), client_id: req.client_id, redirect_uri: req.redirect_uri, code_challenge: req.code_challenge, access_token: token, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  if (k.error) redirect(back(req.redirect_uri, { error: "server_error", state: field(fd, "state") }));
  redirect(back(req.redirect_uri, { code, state: field(fd, "state") }));
}

export async function denyOAuthAction(fd: FormData) {
  await requireOwner();
  const c = await checkAuthRequest({ client_id: field(fd, "client_id"), redirect_uri: field(fd, "redirect_uri"), code_challenge: field(fd, "code_challenge"), code_challenge_method: field(fd, "code_challenge_method"), response_type: field(fd, "response_type") });
  if (!c.ok) redirect(`/authorize/erreur?m=${encodeURIComponent(c.error)}`);
  redirect(back(field(fd, "redirect_uri"), { error: "access_denied", state: field(fd, "state") }));
}

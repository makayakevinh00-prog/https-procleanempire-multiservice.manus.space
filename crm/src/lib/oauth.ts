import { createHash } from "node:crypto";

export const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");
/** PKCE S256 : base64url(SHA-256(verifier)). */
export const s256 = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
export const validVerifier = (v: string) => /^[A-Za-z0-9._~-]{43,128}$/.test(v);
export const validChallenge = (c: string) => /^[A-Za-z0-9_-]{43}$/.test(c);

/** Adresses de retour acceptées : Claude (https) et localhost (Claude Code en ligne de commande). */
export const allowedRedirect = (u: string) => /^https:\/\/(claude\.ai|claude\.com|www\.claude\.ai)(\/|$)/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(u);

export const protectedResourceMetadata = (origin: string) => ({
  resource: `${origin}/api/mcp`, authorization_servers: [origin], bearer_methods_supported: ["header"], scopes_supported: ["crm"], resource_name: "CRM ProClean Empire"
});
export const authServerMetadata = (origin: string) => ({
  issuer: origin, authorization_endpoint: `${origin}/authorize`, token_endpoint: `${origin}/token`, registration_endpoint: `${origin}/register`,
  response_types_supported: ["code"], grant_types_supported: ["authorization_code"], code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none"], scopes_supported: ["crm"]
});
export const resourceMetadataUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource/api/mcp`;

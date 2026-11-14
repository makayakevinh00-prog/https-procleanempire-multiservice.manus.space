import { agentClient } from "@/lib/agent";

/** API des conciergeries : clé « pk_… » dans l'en-tête Authorization: Bearer. La base vérifie la clé à chaque appel. */
export function apiKey(req: Request): string | null {
  const m = /^Bearer\s+(pk_[0-9a-f]{48})$/.exec(req.headers.get("authorization") ?? "");
  return m ? m[1]! : null;
}
export const apiError = (message: string, status: number) => Response.json({ error: message }, { status });
export function apiFail(message: string) {
  const denied = /ACCES_REFUSE/.test(message), missing = /INTROUVABLE/.test(message);
  return apiError(message.replace(/^[A-Z_]+:\s*/, ""), denied ? 401 : missing ? 404 : 422);
}
export const partnerDb = () => agentClient();

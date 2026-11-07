import "server-only";
import type { createClient } from "@/lib/supabase/server";

/** Trace d'un e-mail envoyé depuis l'interface (jamais bloquante). */
export async function logEmail(
  supabase: ReturnType<typeof createClient>,
  e: { kind: string; to: string; subject?: string; ok: boolean; error?: string; entity?: string; entityId?: string }
) {
  try {
    await supabase.from("email_log").insert({
      kind: e.kind, to_email: e.to, subject: e.subject ?? null, ok: e.ok, error: e.error ?? null,
      entity: e.entity ?? null, entity_id: e.entityId ?? null, origin: "manuel"
    });
  } catch { /* le journal ne doit jamais empêcher un envoi */ }
}

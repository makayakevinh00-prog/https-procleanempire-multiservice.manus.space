import { createClient } from "@supabase/supabase-js";
import { mailConfigured, sendMail } from "@/lib/mail";
import type { Deps } from "./run";

/** Client « automatisation » : clé publique + secret d'automatisation (aucune clé service_role nécessaire). */
export function automationClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
}

export function automationSecret(): string {
  const secret = process.env.AUTOMATION_SECRET;
  if (!secret) throw new Error("AUTOMATION_SECRET manquante (variable d'environnement Vercel)");
  return secret;
}

export function realDeps(): Deps {
  const secret = automationSecret();
  const sb = automationClient();
  return {
    secret,
    rpc: async (name, args) => {
      const r = await sb.rpc(name, args);
      return { data: r.data, error: r.error ? { message: r.error.message } : null };
    },
    sendMail,
    mailConfigured
  };
}

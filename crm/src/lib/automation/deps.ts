import "server-only";
import { createClient } from "@supabase/supabase-js";
import { noStoreFetch } from "@/lib/supabase/no-store";
import { mailConfigured, sendMail } from "@/lib/mail";
import { fetchCredits, isCustomerPayment } from "@/lib/qonto";
import type { Deps } from "./run";

const bankConfigured = () => Boolean(process.env.QONTO_ACCESS_TOKEN || (process.env.QONTO_ORGANIZATION_SLUG && process.env.QONTO_SECRET_KEY));
/** La banque ne doit jamais bloquer le passage quotidien : au-delà de 12 secondes, la vérification est abandonnée (et signalée). */
const within = <T,>(p: Promise<T>, ms: number): Promise<T> => Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error("la banque ne répond pas")), ms))]);

/** Client « automatisation » : clé publique + secret d'automatisation (aucune clé service_role nécessaire). */
export function automationClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false }, global: { fetch: noStoreFetch } });
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
    mailConfigured,
    // Virements reçus (lecture seule) : sert à ne pas relancer une facture dont le règlement vient d'arriver à la banque.
    recentCredits: bankConfigured()
      ? async (since) => (await within(fetchCredits(since), 12_000)).filter((t) => isCustomerPayment(t))
          .map((t) => ({ id: t.transaction_id, amount: t.amount, date: (t.settled_at ?? t.emitted_at ?? "").slice(0, 10), label: t.label, reference: t.reference }))
      : undefined
  };
}

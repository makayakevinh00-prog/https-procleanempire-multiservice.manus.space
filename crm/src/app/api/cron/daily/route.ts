import { realDeps } from "@/lib/automation/deps";
import { runDaily } from "@/lib/automation/run";
import { syncQonto } from "@/lib/qonto";
import { createAdmin } from "@/lib/supabase/server";
import { runConcierge } from "@/lib/concierge/run";
import { addDays, isoWeekday, parisToday } from "@/lib/domain/dates";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { sendMail, mailConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche quotidienne unique (le plan Vercel gratuit n'autorise qu'un passage par jour) :
 *  - fin de mois : factures du mois (validées seulement si toutes les conditions sont remplies) ;
 *  - envoi des factures émises, relances de factures et de devis, récapitulatif au patron ;
 *  - synchronisation Qonto si la clé service_role est configurée.
 * Paramètres de test (avec le secret) : ?dry=1 (simulation) · ?month=2026-11&force=1 · ?send=1
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const p = new URL(req.url).searchParams;
  const opts = { month: p.get("month") ?? undefined, forceGenerate: p.get("force") === "1", forceSend: p.get("send") === "1", dryRun: p.get("dry") === "1" };

  let automation;
  try {
    automation = await runDaily(realDeps(), opts);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  let qonto: unknown = "non configuré";
  if (!opts.dryRun && process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.QONTO_ACCESS_TOKEN || process.env.QONTO_SECRET_KEY)) {
    try { qonto = await syncQonto(createAdmin()); } catch (e) { qonto = { error: (e as Error).message }; }
  }
  let concierge: unknown = "non configuré";
  if (!opts.dryRun && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try { concierge = await runConcierge(createAdmin(), parisToday()); } catch (e) { concierge = { error: (e as Error).message }; }
  }
  // Nettoyeurs : publication automatique des ménages, et chaque lundi création (jamais virement) des paiements de la semaine passée.
  let nettoyeurs: unknown = "non configuré";
  if (!opts.dryRun) {
    try {
      const a = automationClient(), sec = automationSecret(), today = parisToday();
      const pub = await a.rpc("automation_publish_cleaning_jobs", { p_secret: sec });
      let payouts: unknown = null;
      if (isoWeekday(today) === 1) {
        const mon = addDays(today, -7), sun = addDays(today, -1);
        const r = await a.rpc("automation_create_payouts", { p_secret: sec, p_start: mon, p_end: sun });
        payouts = r.data ?? r.error?.message ?? null;
        const d = r.data as { payouts?: number; total?: number } | null;
        if (d?.payouts && mailConfigured()) await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: `Paiements nettoyeurs à régler : ${d.total} €`, text: `${d.payouts} paiement(s) créé(s) pour la semaine du ${mon} au ${sun}, soit ${d.total} € au total.\n\nÀ régler par virement : CRM › Nettoyeurs › Paiements (fichier de virements prêt pour Qonto).` }).catch(() => undefined);
      }
      nettoyeurs = { published: pub.data ?? pub.error?.message ?? null, payouts };
    } catch (e) { nettoyeurs = { error: (e as Error).message }; }
  }
  return Response.json({ automation, qonto, concierge, nettoyeurs });
}

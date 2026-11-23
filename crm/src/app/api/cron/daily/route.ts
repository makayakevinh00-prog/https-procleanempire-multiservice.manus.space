import { realDeps } from "@/lib/automation/deps";
import { runDaily } from "@/lib/automation/run";
import { syncQonto } from "@/lib/qonto";
import { createAdmin } from "@/lib/supabase/server";
import { runConcierge } from "@/lib/concierge/run";
import { addDays, isoWeekday, parisToday } from "@/lib/domain/dates";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { sendMail, mailConfigured } from "@/lib/mail";
import { photoReminderEmail } from "@/lib/mail-templates";
import { syncMarketplace } from "@/lib/marketplace/sync";

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
  // Trajets des nettoyeurs : les points de plus de 7 jours sont effacés.
  if (!opts.dryRun) { try { await automationClient().rpc("automation_purge_trail", { p_secret: automationSecret() }); } catch { /* sans gravité : réessayé demain */ } }
  // Nettoyeurs : publication automatique des ménages, et chaque lundi création (jamais virement) des paiements de la semaine passée.
  let nettoyeurs: unknown = "non configuré";
  if (!opts.dryRun) {
    try {
      const a = automationClient(), sec = automationSecret(), today = parisToday();
      const sync = await syncMarketplace({ force: true });
      let payouts: unknown = null;
      if (isoWeekday(today) === 1) {
        const mon = addDays(today, -7), sun = addDays(today, -1);
        const r = await a.rpc("automation_create_payouts", { p_secret: sec, p_start: mon, p_end: sun });
        payouts = r.data ?? r.error?.message ?? null;
        const d = r.data as { payouts?: number; total?: number } | null;
        if (d?.payouts && mailConfigured()) await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: `Paiements nettoyeurs à régler : ${d.total} €`, text: `${d.payouts} paiement(s) créé(s) pour la semaine du ${mon} au ${sun}, soit ${d.total} € au total.\n\nÀ régler par virement : CRM › Nettoyeurs › Paiements (fichier de virements prêt pour Qonto).` }).catch(() => undefined);
      }
      // Alerte : ménages sans nettoyeur aujourd'hui ou demain.
      const un = await a.rpc("automation_unfilled_jobs", { p_secret: sec, p_days: 1 });
      const left = (un.data ?? []) as { title: string; date: string; city: string | null }[];
      if (left.length && mailConfigured()) await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: `${left.length} ménage(s) sans nettoyeur d'ici demain`, text: `Personne n'a encore accepté :\n\n${left.map((j) => `• ${j.date} — ${j.title}${j.city ? ` (${j.city})` : ""}`).join("\n")}\n\nÀ pourvoir vous-même ou à attribuer : CRM › Nettoyeurs.` }).catch(() => undefined);
      nettoyeurs = { sync, unfilled: left.length, payouts };
    } catch (e) { nettoyeurs = { error: (e as Error).message }; }
  }
  // Agents : hier, ni arrivée pointée ni photo, et l'application n'est pas installée → rappel par e-mail (une seule fois par mission).
  let photos: unknown = "non configuré";
  if (!opts.dryRun && mailConfigured()) {
    try {
      const a = automationClient(), sec = automationSecret(), yesterday = addDays(parisToday(), -1);
      const r = await a.rpc("automation_photo_reminders", { p_secret: sec, p_day: yesterday });
      const items = (r.data ?? []) as { intervention_id: string; staff_id: string; name: string; email: string; client: string; address: string | null; date: string; arrived: boolean }[];
      let sent = 0;
      for (const it of items) {
        const day = new Date(`${it.date}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        const m = photoReminderEmail({ company: "ProClean Empire", name: it.name, client: it.client, address: it.address, date: day, arrived: it.arrived, appUrl: `https://proclean-crm.vercel.app/connexion` });
        const res = await sendMail({ to: it.email, subject: m.subject, text: m.text, html: m.html, fromName: m.fromName }).catch(() => ({ sent: false as const }));
        if (res.sent) { sent++; await a.rpc("automation_photo_reminder_done", { p_secret: sec, p_intervention: it.intervention_id, p_staff: it.staff_id }); }
      }
      photos = { candidates: items.length, sent };
    } catch (e) { photos = { error: (e as Error).message }; }
  }
  // Premier passage de l'entreprise sur un site demain : une tâche pour le patron (enregistrer le site : vidéo, photos, particularités).
  let premiers: unknown = "ignoré";
  if (!opts.dryRun) {
    try {
      const r = await automationClient().rpc("automation_first_visit_tasks", { p_secret: automationSecret(), p_day: addDays(parisToday(), 1) });
      premiers = r.error ? { error: r.error.message } : { created: r.data };
    } catch (e) { premiers = { error: (e as Error).message }; }
  }
  return Response.json({ automation, qonto, concierge, nettoyeurs, photos, premiers });
}

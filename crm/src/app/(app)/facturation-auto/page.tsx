import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { automationClient } from "@/lib/automation/deps";
import { mailConfigured } from "@/lib/mail";
import { getSettings, numOrNull } from "@/lib/data";
import { planMonthlyInvoices } from "@/lib/domain/billing-plan";
import { contractIssues } from "@/lib/domain/contract-check";
import { monthBounds, monthLabel, monthOf, parisToday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { generateDraftsNowAction, sendTestEmailAction, setAutoSendAllAction, toggleClientAutoSendAction } from "@/app/actions/auto-billing";
import { formatEUR } from "@/lib/utils";

type Level = "ok" | "ko" | "warn";
const ICON: Record<Level, string> = { ok: "✅", ko: "❌", warn: "⚠️" };

/** Prochain passage de la tâche quotidienne (18 h UTC), exprimé en heure de Paris. */
function nextRun(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0));
  if (d <= now) d.setUTCDate(d.getUTCDate() + 1);
  return d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export default async function AutoBillingPage() {
  const supabase = createClient();
  const settings = await getSettings(supabase);
  const today = parisToday();
  const month = monthOf(today);
  const secret = process.env.AUTOMATION_SECRET;
  const mail = mailConfigured();

  let plan: ReturnType<typeof planMonthlyInvoices> = [];
  let loadError: string | null = null;
  if (secret) {
    const { data, error } = await automationClient().rpc("automation_month_data", { p_secret: secret, p_month: month });
    if (error) loadError = error.message;
    else plan = planMonthlyInvoices({ month, today, settings: { ...data.settings, auto_invoicing_start_month: "2000-01" }, clients: data.clients, contracts: data.contracts, interventions: data.interventions, invoicedClientIds: data.invoiced_clients });
  }
  const [{ data: generated }, { data: pending }, { data: clients }, { data: contracts }, { data: runs }, { data: failedMails }] = await Promise.all([
    supabase.from("invoices").select("id, number, status, total_ht, total_ttc, sent_at, clients(id, name, is_reserved)").eq("billing_month", month).neq("status", "annule"),
    supabase.from("invoices").select("id, number, clients(name)").not("billing_month", "is", null).is("sent_at", null).in("status", ["envoye", "en_retard"]),
    supabase.from("clients").select("id, name, email, is_reserved, status, auto_send_invoices").neq("status", "inactif").order("name"),
    supabase.from("contracts").select("*").eq("status", "actif"),
    supabase.from("automation_runs").select("*").order("ran_at", { ascending: false }).limit(1),
    supabase.from("email_log").select("id, sent_at, kind, to_email, error").eq("ok", false).eq("acknowledged", false).gte("sent_at", new Date(Date.now() - 7 * 86_400_000).toISOString()).order("sent_at", { ascending: false }).limit(5)
  ]);

  const eligible = (clients ?? []).filter((c: any) => !c.is_reserved);
  const authorized = eligible.filter((c: any) => c.auto_send_invoices);
  const noEmail = (clients ?? []).filter((c: any) => !c.email);
  const incomplete = (contracts ?? []).filter((k: any) => contractIssues({ ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht), hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) }).blocking.length + contractIssues({ ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht), hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) }).warnings.length > 0);
  const noDays = (contracts ?? []).filter((k: any) => !k.weekdays?.length);
  const last = runs?.[0] as any;
  const lastErrors: string[] = last?.errors ?? [];

  const enabled = settings.auto_invoicing_enabled;
  const checks: { level: Level; label: string; detail?: React.ReactNode }[] = [
    { level: enabled ? "ok" : "ko", label: `Facturation automatique : ${enabled ? "ACTIVÉE" : "DÉSACTIVÉE"}`, detail: enabled ? `Premier mois facturé : ${monthLabel(settings.auto_invoicing_start_month)}.` : <>Aucune facture ne sera préparée ni envoyée. <Link href="/parametres" className="text-primary hover:underline">Activer dans les paramètres</Link>.</> },
    { level: mail ? "ok" : "ko", label: `Envoi d'e-mails : ${mail ? "configuré" : "NON configuré"}`, detail: mail ? undefined : "Ajoutez la variable RESEND_API_KEY (clé Resend) dans les paramètres Vercel du projet CRM : sans elle, aucun e-mail ne part." },
    { level: secret ? "ok" : "ko", label: `Secret d'automatisation : ${secret ? "présent" : "ABSENT"}`, detail: secret ? undefined : "Variable AUTOMATION_SECRET manquante sur Vercel." },
    { level: authorized.length ? "ok" : "ko", label: `Clients autorisés à l'envoi automatique : ${authorized.length} sur ${eligible.length}`, detail: authorized.length ? "Les contacts réservés sont toujours exclus." : "Aucun client n'est coché : toutes les factures resteront en brouillon." },
    { level: noDays.length ? "warn" : "ok", label: `Planning automatique : ${settings.auto_planning_enabled ? "activé" : "désactivé"}`, detail: noDays.length ? <>{noDays.length} contrat(s) actif(s) sans jours de passage ne peuvent pas générer de planning. <Link href="/contrats?filtre=incomplets" className="text-primary hover:underline">Voir les contrats à compléter</Link></> : undefined },
    { level: noEmail.length ? "warn" : "ok", label: `Clients sans adresse e-mail : ${noEmail.length}`, detail: noEmail.length ? `${noEmail.slice(0, 4).map((c: any) => c.name).join(", ")}${noEmail.length > 4 ? "…" : ""} : leurs factures resteront en brouillon.` : undefined },
    { level: last ? (last.ok ? "ok" : "warn") : "warn", label: last ? `Dernière exécution : ${new Date(last.ran_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })} — ${last.ok ? "sans erreur" : `${lastErrors.length} erreur(s)`}` : "Dernière exécution : aucune pour l'instant", detail: <>Prochaine exécution : <b>{nextRun()}</b> (heure de Paris). <Link href="/journal" className="text-primary hover:underline">Ouvrir le journal</Link></> },
    { level: (failedMails?.length ?? 0) || lastErrors.length ? "ko" : "ok", label: `Erreurs récentes : ${(failedMails?.length ?? 0) + lastErrors.length}`, detail: (failedMails?.length ?? 0) + lastErrors.length ? <ul className="list-inside list-disc">{lastErrors.map((e, i) => <li key={i}>{e}</li>)}{failedMails?.map((m: any) => <li key={m.id}>e-mail {m.kind} à {m.to_email} : {m.error}</li>)}</ul> : undefined }
  ];

  return (
    <>
      <PageHeader title="Facturation automatique" subtitle={`Prochaine facturation du mois : ${monthBounds(month).end.split("-").reverse().join("/")} au soir${settings.month_end_send_next_day ? " — envoi le lendemain" : ""}.`} />

      <Card className="mb-4">
        <CardHeader><CardTitle>Contrôle de configuration</CardTitle>
          <ConfirmAction action={sendTestEmailAction} label="✉️ Envoyer un e-mail de test" variant="outline" size="sm"
            title="Envoyer un e-mail de test ?" description={`Un e-mail avec un PDF d'exemple est envoyé à ${settings.notify_email ?? settings.company_email}. Aucune facture n'est créée.`} confirmLabel="Envoyer le test" />
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2"><span>{ICON[c.level]}</span><span><b>{c.label}</b>{c.detail && <span className="block text-xs text-muted-foreground">{c.detail}</span>}</span></div>
          ))}
          <p className="border-t pt-3 text-xs text-muted-foreground">
            <b>Garde-fous permanents :</b> jamais pour un contact réservé · jamais au-dessus de {formatEUR(settings.large_amount_threshold_ht)} HT · jamais sans e-mail · jamais deux factures pour le même mois · contrat commencé ou terminé en cours de mois = brouillon à vérifier · une facture n&apos;est marquée « envoyée » qu&apos;après la réussite réelle de l&apos;e-mail. Chaque génération et chaque envoi sont tracés dans le journal.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Aperçu : {monthLabel(month)}</CardTitle>
          {plan.length > 0 && (
            <ConfirmAction action={generateDraftsNowAction.bind(null, month)} label="Préparer les brouillons maintenant" size="sm"
              title={`Préparer ${plan.length} facture(s) brouillon ?`} description="Les factures sont créées en brouillon (sans numéro, rien n'est envoyé). Vous les relisez et validez ensuite dans « Factures »." confirmLabel="Préparer" />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError && <p className="rounded-md bg-red-50 p-3 text-sm text-red-900">{loadError}</p>}
          {!plan.length ? <Empty>Rien à facturer pour {monthLabel(month)} pour l&apos;instant (ou déjà préparé).</Empty> : plan.map((p) => (
            <div key={p.clientId} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ClientName id={p.clientId} name={p.clientName} reserved={p.blockedReasons.includes("contact réservé")} />
                <span className="font-semibold">{formatEUR(p.totals.ht)} HT · {formatEUR(p.totals.ttc)} TTC</span>
              </div>
              <ul className="mt-1.5 list-inside list-disc text-xs text-muted-foreground">
                {p.lines.map((l, i) => <li key={i}>{l.quantity} × {l.description.split("\n")[0]} — {formatEUR(l.unit_price_ht)}</li>)}
              </ul>
              <div className="mt-2">
                {p.autoSend ? <Badge tone="green">Sera émise et envoyée automatiquement</Badge> : <Badge tone="orange">Restera en brouillon : {p.blockedReasons.join(" · ")}</Badge>}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Calcul à partir du planning ({settings.count_planned_as_done ? "passages réalisés ou passés" : "passages marqués réalisés"}) et des forfaits mensuels des contrats actifs. <Link href="/planning" className="text-primary hover:underline">Ouvrir le planning</Link></p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Clients et envoi automatique ({authorized.length}/{eligible.length})</CardTitle>
          <div className="flex gap-2">
            <ConfirmAction action={setAutoSendAllAction.bind(null, true)} label="Tout activer" variant="outline" size="sm" title="Activer pour tous ?" description="Tous les clients actifs (hors contacts réservés) recevront leur facture mensuelle automatiquement. Vous pouvez en décocher à tout moment." confirmLabel="Activer pour tous" />
            <ConfirmAction action={setAutoSendAllAction.bind(null, false)} label="Tout désactiver" variant="ghost" size="sm" title="Désactiver pour tous ?" confirmLabel="Désactiver" />
          </div>
        </CardHeader>
        <ul className="divide-y text-sm">
          {(clients ?? []).map((c: any) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2">
              <span><ClientName id={c.id} name={c.name} reserved={c.is_reserved} />{!c.email && <Badge tone="orange" className="ml-2">pas d&apos;e-mail</Badge>}</span>
              {c.is_reserved ? <Badge tone="red">exclu (contact réservé)</Badge> : (
                <form action={toggleClientAutoSendAction.bind(null, c.id, !c.auto_send_invoices)}>
                  <Button size="sm" variant={c.auto_send_invoices ? "default" : "outline"}>{c.auto_send_invoices ? "✓ Automatique" : "Manuel"}</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {(generated ?? []).some((i: any) => i.status === "brouillon") && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>{(generated ?? []).filter((i: any) => i.status === "brouillon").length} brouillon(s) déjà préparé(s) pour {monthLabel(month)}.</b> Au dernier jour du mois, l&apos;automatisation <b>ne les touche pas</b> (ils peuvent avoir été corrigés) : validez-les vous-même, ou supprimez le brouillon pour que la facture soit refaite et envoyée automatiquement.
        </div>
      )}
      {(generated?.length ?? 0) > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Déjà préparées pour {monthLabel(month)}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {generated!.map((i: any) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                <span><Link href={`/factures/${i.id}`} className="font-medium hover:underline">{i.number ?? "Brouillon"}</Link> — {i.clients.name}</span>
                <span className="flex items-center gap-2">{formatEUR(i.total_ttc)} <StatusBadge status={i.status} />{i.sent_at ? <Badge tone="green">envoyée</Badge> : i.number ? <Badge tone="orange">à envoyer</Badge> : null}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {(pending?.length ?? 0) > 0 && (
        <p className="text-sm text-amber-800">⚠ {pending!.length} facture(s) émise(s) automatiquement en attente d&apos;envoi : {pending!.map((p: any) => p.number).join(", ")}.</p>
      )}
    </>
  );
}

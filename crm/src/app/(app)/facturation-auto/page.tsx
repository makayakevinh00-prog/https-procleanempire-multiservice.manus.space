import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { automationClient } from "@/lib/automation/deps";
import { mailConfigured } from "@/lib/mail";
import { getSettings } from "@/lib/data";
import { planMonthlyInvoices } from "@/lib/domain/billing-plan";
import { monthBounds, monthLabel, monthOf, parisToday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { generateDraftsNowAction, setAutoSendAllAction } from "@/app/actions/auto-billing";
import { formatEUR, formatDate } from "@/lib/utils";

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
  const [{ data: generated }, { data: pending }, { count: autoCount }] = await Promise.all([
    supabase.from("invoices").select("id, number, status, total_ht, total_ttc, sent_at, clients(id, name, is_reserved)").eq("billing_month", month).neq("status", "annule"),
    supabase.from("invoices").select("id, number, clients(name)").not("billing_month", "is", null).is("sent_at", null).in("status", ["envoye", "en_retard"]),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("auto_send_invoices", true)
  ]);

  const enabled = settings.auto_invoicing_enabled;
  const runDay = monthBounds(month).end;
  const checks: [boolean, string, string][] = [
    [enabled, "Facturation automatique activée", "À activer dans Paramètres → Facturation mensuelle automatique."],
    [Boolean(secret), "Secret d'automatisation présent", "Variable AUTOMATION_SECRET manquante sur Vercel."],
    [mail, "Envoi d'e-mails configuré", "Ajoutez la clé RESEND_API_KEY sur Vercel : sans elle, aucune facture ne peut partir."],
    [(autoCount ?? 0) > 0, `${autoCount ?? 0} client(s) avec envoi automatique`, "Cochez « envoi automatique » sur les fiches clients, ou utilisez le bouton ci-dessous."]
  ];

  return (
    <>
      <PageHeader title="Facturation automatique" subtitle={`Prochain passage : ${formatDate(runDay)} au soir${settings.month_end_send_next_day ? " (envoi le lendemain)" : ""}.`} />

      <Card className="mb-4">
        <CardHeader><CardTitle>État du système</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {checks.map(([ok, label, hint]) => (
            <div key={label} className="flex items-start gap-2"><span>{ok ? "✅" : "⚠️"}</span><span><b>{label}</b>{!ok && <span className="block text-xs text-muted-foreground">{hint}</span>}</span></div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Règles : jamais pour un contact réservé · jamais au-dessus de {formatEUR(settings.large_amount_threshold_ht)} HT · jamais sans e-mail · jamais deux factures pour le même mois · contrat commencé ou terminé en cours de mois = brouillon à vérifier. Un récapitulatif est envoyé à {settings.notify_email ?? "contact@procleanempire.com"} après chaque passage.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <ConfirmAction action={setAutoSendAllAction.bind(null, true)} label="Activer l'envoi automatique pour tous les clients" variant="outline" size="sm"
              title="Activer pour tous ?" description="Tous les clients actifs (hors contacts réservés) recevront leur facture mensuelle automatiquement. Vous pouvez décocher un client à tout moment sur sa fiche." confirmLabel="Activer pour tous" />
            <ConfirmAction action={setAutoSendAllAction.bind(null, false)} label="Tout désactiver" variant="ghost" size="sm" title="Désactiver l'envoi automatique pour tous ?" confirmLabel="Désactiver" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Aperçu : {monthLabel(month)}</CardTitle>
          {plan.length > 0 && (
            <ConfirmAction action={generateDraftsNowAction.bind(null, month)} label="Préparer les brouillons maintenant" size="sm"
              title={`Préparer ${plan.length} facture(s) brouillon ?`} description="Les factures sont créées en brouillon (sans numéro, rien n'est envoyé). Elles seront ensuite à valider manuellement, ou ignorées par le passage automatique du soir." confirmLabel="Préparer" />
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
                {p.autoSend ? <Badge tone="green">Émise et envoyée automatiquement</Badge> : <Badge tone="orange">Brouillon à valider : {p.blockedReasons.join(" · ")}</Badge>}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Calcul à partir du planning ({settings.count_planned_as_done ? "passages réalisés ou passés" : "passages marqués réalisés"}) et des forfaits mensuels des contrats actifs. <Link href="/planning" className="text-primary hover:underline">Ouvrir le planning</Link></p>
        </CardContent>
      </Card>

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

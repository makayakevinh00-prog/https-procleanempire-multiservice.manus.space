import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { cookies } from "next/headers";
import { saveSettingsAction, generateCalendarLinkAction, revokeCalendarLinkAction, createAgentConnectorAction, revokeAgentConnectorAction, inviteAccountantAction, revokeAccountantAction } from "@/app/actions/settings";
import { AGENTS } from "@/lib/jarvis/registry";
import { Select } from "@/components/ui/form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { TeamCard } from "@/components/crm/team-card";

export default async function SettingsPage() {
  const supabase = createClient();
  const s = await getSettings(supabase);
  const feed = await supabase.from("calendar_feed").select("set_at").eq("id", 1).maybeSingle();
  const conns = await supabase.from("agent_connectors").select("id, agent_key, label, created_at, last_used_at, revoked_at").order("created_at", { ascending: false });
  const accs = await supabase.from("accountants").select("id, email, label, created_at, claimed_at, revoked_at, code_expires_at").order("created_at", { ascending: false });
  const team = await supabase.from("team_members").select("id, email, label, role, perms, created_at, claimed_at, revoked_at, code_expires_at").order("created_at", { ascending: false });
  let freshTeam: { email: string; code: string; url: string; mailed?: boolean } | null = null;
  try { freshTeam = JSON.parse(decodeURIComponent(cookies().get("team_invite")?.value ?? "null")); } catch { freshTeam = null; }
  let freshAcc: { email: string; code: string; url: string } | null = null;
  try { freshAcc = JSON.parse(decodeURIComponent(cookies().get("accountant_invite")?.value ?? "null")); } catch { freshAcc = null; }
  let freshAgent: { agent: string; url: string } | null = null;
  try { freshAgent = JSON.parse(decodeURIComponent(cookies().get("agent_mcp")?.value ?? "null")); } catch { freshAgent = null; }
  let fresh: { url: string } | null = null;
  try { fresh = JSON.parse(decodeURIComponent(cookies().get("calendar_link")?.value ?? "null")); } catch { fresh = null; }
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <>
      <PageHeader title="Paramètres" />
      <Card className="mb-4">
        <CardHeader><CardTitle>Agents JARVIS</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-secondary-foreground">
          <p>La supervision de vos agents (validation des e-mails proposés, alertes) et l&apos;Open space animé ne sont plus dans le menu. Ils restent disponibles ici.</p>
          <div className="flex flex-wrap gap-3 font-medium">
            <Link href="/jarvis" className="text-primary hover:underline">Supervision JARVIS</Link>
            <Link href="/jarvis/alertes" className="text-primary hover:underline">Alertes</Link>
            <Link href="/jarvis/openspace" className="text-primary hover:underline">Open space</Link>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader><CardTitle>Agents Claude Cowork (connecteur MCP)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-secondary-foreground">
          <p>Chaque agent a son propre lien secret. Il peut lire des chiffres limités (factures ouvertes, paiements à rapprocher, missions, demandes du site), ajouter une tâche et <b className="font-medium text-foreground">proposer</b> un e-mail à un client. Rien ne part sans votre validation dans JARVIS, et l&apos;e-mail est envoyé aux adresses de la fiche client. Les contacts réservés sont exclus.</p>
          {freshAgent && (
            <div className="space-y-2 rounded-xl bg-secondary p-4">
              <div className="font-medium text-foreground">Lien de l&apos;agent « {freshAgent.agent} » : affiché une seule fois</div>
              <input readOnly value={freshAgent.url} aria-label="Lien du connecteur MCP" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-xs" />
              <p className="text-[13px] text-muted-foreground">Dans Claude Cowork : ajoutez un connecteur personnalisé (MCP), collez ce lien, sans autre réglage. Ne le partagez pas : il donne accès à ce que voit l&apos;agent.</p>
            </div>
          )}
          {(conns.data ?? []).length > 0 && (
            <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
              {(conns.data ?? []).map((c: any) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="font-medium text-foreground">{AGENTS.find((a) => a.key === c.agent_key)?.name ?? c.agent_key}</span>
                  {c.label && <span className="text-muted-foreground">{c.label}</span>}
                  <span className="text-[13px] text-muted-foreground">{c.revoked_at ? `révoqué le ${new Date(c.revoked_at).toLocaleDateString("fr-FR")}` : c.last_used_at ? `dernier appel ${new Date(c.last_used_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}` : "jamais utilisé"}</span>
                  {!c.revoked_at && <span className="ml-auto"><ConfirmAction action={revokeAgentConnectorAction.bind(null, c.id)} label="Révoquer" variant="outline" size="sm" title="Révoquer ce lien ?" description="L'agent n'aura plus accès au CRM. Vous pourrez créer un nouveau lien." confirmLabel="Révoquer" /></span>}
                </li>
              ))}
            </ul>
          )}
          <ConfirmAction action={createAgentConnectorAction} label="Créer un lien pour un agent" variant="outline" size="sm" title="Créer un lien pour un agent" confirmLabel="Générer le lien"
            description="Le lien est secret et s'affiche une seule fois."
            extra={<div className="space-y-3"><Field label="Agent"><Select name="agent_key" defaultValue="finance">{AGENTS.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}</Select></Field><Field label="Nom (facultatif)"><Input name="label" placeholder="ex. Cowork de Kevinh" /></Field></div>} />
        </CardContent>
      </Card>
      <TeamCard members={(team.data ?? []) as any[]} fresh={freshTeam} />
      <Card className="mb-4">
        <CardHeader><CardTitle>Accès comptable (votre expert-comptable)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-secondary-foreground">
          <p>Votre comptable a son propre compte, en <b className="font-medium text-foreground">lecture seule</b> : il voit uniquement la page Comptabilité (factures émises, TVA, virements, paiements fournisseurs) et télécharge les factures en PDF (au mois, au trimestre ou à l&apos;année), les exports CSV et un FEC partiel (ventes et encaissements), ainsi que les justificatifs que vous joignez aux paiements fournisseurs. Il ne voit ni vos missions, ni les fiches clients, ni JARVIS, et ne peut rien modifier. Vous pouvez couper son accès en un clic.</p>
          <p><b className="font-medium text-foreground">À savoir :</b> pour les achats, le plus simple est de lui ouvrir aussi Qonto (accès comptable de la banque), où les factures sont déjà jointes aux transactions. Demandez-lui s&apos;il veut un fichier au format du fisc (FEC) ou si les CSV lui suffisent.</p>
          {freshAcc && (
            <div className="space-y-2 rounded-xl bg-secondary p-4">
              <div className="font-medium text-foreground">Invitation pour {freshAcc.email} : affichée une seule fois</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div><div className="mb-1 text-[12px] text-muted-foreground">Adresse de connexion</div><input readOnly value={freshAcc.url} aria-label="Adresse d'activation" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-xs" /></div>
                <div><div className="mb-1 text-[12px] text-muted-foreground">Code d&apos;invitation (valable 7 jours)</div><input readOnly value={freshAcc.code} aria-label="Code d'invitation" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-sm tracking-widest" /></div>
              </div>
              <p className="text-[13px] text-muted-foreground">Il ouvre l&apos;adresse, crée son compte avec <b>cette adresse e-mail</b>, puis saisit le code. Transmettez le code par un autre canal que l&apos;adresse (SMS, téléphone).</p>
            </div>
          )}
          {(accs.data ?? []).length > 0 && (
            <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
              {(accs.data ?? []).map((a: any) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="font-medium text-foreground">{a.email}</span>{a.label && <span className="text-muted-foreground">{a.label}</span>}
                  <span className="text-[13px] text-muted-foreground">{a.revoked_at ? `révoqué le ${new Date(a.revoked_at).toLocaleDateString("fr-FR")}` : a.claimed_at ? `accès actif depuis le ${new Date(a.claimed_at).toLocaleDateString("fr-FR")}` : `invitation en attente (jusqu'au ${new Date(a.code_expires_at).toLocaleDateString("fr-FR")})`}</span>
                  {!a.revoked_at && <span className="ml-auto"><ConfirmAction action={revokeAccountantAction.bind(null, a.id)} label="Révoquer" variant="outline" size="sm" title="Révoquer l'accès du comptable ?" description="Il n'aura plus accès à rien. Vous pourrez l'inviter à nouveau." confirmLabel="Révoquer" /></span>}
                </li>
              ))}
            </ul>
          )}
          <ConfirmAction action={inviteAccountantAction} label="Inviter mon comptable" variant="outline" size="sm" title="Inviter votre comptable" confirmLabel="Créer l'invitation"
            description="Un code d'invitation est généré et s'affiche une seule fois ; une nouvelle invitation remplace la précédente pour la même adresse."
            extra={<div className="space-y-3"><Field label="Adresse e-mail du comptable"><Input name="email" type="email" required placeholder="comptable@cabinet.fr" /></Field><Field label="Nom (facultatif)"><Input name="label" placeholder="ex. Cabinet Dupont" /></Field></div>} />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader><CardTitle>Calendrier Outlook</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-secondary-foreground">
          <p>Vos missions apparaissent dans Outlook (ou Google Agenda, Apple Calendrier) par un abonnement en lecture seule : aucune invitation n&apos;est envoyée, rien n&apos;est modifié dans le CRM depuis le calendrier. Outlook actualise le flux toutes les quelques heures.</p>
          {fresh && (
            <div className="space-y-2 rounded-xl bg-secondary p-4">
              <div className="font-medium text-foreground">Votre lien d&apos;abonnement : affiché une seule fois</div>
              <input readOnly value={fresh.url} aria-label="Lien d'abonnement calendrier" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-xs" />
              <ol className="list-decimal space-y-0.5 pl-5 text-[13px] text-muted-foreground">
                <li>Copiez le lien ci-dessus.</li>
                <li>Dans Outlook : Calendrier, puis « Ajouter un calendrier », puis « S&apos;abonner à partir du web ».</li>
                <li>Collez le lien, donnez-lui un nom (« ProClean missions »), validez.</li>
              </ol>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">{feed.data ? `Lien actif depuis le ${new Date(feed.data.set_at).toLocaleDateString("fr-FR")}` : "Aucun lien actif."}</span>
            <ConfirmAction action={generateCalendarLinkAction} label={feed.data ? "Nouveau lien" : "Créer le lien"} variant="outline" size="sm"
              title="Créer le lien d'abonnement calendrier ?" description={feed.data ? "L'ancien lien cessera immédiatement de fonctionner." : "Le lien est secret : il montre vos missions (clients, adresses, horaires), jamais de montant ni de facture."} confirmLabel="Générer le lien" />
            {feed.data && <ConfirmAction action={revokeCalendarLinkAction} label="Révoquer" variant="outline" size="sm" title="Révoquer le lien calendrier ?" description="Outlook ne recevra plus les missions tant que vous n'aurez pas créé un nouveau lien." confirmLabel="Révoquer" />}
          </div>
        </CardContent>
      </Card>
      <form action={saveSettingsAction} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Société (affichée sur les PDF)</CardTitle></CardHeader>
          <CardContent className={grid}>
            <Field label="Raison sociale"><Input name="company_name" defaultValue={s.company_name} /></Field>
            <Field label="Adresse"><Input name="company_address" defaultValue={s.company_address ?? ""} /></Field>
            <Field label="Téléphone"><Input name="company_phone" defaultValue={s.company_phone ?? ""} /></Field>
            <Field label="E-mail"><Input name="company_email" defaultValue={s.company_email ?? ""} /></Field>
            <Field label="SIRET"><Input name="company_siret" defaultValue={s.company_siret ?? ""} /></Field>
            <Field label="N° TVA intracommunautaire"><Input name="company_vat_number" defaultValue={s.company_vat_number ?? ""} /></Field>
            <Field label="IBAN (pied de facture)"><Input name="company_iban" defaultValue={s.company_iban ?? ""} /></Field>
            <Field label="BIC"><Input name="company_bic" defaultValue={(s as any).company_bic ?? ""} /></Field>
            <Field label="Forme juridique"><Input name="company_legal_form" defaultValue={s.company_legal_form ?? ""} placeholder="SASU" /></Field>
            <Field label="Capital"><Input name="company_capital" defaultValue={s.company_capital ?? ""} placeholder="1 000,00 €" /></Field>
            <Field label="RCS"><Input name="company_rcs" defaultValue={s.company_rcs ?? ""} placeholder="RCS Pontoise 106 602 659" /></Field>
            <Field label="Pied de page personnalisé (remplace la ligne automatique)" className="sm:col-span-2 lg:col-span-3"><Input name="company_footer" defaultValue={s.company_footer ?? ""} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Facturation et alertes</CardTitle></CardHeader>
          <CardContent className={grid}>
            <Field label="TVA par défaut (%)"><Input name="default_vat_rate" inputMode="decimal" defaultValue={s.default_vat_rate} /></Field>
            <Field label="Délai de paiement (jours)"><Input name="payment_terms_days" inputMode="numeric" defaultValue={s.payment_terms_days} /></Field>
            <Field label="Alerte montant (€ HT)" hint="Confirmation explicite au-dessus de ce montant"><Input name="large_amount_threshold_ht" inputMode="decimal" defaultValue={s.large_amount_threshold_ht} /></Field>
            <Field label="Alerte impayés (jours de retard)" hint="Relances automatiques puis alerte à ce jour."><Input name="unpaid_alert_days" inputMode="numeric" defaultValue={s.unpaid_alert_days} /></Field>
            <Field label="Action manuelle impayés (jours de retard)" hint="Au-delà : appel / courrier, à faire par vous."><Input name="reminder_manual_days" inputMode="numeric" defaultValue={s.reminder_manual_days} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="billing_requires_validation" defaultChecked={s.billing_requires_validation} /> Facturer uniquement les missions <b>validées</b> (recommandé : rien n&apos;est facturé sans votre contrôle)</label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Devis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className={grid}>
              <Field label="Validité par défaut (jours)"><Input name="quote_default_validity_days" inputMode="numeric" defaultValue={s.quote_default_validity_days} /></Field>
              <Field label="Adresse de notification (récapitulatifs automatiques)"><Input name="notify_email" type="email" defaultValue={s.notify_email ?? ""} /></Field>
            </div>
            <Field label="Conditions affichées sur chaque devis"><Textarea name="quote_terms" defaultValue={s.quote_terms ?? ""} className="min-h-[70px]" /></Field>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="quote_followup_enabled" defaultChecked={s.quote_followup_enabled} /> Relancer automatiquement les devis envoyés restés sans réponse</label>
            <div className={grid}>
              <Field label="1re relance après (jours)"><Input name="quote_followup_days" inputMode="numeric" defaultValue={s.quote_followup_days} /></Field>
              <Field label="2e relance après (jours)"><Input name="quote_followup2_days" inputMode="numeric" defaultValue={s.quote_followup2_days} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="quote_expire_enabled" defaultChecked={s.quote_expire_enabled} /> Passer un devis en « expiré » quand sa validité est dépassée sans réponse</label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Facturation mensuelle automatique</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-2 text-sm font-medium"><input type="checkbox" name="auto_invoicing_enabled" defaultChecked={s.auto_invoicing_enabled} className="mt-1" />
              <span>Activer la facturation mensuelle automatique<span className="block text-xs font-normal text-muted-foreground">Le dernier jour du mois, une facture est préparée pour chaque client (forfaits + passages du planning). Elle n&apos;est émise et envoyée que pour les clients cochés « envoi automatique », hors contacts réservés et montants au-dessus du seuil : les autres restent en brouillon pour votre validation. Détail et aperçu dans « Facturation auto ».</span></span></label>
            <div className={grid}>
              <Field label="Premier mois facturé automatiquement" hint="Format AAAA-MM"><Input name="auto_invoicing_start_month" defaultValue={s.auto_invoicing_start_month} placeholder="2026-11" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="auto_planning_enabled" defaultChecked={s.auto_planning_enabled} /> Créer automatiquement chaque jour le planning (mois en cours et suivant) d&apos;après les jours de passage des contrats</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="count_planned_as_done" defaultChecked={s.count_planned_as_done} /> Facturer les passages « planifiés » dont la date est passée (sinon : seulement ceux marqués « réalisés »)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="month_end_send_next_day" defaultChecked={s.month_end_send_next_day} /> Envoyer le lendemain de l&apos;émission (laisse une journée pour relire et corriger)</label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Relances automatiques</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="auto_reminders_enabled" defaultChecked={s.auto_reminders_enabled} /> Activer les relances automatiques par e-mail</label>
            <p className="text-xs text-muted-foreground">Jamais pour un contact réservé, jamais au-dessus du seuil d&apos;alerte, jamais si une relance récente existe.</p>
            <div className={grid}>
              <Field label="1re relance après échéance (jours)"><Input name="reminder_first_after_days" inputMode="numeric" defaultValue={s.reminder_first_after_days} /></Field>
              <Field label="Délai minimum entre relances (jours)"><Input name="reminder_interval_days" inputMode="numeric" defaultValue={s.reminder_interval_days} /></Field>
              <Field label="Nombre maximum de relances"><Input name="reminder_max_count" inputMode="numeric" defaultValue={s.reminder_max_count} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recrutement</CardTitle></CardHeader>
          <CardContent className={grid}>
            <Field label="Coût horaire indépendant (€)"><Input name="indep_hourly_cost" inputMode="decimal" defaultValue={s.indep_hourly_cost} /></Field>
            <Field label="Salarié : brut horaire (€)"><Input name="salarie_gross_hourly" inputMode="decimal" defaultValue={s.salarie_gross_hourly} /></Field>
            <Field label="Salarié : charges patronales (%)"><Input name="salarie_employer_charges_pct" inputMode="decimal" defaultValue={s.salarie_employer_charges_pct} /></Field>
            <Field label="Salarié : congés payés (%)"><Input name="salarie_paid_leave_pct" inputMode="decimal" defaultValue={s.salarie_paid_leave_pct} /></Field>
            <Field label="Seuil vert → orange (h/sem)"><Input name="recruit_green_max_hours" inputMode="decimal" defaultValue={s.recruit_green_max_hours} /></Field>
            <Field label="Seuil orange → rouge (h/sem)"><Input name="recruit_orange_max_hours" inputMode="decimal" defaultValue={s.recruit_orange_max_hours} /></Field>
          </CardContent>
        </Card>
        <Button>Enregistrer</Button>
      </form>
    </>
  );
}

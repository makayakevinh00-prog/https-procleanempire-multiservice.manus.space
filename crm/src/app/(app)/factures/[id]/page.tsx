import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { isLargeAmount } from "@/lib/domain/billing";
import { overdueSequence } from "@/lib/domain/reminders";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ClientName, ReservedBanner } from "@/components/crm/client-name";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { cancelInvoiceAction, deleteDraftAction, remindInvoiceAction, resendInvoiceAction, sendMandateInvoiceAction, syncQontoForInvoiceAction, validateInvoiceAction } from "@/app/actions/invoices";
import { loadRecipients } from "@/lib/recipients";
import { RecipientPicker } from "@/components/crm/recipient-picker";
import { cn, daysBetween, dueInfo, formatDate, formatEUR } from "@/lib/utils";
import { REMINDER_FEE_EUR, REMINDER_FEE_LEVEL } from "@/lib/domain/reminders";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const { data: i } = await supabase.from("invoices")
    .select("*, clients(id, name, email, is_reserved, reserved_reason, mandate_method), invoice_lines(*), reminders(*), quotes:source_quote_id(id, number)")
    .eq("id", params.id).maybeSingle();
  if (!i) notFound();
  const settings = await getSettings(supabase);
  const c = i.clients;
  const recipients = await loadRecipients(supabase, c.id);
  // Virements Qonto non rapprochés, du plus proche du montant de la facture au moins proche
  const { data: pays } = await supabase.from("payments").select("id, amount, received_at, counterparty, label, match_status")
    .in("match_status", ["non_rapproche", "propose"]).gt("amount", 0).gte("received_at", new Date(Date.now() - 120 * 86_400_000).toISOString());
  const total = Number(i.total_ttc);
  const candidates = (pays ?? []).slice().sort((a: any, b: any) => Math.abs(Number(a.amount) - total) - Math.abs(Number(b.amount) - total)).slice(0, 8);
  const lines = [...i.invoice_lines].sort((a: any, b: any) => a.position - b.position);
  const reminders = [...i.reminders].sort((a: any, b: any) => b.sent_at.localeCompare(a.sent_at));
  const isDraft = i.status === "brouillon";
  const open = ["envoye", "en_retard"].includes(i.status);
  const reservedName = c.is_reserved ? c.name : null;
  const largeAmount = isLargeAmount(num(i.total_ht), settings)
    ? { totalHt: formatEUR(i.total_ht), threshold: formatEUR(settings.large_amount_threshold_ht) } : null;
  const lastReminderDays = i.last_reminder_at ? daysBetween(i.last_reminder_at) : null;
  const tooSoon = lastReminderDays !== null && lastReminderDays < settings.reminder_interval_days;

  return (
    <>
      <PageHeader
        title={i.number ?? "Facture brouillon"}
        subtitle={i.subject ?? undefined}
        actions={<>
          <a href={`/api/factures/${i.id}/pdf`} className={cn(buttonVariants({ variant: "outline" }))}><Download className="h-4 w-4" /> PDF</a>
          {isDraft && <Link href={`/factures/${i.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}><Pencil className="h-4 w-4" /> Modifier</Link>}
        </>}
      />
      {c.is_reserved && <ReservedBanner name={c.name} reason={c.reserved_reason} />}
      {isDraft && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ✋ <b>Brouillon</b> — non numérotée, non envoyée. Elle ne sera émise que par votre validation manuelle ci-dessous.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Prestations</CardTitle><StatusBadge status={i.status} /></CardHeader>
          <Table>
            <thead><tr><Th>Désignation</Th><Th className="text-right">Qté</Th><Th className="text-right">PU HT</Th><Th className="text-right">TVA</Th><Th className="text-right">Total HT</Th></tr></thead>
            <tbody>{lines.map((l: any) => (
              <Tr key={l.id}><Td>{l.description}</Td><Td className="text-right">{num(l.quantity)}</Td><Td className="text-right">{formatEUR(l.unit_price_ht)}</Td>
                <Td className="text-right">{num(l.vat_rate)} %</Td><Td className="text-right">{formatEUR(num(l.quantity) * num(l.unit_price_ht))}</Td></Tr>
            ))}</tbody>
          </Table>
          <dl className="ml-auto w-full max-w-xs space-y-1 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Total HT</dt><dd>{formatEUR(i.total_ht)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">TVA</dt><dd>{formatEUR(i.total_vat)}</dd></div>
            <div className="flex justify-between border-t pt-1 text-base font-bold"><dt>Total TTC</dt><dd>{formatEUR(i.total_ttc)}</dd></div>
            {num(i.paid_amount) > 0 && <div className="flex justify-between text-emerald-700"><dt>Déjà réglé</dt><dd>{formatEUR(i.paid_amount)}</dd></div>}
          </dl>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><ClientName id={c.id} name={c.name} reserved={c.is_reserved} /></div>
              <div>✉️ {recipients.length ? recipients.map((r) => r.email).join(", ") : <span className="text-red-700">pas d&apos;e-mail</span>}</div>
              <div>Émise le : {formatDate(isDraft ? null : i.issue_date)}</div>
              <div>Échéance : {formatDate(i.due_date)}{(() => { const d = dueInfo(i.due_date, i.status); return d ? <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${d.tone === "red" ? "bg-red-100 text-red-800" : d.tone === "orange" ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"}`}>{d.label}</span> : null; })()}</div>
              {i.reminder_count >= REMINDER_FEE_LEVEL && !["paye", "annule"].includes(i.status) && <div className="rounded-md bg-red-50 p-2 text-red-800">Frais de recouvrement dus : <b>{formatEUR(REMINDER_FEE_EUR)}</b> (ajoutés à la relance n° {REMINDER_FEE_LEVEL}) · total à régler <b>{formatEUR(Number(i.total_ttc) - Number(i.paid_amount) + REMINDER_FEE_EUR)}</b></div>}
              {i.validated_at && <div>Validée le {formatDate(i.validated_at)}</div>}
              {i.sent_at ? <div>Envoyée à {i.sent_to} le {formatDate(i.sent_at)}</div> : !isDraft && i.status !== "annule" && <div className="text-amber-700">E-mail non envoyé</div>}
              {i.paid_at && <div className="text-emerald-700">Payée le {formatDate(i.paid_at)}</div>}
              {i.quotes && <div>Devis : <Link href={`/devis/${i.quotes.id}`} className="text-primary hover:underline">{i.quotes.number}</Link></div>}
              {i.cancel_reason && <div className="text-muted-foreground">Motif d&apos;annulation : {i.cancel_reason}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isDraft && (
                <>
                  <ConfirmAction action={validateInvoiceAction.bind(null, i.id)} label="Valider & Envoyer" className="w-full"
                    title={`Valider la facture de ${formatEUR(i.total_ttc)} TTC ?`}
                    description={<>Un numéro définitif sera attribué à <b>{c.name}</b> et la facture ne sera <b>plus modifiable</b>. Cette action est la validation manuelle obligatoire.</>}
                    confirmLabel="Oui, valider" reservedName={reservedName} largeAmount={largeAmount}
                    extra={
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="send_email" defaultChecked={recipients.length > 0} /> Envoyer la facture par e-mail</label>
                        <RecipientPicker recipients={recipients} />
                        <label className="block text-sm">
                          <span className="font-medium">Cette prestation est déjà payée ?</span>
                          <select name="payment_id" defaultValue="" className="mt-1 h-10 w-full rounded-md border bg-white px-2">
                            <option value="">Non, à régler après envoi</option>
                            {candidates.map((p: any) => <option key={p.id} value={p.id}>{formatDate(p.received_at)} · {formatEUR(p.amount)} · {p.counterparty ?? p.label ?? "virement"}</option>)}
                          </select>
                          <span className="mt-1 block text-xs text-slate-500">Choisissez le virement Qonto reçu : la facture part « acquittée » et ne sera jamais relancée.</span>
                        </label>
                      </div>
                    } />
                  <form action={syncQontoForInvoiceAction.bind(null, i.id)}><button className="w-full text-center text-xs font-semibold text-primary hover:underline">Le virement n&apos;apparaît pas ? Actualiser depuis Qonto</button></form>
                  <ConfirmAction action={deleteDraftAction.bind(null, i.id)} label="Supprimer le brouillon" variant="outline" size="sm" className="w-full"
                    title="Supprimer ce brouillon ?" description="Aucun numéro n'a été consommé : la suppression est sans conséquence comptable." confirmLabel="Supprimer" />
                </>
              )}
              {!isDraft && i.status !== "annule" && (
                <ConfirmAction action={resendInvoiceAction.bind(null, i.id)} label="Renvoyer la facture" variant="outline" className="w-full"
                  title="Renvoyer la facture par e-mail" description="Le PDF est renvoyé tel quel (même numéro, même statut). Choisissez les destinataires, ou cochez-les tous."
                  confirmLabel="Envoyer" reservedName={reservedName} extra={<RecipientPicker recipients={recipients} defaultAll />} />
              )}
              {c.mandate_method && !isDraft && i.status !== "annule" && (
                <ConfirmAction action={sendMandateInvoiceAction.bind(null, i.id)} label="Envoyer facture + mandat complété" variant="outline" className="w-full"
                  title="Facture avec le mandat d'intervention complété" description="Méthode de ce client : la facture part avec le mandat rempli (e-mail type). Vérifiez chaque champ avant d'envoyer."
                  confirmLabel="Envoyer" reservedName={reservedName}
                  extra={
                    <div className="space-y-3">
                      <RecipientPicker recipients={recipients} defaultAll />
                      <Field label="Date d'intervention *"><Input type="date" name="intervention_date" defaultValue={i.service_date ?? ""} required /></Field>
                      <Field label="Date du mandat *"><Input type="date" name="mandate_date" required /></Field>
                      <Field label="Site d'intervention *"><Input name="site" required /></Field>
                      <Field label="Contenu de la mission *"><Input name="mission" required /></Field>
                      <Field label="Remise des clés"><Input name="keys" placeholder="sans objet" /></Field>
                      <Field label="Observations"><Input name="observations" /></Field>
                    </div>
                  } />
              )}
              {open && (
                <ConfirmAction action={remindInvoiceAction.bind(null, i.id)} label="Relancer" variant="outline" className="w-full"
                  title="Enregistrer une relance"
                  description={
                    i.reminder_count > 0
                      ? <span className={tooSoon ? "font-semibold text-red-700" : ""}>Dernière relance le {formatDate(i.last_reminder_at)} ({i.reminder_count} déjà envoyée(s)){tooSoon ? ` — il y a seulement ${lastReminderDays} j (minimum ${settings.reminder_interval_days} j).` : "."}</span>
                      : "Aucune relance envoyée jusqu'ici."
                  }
                  confirmLabel="Enregistrer la relance" reservedName={reservedName}
                  extra={
                    <div className="space-y-3">
                      <RecipientPicker recipients={recipients} />
                      <Field label="Canal"><Select name="channel"><option value="email">E-mail (envoyé maintenant)</option><option value="telephone">Téléphone</option><option value="courrier">Courrier</option><option value="autre">Autre</option></Select></Field>
                      <Field label="Note"><Input name="note" placeholder="Ex. promet le virement vendredi" /></Field>
                      {tooSoon && <label className="flex items-center gap-2 text-sm font-medium text-red-700"><input type="checkbox" name="force" /> Je force malgré la relance récente</label>}
                    </div>
                  } />
              )}
              {!isDraft && i.status !== "annule" && i.status !== "paye" && (
                <ConfirmAction action={cancelInvoiceAction.bind(null, i.id)} label="Annuler la facture" variant="destructive" size="sm" className="w-full"
                  title="Annuler cette facture ?" description="Le numéro est conservé (numérotation continue). Un devis lié pourra être refacturé."
                  confirmLabel="Annuler la facture" extra={<Field label="Motif *"><Input name="reason" required /></Field>} />
              )}
              {i.status === "paye" && <p className="text-sm text-emerald-700">Facture soldée.</p>}
              {i.status === "annule" && <p className="text-sm text-muted-foreground">Facture annulée.</p>}
            </CardContent>
          </Card>
        </div>

        {["envoye", "en_retard"].includes(i.status) && i.due_date && (() => {
          const late = Math.max(daysBetween(i.due_date), 0);
          const steps = overdueSequence(late, i.reminder_count, settings);
          return (
            <Card className="lg:col-span-3">
              <CardHeader><CardTitle>Séquence en cas d&apos;impayé</CardTitle>
                <span className="text-xs text-muted-foreground">{late > 0 ? `${late} jour(s) de retard` : "pas encore en retard"} · s&apos;arrête dès le paiement{c.is_reserved ? " · contact réservé : aucune relance automatique" : ""}</span></CardHeader>
              <ol className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((st) => (
                  <li key={st.key} className={`rounded-lg border border-l-[5px] p-3 text-sm ${st.kind === "manuel" ? "border-l-red-600" : st.kind === "alerte" ? "border-l-orange-500" : "border-l-blue-500"} ${st.state === "fait" ? "bg-emerald-50" : st.state === "du" ? "bg-amber-50" : ""}`}>
                    <div className="text-xs font-semibold text-slate-500">J+{st.day} · {st.kind === "auto" ? "automatique" : st.kind === "alerte" ? "alerte" : "à faire vous-même"}</div>
                    <div className="mt-0.5 font-medium text-slate-900">{st.label}</div>
                    <div className="mt-1 text-xs">{st.state === "fait" ? "✓ fait" : st.state === "du" ? (st.kind === "auto" ? (c.is_reserved ? "à faire à la main (contact réservé)" : "prévue au prochain passage automatique") : "à traiter maintenant") : "à venir"}</div>
                  </li>
                ))}
              </ol>
            </Card>
          );
        })()}

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Suivi des relances</CardTitle><span className="text-xs text-muted-foreground">{i.reminder_count} relance(s) · dernière : {formatDate(i.last_reminder_at)}</span></CardHeader>
          {!reminders.length ? <p className="px-5 py-6 text-sm text-muted-foreground">Aucune relance.</p> : (
            <Table>
              <thead><tr><Th>Date</Th><Th>N°</Th><Th>Canal</Th><Th>Origine</Th><Th>Note</Th></tr></thead>
              <tbody>{reminders.map((r: any) => (
                <Tr key={r.id}><Td>{formatDate(r.sent_at)}</Td><Td>{r.level}</Td><Td>{r.channel}</Td><Td>{r.origin === "auto" ? "automatique" : "manuelle"}</Td><Td className="text-muted-foreground">{r.note}</Td></Tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { isLargeAmount } from "@/lib/domain/billing";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ClientName, ReservedBanner } from "@/components/crm/client-name";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { cancelInvoiceAction, deleteDraftAction, remindInvoiceAction, validateInvoiceAction } from "@/app/actions/invoices";
import { cn, daysBetween, formatDate, formatEUR } from "@/lib/utils";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const { data: i } = await supabase.from("invoices")
    .select("*, clients(id, name, email, is_reserved, reserved_reason), invoice_lines(*), reminders(*), quotes:source_quote_id(id, number)")
    .eq("id", params.id).maybeSingle();
  if (!i) notFound();
  const settings = await getSettings(supabase);
  const c = i.clients;
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
              <div>✉️ {c.email ?? <span className="text-red-700">pas d&apos;e-mail</span>}</div>
              <div>Émise le : {formatDate(isDraft ? null : i.issue_date)}</div>
              <div>Échéance : {formatDate(i.due_date)}</div>
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
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="send_email" defaultChecked={!!c.email} disabled={!c.email} />
                        Envoyer par e-mail à {c.email ?? "— (aucun e-mail client)"}
                      </label>
                    } />
                  <ConfirmAction action={deleteDraftAction.bind(null, i.id)} label="Supprimer le brouillon" variant="outline" size="sm" className="w-full"
                    title="Supprimer ce brouillon ?" description="Aucun numéro n'a été consommé : la suppression est sans conséquence comptable." confirmLabel="Supprimer" />
                </>
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

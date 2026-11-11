import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { QontoStatus } from "@/components/crm/qonto-auto";
import { addManualPaymentAction, classifyPaymentAction, unclassifyPaymentAction, ignorePaymentAction, reconcileAction, syncQontoAction, unreconcileAction } from "@/app/actions/payments";
import { deletePaymentAction } from "@/app/actions/manage";
import { daysBetween, formatDate, formatEUR } from "@/lib/utils";
import { suggestInvoices } from "@/lib/domain/matching";
import Link from "next/link";

export default async function PaymentsPage() {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const settings = await getSettings(supabase);
  const [pay, inv] = await Promise.all([
    supabase.from("payments").select("*, suggested:suggested_invoice_id(id, number, total_ttc, clients(name, is_reserved)), matched:matched_invoice_id(id, number)").order("received_at", { ascending: false }).limit(100),
    supabase.from("invoices").select("id, number, total_ttc, paid_amount, due_date, status, sent_at, billing_month, clients(id, name, is_reserved)").in("status", ["envoye", "en_retard"]).order("due_date")
  ]);
  if (pay.error) throw new Error(pay.error.message);
  // Seules les vraies factures émises se rapprochent : pas celles générées automatiquement et jamais envoyées, ni celles déjà soldées.
  const open = ((inv.data ?? []) as any[]).filter((i) => !(i.billing_month && !i.sent_at) && num(i.total_ttc) - num(i.paid_amount) > 0.005);
  const todo = (pay.data ?? []).filter((p: any) => ["non_rapproche", "propose"].includes(p.match_status));
  const done = (pay.data ?? []).filter((p: any) => !["non_rapproche", "propose"].includes(p.match_status));
  const late = open.filter((i) => i.status === "en_retard" && i.due_date && daysBetween(i.due_date) >= settings.unpaid_alert_days);
  const qontoConfigured = !!(process.env.QONTO_ACCESS_TOKEN || (process.env.QONTO_ORGANIZATION_SLUG && process.env.QONTO_SECRET_KEY));

  return (
    <>
      <PageHeader title="Suivi des paiements" subtitle="Import Qonto et rapprochement facture ↔ virement."
        actions={<form action={syncQontoAction}><Button disabled={!qontoConfigured} title={qontoConfigured ? undefined : "Qonto non configuré (variables d'environnement)"}><RefreshCw className="h-4 w-4" /> Synchroniser Qonto</Button></form>} />
      {qontoConfigured && <div className="mb-4"><QontoStatus /></div>}
      {!qontoConfigured && <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Qonto n&apos;est pas connecté : renseignez <code>QONTO_ACCESS_TOKEN</code> (ou <code>QONTO_ORGANIZATION_SLUG</code> + <code>QONTO_SECRET_KEY</code>) sur Vercel. Vous pouvez en attendant saisir les paiements à la main.</div>}

      {late.length > 0 && (
        <Card className="mb-4 border-red-300">
          <CardHeader className="bg-red-50"><CardTitle className="text-red-900">⚠ {late.length} facture(s) impayée(s) depuis plus de {settings.unpaid_alert_days} jours</CardTitle></CardHeader>
          <Table><tbody>{late.map((i) => (
            <Tr key={i.id}><Td><Link href={`/factures/${i.id}`} className="font-semibold hover:underline">{i.number}</Link></Td>
              <Td><ClientName id={i.clients.id} name={i.clients.name} reserved={i.clients.is_reserved} /></Td>
              <Td>{formatEUR(num(i.total_ttc) - num(i.paid_amount))}</Td><Td className="text-red-700">{daysBetween(i.due_date)} j de retard</Td></Tr>
          ))}</tbody></Table>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle>À rapprocher ({todo.length})</CardTitle></CardHeader>
        {!todo.length ? <Empty>Rien à rapprocher.</Empty> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Émetteur / libellé</Th><Th className="text-right">Montant</Th><Th>Rapprocher avec</Th></tr></thead>
            <tbody>{todo.map((p: any) => {
              const cand = open.map((i) => ({ id: i.id, number: i.number, total_ttc: num(i.total_ttc), paid_amount: num(i.paid_amount), client_name: i.clients.name, client_is_reserved: !!i.clients.is_reserved }));
              const live = suggestInvoices({ amount: num(p.amount), label: p.label, reference: p.reference, counterparty: p.counterparty }, cand, 2);
              const byId = new Map(open.map((i) => [i.id, i]));
              return (
                <Tr key={p.id}>
                  <Td className="whitespace-nowrap">{formatDate(p.received_at)}</Td>
                  <Td><div className="font-medium">{p.counterparty ?? "—"}</div><div className="text-xs text-muted-foreground">{[p.label, p.reference].filter(Boolean).join(" · ")}</div></Td>
                  <Td className="text-right font-semibold">{formatEUR(p.amount)}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      {live.map((sg) => {
                        const target = byId.get(sg.invoiceId)!;
                        return (
                          <div key={sg.invoiceId} className="flex flex-col items-start gap-1">
                            <ConfirmAction action={reconcileAction.bind(null, p.id)} hidden={{ invoice_id: sg.invoiceId }} size="sm" variant={sg.level === "tres_probable" ? "default" : "outline"}
                              label={`${sg.level === "tres_probable" ? "✓" : "?"} ${sg.number} · ${sg.clientName}`} title="Confirmer ce rapprochement ?"
                              description={`Virement de ${formatEUR(p.amount)} ↔ facture ${sg.number} (reste dû ${formatEUR(sg.due)}). Raisons : ${sg.reasons.join(", ")}.${num(p.amount) < sg.due ? " Paiement partiel : la facture restera ouverte pour le solde." : ""}`}
                              reservedName={target.clients.is_reserved ? target.clients.name : null} />
                            <span className="text-[11px] text-muted-foreground">{sg.reasons.join(" · ")}</span>
                          </div>
                        );
                      })}
                      <ConfirmAction action={reconcileAction.bind(null, p.id)} size="sm" variant="outline" label="Autre facture…"
                        title="Choisir la facture" confirmLabel="Rapprocher"
                        extra={
                          <div className="space-y-3">
                            <Field label="Facture">
                              <Select name="invoice_id" required defaultValue="">
                                <option value="" disabled>Choisir…</option>
                                {open.map((i) => <option key={i.id} value={i.id}>{i.number} — {i.clients.name}{i.clients.is_reserved ? " 🔒" : ""} — {formatEUR(num(i.total_ttc) - num(i.paid_amount))}</option>)}
                              </Select>
                            </Field>
                            <label className="flex items-start gap-2 rounded-md border border-destructive/50 bg-red-50 p-2 text-xs text-red-900">
                              <input type="checkbox" name="ack_reserved" className="mt-0.5" />
                              <span>Facture d&apos;un contact réservé 🔒 : je confirme agir moi-même (patron).</span>
                            </label>
                          </div>
                        } />
                      <ConfirmAction action={classifyPaymentAction.bind(null, p.id)} label="Ce n'est pas un client…" size="sm" variant="outline" title="Classer ce virement" confirmLabel="Classer"
                        description="Un remboursement ou un apport n'est pas du chiffre d'affaires : le virement sort des « à rapprocher » et de l'encaissé du mois."
                        extra={<div className="space-y-3">
                          <Field label="De quoi s'agit-il ?"><Select name="nature" defaultValue="remboursement" required>
                            <option value="remboursement">Remboursement (à la société, d&apos;un fournisseur ou d&apos;un client)</option>
                            <option value="apport">Apport ou virement du dirigeant</option>
                            <option value="autre">Autre (hors facturation)</option>
                          </Select></Field>
                          <Field label="Précision (facultatif)"><Input name="note" placeholder="ex. remboursement de frais avancés" /></Field>
                        </div>} />
                      <form action={ignorePaymentAction.bind(null, p.id)}><Button size="sm" variant="ghost">Ignorer</Button></form>
                      <ConfirmAction action={deletePaymentAction.bind(null, p.id)} label="Supprimer" size="sm" variant="ghost" className="text-red-700"
                        title="Supprimer ce paiement ?" description="Le paiement est supprimé définitivement (trace dans le journal). Si c'est un virement Qonto, il reviendra à la prochaine synchronisation : préférez « Ignorer »." confirmLabel="Oui, supprimer" />
                    </div>
                  </Td>
                </Tr>
              );
            })}</tbody>
          </Table>
        )}
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Ajouter un paiement manuel (chèque, espèces…)</CardTitle></CardHeader>
        <form action={addManualPaymentAction} className="grid gap-3 p-5 sm:grid-cols-[8rem_10rem_1fr_1fr_auto] sm:items-end">
          <Field label="Montant TTC"><Input name="amount" inputMode="decimal" required /></Field>
          <Field label="Date"><Input name="received_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Payeur"><Input name="counterparty" /></Field>
          <Field label="Libellé"><Input name="label" /></Field>
          <Button>Ajouter</Button>
        </form>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
        {!done.length ? <Empty>Aucun paiement traité.</Empty> : (
          <Table>
            <tbody>{done.map((p: any) => (
              <Tr key={p.id}>
                <Td className="whitespace-nowrap">{formatDate(p.received_at)}</Td><Td>{p.counterparty ?? p.label ?? "—"}</Td>
                <Td className="text-right">{formatEUR(p.amount)}</Td><Td>{p.nature && p.nature !== "encaissement_client" ? <span title={p.note ?? undefined} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{({ remboursement: "Remboursement", apport: "Apport du dirigeant", autre: "Hors facturation" } as Record<string, string>)[p.nature]}</span> : <StatusBadge status={p.match_status} />}</Td>
                <Td>{p.matched ? <Link href={`/factures/${p.matched.id}`} className="text-primary hover:underline">{p.matched.number}</Link> : "—"}</Td>
                <Td className="text-right">{p.match_status === "rapproche" ? (
                  <ConfirmAction action={unreconcileAction.bind(null, p.id)} label="Annuler" size="sm" variant="ghost"
                    title="Annuler le rapprochement ?" description="La facture reviendra à son statut précédent." confirmLabel="Annuler le rapprochement" />
                ) : p.match_status === "ignore" ? (
                  <form action={unclassifyPaymentAction.bind(null, p.id)} className="inline"><Button size="sm" variant="ghost">Remettre à rapprocher</Button></form>
                ) : (
                  <ConfirmAction action={deletePaymentAction.bind(null, p.id)} label="Supprimer" size="sm" variant="ghost" className="text-red-700"
                    title="Supprimer ce paiement ?" description="Suppression définitive (trace dans le journal)." confirmLabel="Oui, supprimer" />
                )}</Td>
              </Tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

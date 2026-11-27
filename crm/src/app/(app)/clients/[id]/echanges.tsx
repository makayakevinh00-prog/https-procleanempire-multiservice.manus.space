import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Bell, Gavel, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { buildExchangeTimeline, type ExchangeKind } from "@/lib/domain/exchanges";
import { formalNoticeEligibility } from "@/lib/domain/reminders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { Empty } from "@/components/crm/page-header";
import { discardDraftAction, markMailHandledAction, prepareFormalNoticeAction, prepareReplyAction, saveDraftAction, sendDraftAction, sendFormalNoticeAction } from "@/app/actions/exchanges";
import { cn, daysBetween, formatDate, formatEUR } from "@/lib/utils";

const MISSING = /client_messages|42P01|PGRST205|schema cache/i;
const ICON: Record<ExchangeKind, typeof Bell> = { recu: ArrowDownLeft, envoye: ArrowUpRight, relance: Bell, reponse_ia: Sparkles, mise_en_demeure: Gavel };
const LABEL: Record<ExchangeKind, string> = { recu: "Reçu", envoye: "Envoyé", relance: "Relance", reponse_ia: "Réponse", mise_en_demeure: "Mise en demeure" };

function Ack({ reserved }: { reserved: boolean }) {
  if (!reserved) return null;
  return (
    <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <input type="checkbox" name="ack_reserved" required className="mt-0.5 h-4 w-4" /> <span><b>🔒 Contact réservé.</b> Je confirme cette action.</span>
    </label>
  );
}

export async function Echanges({ client }: { client: { id: string; name: string; email: string | null; is_reserved: boolean; kind: string } }) {
  const supabase = createClient();
  const [msgs, invoices, quotes, settings] = await Promise.all([
    supabase.from("client_messages").select("*").eq("client_id", client.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("invoices").select("id, number, status, due_date, total_ttc, paid_amount, reminder_count, last_reminder_at").eq("client_id", client.id).neq("status", "annule"),
    supabase.from("quotes").select("id").eq("client_id", client.id),
    getSettings(supabase)
  ]);
  if (msgs.error && MISSING.test(`${msgs.error.code ?? ""} ${msgs.error.message}`)) {
    return <Card><CardContent className="p-6 text-[15px] text-slate-700"><b>Échanges pas encore activés.</b> La migration <code>0020_echanges_clients.sql</code> doit d&apos;abord être appliquée à la base (sur votre « go »).</CardContent></Card>;
  }
  for (const r of [msgs, invoices, quotes]) if (r.error) throw new Error(r.error.message);

  const inv = (invoices.data ?? []) as any[];
  const ids = [...inv.map((i) => i.id), ...(quotes.data ?? []).map((q: any) => q.id)];
  const [emails, reminders] = await Promise.all([
    ids.length ? supabase.from("email_log").select("id, sent_at, kind, subject, ok, error, entity, entity_id").in("entity_id", ids).order("sent_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    inv.length ? supabase.from("reminders").select("id, invoice_id, sent_at, level, channel, origin, note").in("invoice_id", inv.map((i) => i.id)).order("sent_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null })
  ]);
  for (const r of [emails, reminders]) if (r.error) throw new Error(r.error.message);

  const numberOf = new Map(inv.map((i) => [i.id, i.number]));
  const messages = (msgs.data ?? []) as any[];
  const timeline = buildExchangeTimeline({
    messages: messages.filter((m) => m.status !== "annule" && m.status !== "a_valider"),
    emails: (emails.data ?? []) as any[],
    reminders: ((reminders.data ?? []) as any[]).map((r) => ({ ...r, invoice_number: numberOf.get(r.invoice_id) }))
  });

  const unread = messages.filter((m) => m.direction === "entrant" && m.status === "recu");
  const replyDraft = messages.find((m) => m.kind === "reponse_ia" && m.status === "a_valider");
  const noticeDrafts = messages.filter((m) => m.kind === "mise_en_demeure" && m.status === "a_valider");
  const eligible = inv.filter((i) => formalNoticeEligibility(i, settings).eligible);

  return (
    <div className="space-y-5">
      {unread.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader><CardTitle>{unread.length > 1 ? `${unread.length} mails à traiter` : "Mail à traiter"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {unread.slice(0, 3).map((m) => (
              <div key={m.id} className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">{formatDate(m.received_at ?? m.created_at)} · de {m.from_email}</div>
                <div className="mt-0.5 font-semibold text-slate-900">{m.subject ?? "(sans objet)"}</div>
                <p className="mt-2 whitespace-pre-wrap text-[15px] text-slate-700">{m.body}</p>
                <form action={markMailHandledAction.bind(null, m.id)} className="mt-3"><Button variant="ghost" size="sm" className="text-slate-500">Traité sans réponse</Button></form>
              </div>
            ))}
            {!replyDraft && (
              <form action={prepareReplyAction.bind(null, client.id)} className="space-y-3">
                <Ack reserved={client.is_reserved} />
                <Button><Sparkles className="h-4 w-4" /> Préparer la réponse</Button>
                <p className="text-xs text-slate-500">L&apos;IA lit la fiche (contrats, devis, factures, historique, mails) et rédige un brouillon. Rien n&apos;est envoyé sans votre validation.</p>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {replyDraft && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Réponse préparée — à valider</CardTitle></CardHeader>
          <CardContent>
            {replyDraft.ai_notes && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><b>À vérifier avant d&apos;envoyer :</b><ul className="mt-1 list-disc pl-5">{String(replyDraft.ai_notes).split("\n").map((l) => <li key={l}>{l}</li>)}</ul></div>}
            <form className="space-y-3">
              <Input name="to" type="email" defaultValue={replyDraft.to_email ?? client.email ?? ""} required aria-label="Destinataire" />
              <Input name="subject" defaultValue={replyDraft.subject ?? ""} aria-label="Objet" />
              <Textarea name="body" defaultValue={replyDraft.body} className="min-h-[220px]" aria-label="Message" />
              <Ack reserved={client.is_reserved} />
              <div className="flex flex-wrap gap-2">
                <Button formAction={sendDraftAction.bind(null, replyDraft.id)}>Valider et envoyer</Button>
                <Button variant="outline" formAction={saveDraftAction.bind(null, replyDraft.id)}>Enregistrer mes modifications</Button>
                <Button variant="ghost" formAction={discardDraftAction.bind(null, replyDraft.id)} formNoValidate className="text-slate-500">Écarter</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {eligible.length > 0 && (
        <Card className="border-l-4 border-l-red-600">
          <CardHeader><CardTitle className="flex items-center gap-2"><Gavel className="h-4 w-4 text-red-600" /> Mise en demeure</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {eligible.map((i) => {
              const draft = noticeDrafts.find((d) => d.entity_id === i.id);
              return (
                <div key={i.id} className="space-y-3">
                  <p className="text-[15px] text-slate-700">
                    <Link href={`/factures/${i.id}`} className="font-semibold hover:underline">{i.number}</Link> — {formatEUR(Number(i.total_ttc) - Number(i.paid_amount))} TTC impayés, en retard de {daysBetween(i.due_date)} j, <b>{i.reminder_count} relance(s) sur {settings.reminder_max_count} déjà envoyées</b>.
                  </p>
                  {!draft ? (
                    <form action={prepareFormalNoticeAction.bind(null, i.id)} className="space-y-3">
                      <Ack reserved={client.is_reserved} />
                      <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"><Gavel className="h-4 w-4" /> Préparer la mise en demeure</Button>
                      <p className="text-xs text-slate-500">Le courrier est seulement préparé. Vous le relisez, puis vous décidez de l&apos;envoyer.</p>
                    </form>
                  ) : (
                    <form className="space-y-3">
                      <Input name="to" type="email" defaultValue={draft.to_email ?? client.email ?? ""} required aria-label="Destinataire" />
                      <Input name="subject" defaultValue={draft.subject ?? ""} aria-label="Objet" />
                      <Textarea name="body" defaultValue={draft.body} className="min-h-[300px]" aria-label="Courrier" />
                      <p className="text-xs text-slate-500">Envoi par e-mail. Si vous voulez une preuve de réception, envoyez aussi ce courrier en recommandé avec accusé de réception.</p>
                      <Ack reserved={client.is_reserved} />
                      <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><input type="checkbox" name="confirm_notice" required className="mt-0.5 h-4 w-4" /> <span>Je confirme l&apos;envoi de cette mise en demeure à {client.name}.</span></label>
                      <div className="flex flex-wrap gap-2">
                        <Button className="bg-red-600 hover:bg-red-700" formAction={sendFormalNoticeAction.bind(null, draft.id)}>Envoyer la mise en demeure</Button>
                        <Button variant="outline" formAction={saveDraftAction.bind(null, draft.id)}>Enregistrer mes modifications</Button>
                        <Button variant="ghost" formAction={discardDraftAction.bind(null, draft.id)} formNoValidate className="text-slate-500">Écarter</Button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Mails et relances</CardTitle></CardHeader>
        {!timeline.length ? <Empty>Aucun échange par e-mail pour l&apos;instant.</Empty> : (
          <ul className="divide-y divide-slate-100">
            {timeline.map((t) => {
              const Icon = ICON[t.kind];
              const failed = t.status === "echec";
              return (
                <li key={t.id} className="flex items-start gap-4 px-5 py-3.5">
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.kind === "recu" ? "bg-red-50 text-red-600" : failed ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                      <span className="font-semibold text-slate-900">{LABEL[t.kind]}{failed ? " — échec" : ""}</span>
                      <span className="text-slate-400">{formatDate(t.at)}</span>
                    </div>
                    <div className="text-[15px] text-slate-700">{t.href ? <Link href={t.href} className="hover:underline">{t.title}</Link> : t.title}</div>
                    {t.body && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-slate-500">{t.body}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

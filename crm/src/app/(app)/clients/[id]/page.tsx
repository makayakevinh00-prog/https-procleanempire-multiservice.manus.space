import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, FilePlus, Gavel, Mail, MapPin, Pencil, Phone, Plus, Receipt, Repeat, Trash2, Undo2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { formalNoticeEligibility } from "@/lib/domain/reminders";
import { DraftEditor } from "@/components/crm/draft-editor";
import { dismissDraftAction, markMailHandledAction, prepareFormalNoticeAction, prepareReplyAction, saveDraftAction, sendDraftAction } from "@/app/actions/mails";
import { clientImpact } from "@/lib/impact";
import { Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge, ReservedBadge } from "@/components/ui/badge";
import { Table, Td, Tr } from "@/components/ui/table";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { addInteractionAction, setPipelineAction } from "@/app/actions/clients";
import { archiveClientAction, deleteClientAction, deleteInteractionAction } from "@/app/actions/manage";
import { PIPELINE, PIPELINE_LABEL, PIPELINE_TONE, type Pipeline } from "@/lib/request-type";
import { cn, formatDate, formatEUR, formatHours } from "@/lib/utils";

const KIND: Record<string, string> = { appel: "📞 Appel", email: "✉️ E-mail", rdv: "📅 RDV", note: "📝 Note", relance: "🔔 Relance", devis: "📄 Devis", facture: "🧾 Facture", autre: "• Autre", demande: "🌐 Demande du site", statut: "🔀 Étape" };
const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export default async function ClientPage({ params, searchParams }: { params: { id: string }; searchParams: { onglet?: string } }) {
  const supabase = createClient();
  const { data: c } = await supabase.from("clients").select("*").eq("id", params.id).maybeSingle();
  if (!c) notFound();

  const [contracts, quotes, invoices, interactions, impact, mails, drafts, settings] = await Promise.all([
    supabase.from("contracts").select("*").eq("client_id", c.id).order("created_at"),
    supabase.from("quotes").select("id, number, status, subject, total_ht, invoice_id").eq("client_id", c.id).order("number", { ascending: false }),
    supabase.from("invoices").select("id, number, status, subject, total_ht, total_ttc, paid_amount, due_date, issue_date, reminder_count, last_reminder_at").eq("client_id", c.id).order("created_at", { ascending: false }),
    supabase.from("interactions").select("*").eq("client_id", c.id).order("occurred_at", { ascending: false }).limit(60),
    clientImpact(c.id),
    supabase.from("client_mails").select("id, direction, kind, subject, body, occurred_at, handled, from_email, to_email").eq("client_id", c.id).order("occurred_at", { ascending: false }).limit(60),
    supabase.from("mail_drafts").select("id, kind, status, subject, body, to_email, generated_by, reply_to_mail_id, created_at").eq("client_id", c.id).eq("status", "a_valider").order("created_at", { ascending: false }),
    getSettings(supabase)
  ]);
  // Les tables de mails arrivent avec la migration 0020 : tant qu'elle manque, la fiche le dit au lieu de planter.
  const mailsMissing = [mails, drafts].some((r) => r.error && (r.error.code === "42P01" || r.error.code === "PGRST205" || /does not exist|schema cache/i.test(r.error.message)));
  for (const r of [mails, drafts]) if (r.error && !mailsMissing) throw new Error(r.error.message);
  const mailRows = mailsMissing ? [] : (mails.data ?? []);
  const draftRows = mailsMissing ? [] : (drafts.data ?? []);
  const { data: reminderRows } = await supabase.from("reminders").select("id, sent_at, level, channel, origin, invoices!inner(number, client_id)").eq("invoices.client_id", c.id).order("sent_at", { ascending: false }).limit(40);
  const inv = invoices.data ?? [];
  const issued = inv.filter((i) => i.status !== "brouillon" && i.status !== "annule");
  const billedHt = issued.reduce((a, i) => a + n(i.total_ht), 0);
  const due = inv.filter((i) => ["envoye", "en_retard"].includes(i.status)).reduce((a, i) => a + n(i.total_ttc) - n(i.paid_amount), 0);
  const lateCount = inv.filter((i) => i.status === "en_retard").length;
  const activeContracts = (contracts.data ?? []).filter((k) => k.status === "actif").length;
  // « Mise en demeure » : visible seulement quand TOUTES les relances d'une facture sont épuisées (jamais avant).
  const noticeInvoices = inv.filter((i) => formalNoticeEligibility({ status: i.status, due_date: i.due_date, reminder_count: n(i.reminder_count), last_reminder_at: i.last_reminder_at }, settings).eligible);
  const noticeDraft = draftRows.find((d) => d.kind === "mise_en_demeure");
  type Entry = { type: "mail"; at: string; m: (typeof mailRows)[number] } | { type: "relance"; at: string; r: any } | { type: "note"; at: string; i: NonNullable<typeof interactions.data>[number] };
  const timeline: Entry[] = [
    ...mailRows.map((m): Entry => ({ type: "mail", at: m.occurred_at, m })),
    ...((reminderRows ?? []) as any[]).map((r): Entry => ({ type: "relance", at: r.sent_at, r })),
    ...(interactions.data ?? []).map((i): Entry => ({ type: "note", at: i.occurred_at, i }))
  ].sort((a, b) => b.at.localeCompare(a.at));

  const tab = ["contrats", "documents", "historique"].includes(searchParams.onglet ?? "") ? searchParams.onglet! : "resume";
  const base = `/clients/${c.id}`;
  const tabs = [
    { href: base, label: "Résumé", active: tab === "resume" },
    { href: `${base}?onglet=contrats`, label: "Contrats", count: contracts.data?.length ?? 0, active: tab === "contrats" },
    { href: `${base}?onglet=documents`, label: "Devis & factures", count: (quotes.data?.length ?? 0) + inv.length, active: tab === "documents" },
    { href: `${base}?onglet=historique`, label: "Historique", count: (interactions.data?.length ?? 0) + mailRows.length, active: tab === "historique" }
  ];
  const address = [c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const reservedName = c.is_reserved ? c.name : null;
  const archived = c.status === "inactif";

  return (
    <>
      {/* Bandeau du client */}
      <Card className={cn("mb-5 overflow-hidden", c.is_reserved && "border-2 border-red-500")}>
        {c.is_reserved && <div role="alert" className="bg-red-50 px-6 py-2.5 text-sm text-red-900"><b>🔒 CONTACT RÉSERVÉ.</b> Aucune action automatique (relances, rapprochement, envoi). Toute action manuelle demande une confirmation explicite. {c.reserved_reason}</div>}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-5 sm:p-6">
          <Avatar name={c.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[28px]">{c.name}</h1>
              {c.is_reserved && <ReservedBadge />}
              {archived && <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">Archivé</span>}
              {c.pipeline && <span className={cn("rounded-full px-3 py-1 text-xs font-bold", PIPELINE_TONE[c.pipeline as Pipeline])}>{PIPELINE_LABEL[c.pipeline as Pipeline]}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-slate-600">
              <span className="capitalize">{c.kind}</span>
              {address && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{address}</span>}
              {c.source && <span>Origine : {c.source}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.phone && <a href={`tel:${c.phone}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><Phone className="h-4 w-4 text-emerald-600" /> {c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><Mail className="h-4 w-4 text-sky-600" /> {c.email}</a>}
              <Link href={`${base}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><Pencil className="h-4 w-4" /> Modifier</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/devis/new?client=${c.id}`} className={cn(buttonVariants({}))}><FilePlus className="h-5 w-5" /> Nouveau devis</Link>
            <Link href={`/factures/new?client=${c.id}`} className={cn(buttonVariants({ variant: "outline" }))}><Receipt className="h-5 w-5" /> Nouvelle facture</Link>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Facturé (HT)" value={formatEUR(billedHt)} sub={`${issued.length} facture(s) émise(s)`} tone="green" icon={Receipt} />
        <Stat label="Reste à encaisser" value={formatEUR(due)} sub={lateCount ? `${lateCount} en retard` : "aucun retard"} tone={lateCount ? "red" : "orange"} icon={Wallet} />
        <Stat label="Contrats actifs" value={activeContracts} sub={`${contracts.data?.length ?? 0} au total`} tone="blue" icon={Repeat} />
        <Stat label="Devis" value={quotes.data?.length ?? 0} sub={`${(quotes.data ?? []).filter((q) => q.status === "envoye").length} en attente de réponse`} tone="violet" icon={FilePlus} />
      </div>

      {(noticeInvoices.length > 0 || noticeDraft) && (
        <Card className="mb-5 border-red-200 bg-red-50/60">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-red-950">
            <Gavel className="h-5 w-5 text-red-600" />
            {noticeDraft ? (
              <>
                <span className="flex-1"><b>Mise en demeure préparée</b> — relisez-la dans l&apos;historique. Elle ne part que sur votre clic.</span>
                <Link href={`${base}?onglet=historique`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Ouvrir le courrier</Link>
              </>
            ) : (
              <>
                <span className="flex-1">Toutes les relances sont épuisées pour {noticeInvoices.map((i) => i.number).join(", ")} ({formatEUR(noticeInvoices.reduce((a, i) => a + n(i.total_ttc) - n(i.paid_amount), 0))} TTC).</span>
                <ConfirmAction action={prepareFormalNoticeAction.bind(null, c.id)} label="Mise en demeure" variant="outline" className="border-red-300 text-red-800 hover:bg-red-100"
                  title="Préparer la mise en demeure ?" description="Le courrier est préparé et placé dans l'historique pour relecture. Rien n'est envoyé : il ne part que sur votre clic « Valider et envoyer »."
                  confirmLabel="Préparer le courrier" reservedName={reservedName} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs items={tabs} />

      {tab === "resume" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Coordonnées et notes</CardTitle></CardHeader>
            <CardContent className="grid gap-x-8 gap-y-4 text-[15px] sm:grid-cols-2">
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">E-mail</div>{c.email ?? "—"}</div>
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Téléphone</div>{c.phone ?? "—"}</div>
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Adresse</div>{address || "—"}</div>
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">SIRET</div>{c.siret ?? "—"}</div>
              {c.notes && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 sm:col-span-2">{c.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Étape commerciale</CardTitle></CardHeader>
            <CardContent>
              <form action={setPipelineAction.bind(null, c.id)} className="space-y-3">
                <Select name="pipeline" defaultValue={c.pipeline ?? ""}><option value="">— Aucune —</option>{PIPELINE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                <Button variant="outline" className="w-full">Changer l&apos;étape</Button>
                <p className="text-xs text-slate-500">L&apos;étape suit automatiquement vos devis et contrats ; chaque changement est daté dans l&apos;historique.</p>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-red-200/70">
            <CardHeader><CardTitle>Gérer cette fiche</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <ConfirmAction action={archiveClientAction.bind(null, c.id, !archived)} label={archived ? "Réactiver le client" : "Archiver le client"} variant="outline"
                title={archived ? "Réactiver ce client ?" : "Archiver ce client ?"}
                description={archived ? "Le client reprend sa place dans les listes." : "Le client disparaît des listes et des factures automatiques, mais tout son historique et ses factures restent consultables. C'est réversible."}
                confirmLabel={archived ? "Réactiver" : "Archiver"} reservedName={reservedName} />
              {impact.issued > 0 ? (
                <p className="max-w-xl text-sm text-slate-600"><Trash2 className="mr-1 inline h-4 w-4 text-slate-400" />Suppression impossible : <b>{impact.issued} facture(s) émise(s)</b> doivent être conservées (obligation légale). Archivez le client à la place.</p>
              ) : (
                <ConfirmAction action={deleteClientAction.bind(null, c.id)} label="Supprimer le client" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                  title={`Supprimer ${c.name} ?`}
                  description={<>Seront supprimés définitivement : <b>{impact.quotes} devis</b>, <b>{impact.drafts} brouillon(s) de facture</b>, <b>{impact.contracts} contrat(s)</b>, <b>{impact.sites} site(s)</b>, <b>{impact.missions} mission(s)</b> et <b>{impact.interactions} ligne(s) d&apos;historique</b>. Une trace reste dans le Journal.</>}
                  confirmLabel="Oui, tout supprimer" reservedName={reservedName} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "contrats" && (
        <Card>
          <CardHeader><CardTitle>Contrats récurrents</CardTitle>
            <Link href={`/contrats/new?client=${c.id}`} className={cn(buttonVariants({ size: "sm" }))}><Plus className="h-4 w-4" /> Nouveau contrat</Link></CardHeader>
          {!contracts.data?.length ? <Empty icon={Repeat} action={<Link href={`/contrats/new?client=${c.id}`} className={cn(buttonVariants({ size: "sm" }))}>Créer un contrat</Link>}>Aucun contrat pour ce client.</Empty> : (
            <Table><tbody>
              {contracts.data.map((k) => (
                <Tr key={k.id}>
                  <Td><Link href={`/contrats/${k.id}`} className="font-semibold text-slate-900 hover:underline">{k.label}</Link></Td>
                  <Td>{k.monthly_amount_ht != null ? `${formatEUR(k.monthly_amount_ht)}/mois` : k.per_visit_amount_ht != null ? `${formatEUR(k.per_visit_amount_ht)}/passage` : "—"}</Td>
                  <Td>{formatHours(k.weekly_hours == null ? null : Number(k.weekly_hours))}/sem</Td>
                  <Td><StatusBadge status={k.status} /></Td>
                </Tr>
              ))}
            </tbody></Table>
          )}
        </Card>
      )}

      {tab === "documents" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Devis</CardTitle><Link href={`/devis/new?client=${c.id}`} className={cn(buttonVariants({ size: "sm" }))}><Plus className="h-4 w-4" /> Nouveau</Link></CardHeader>
            {!quotes.data?.length ? <Empty icon={FilePlus}>Aucun devis.</Empty> : (
              <Table><tbody>{quotes.data.map((q) => (
                <Tr key={q.id}><Td><Link href={`/devis/${q.id}`} className="font-semibold text-slate-900 hover:underline">{q.number}</Link></Td>
                  <Td className="text-slate-500">{q.subject}</Td><Td className="whitespace-nowrap">{formatEUR(q.total_ht)} HT</Td><Td><StatusBadge status={q.status} /></Td></Tr>
              ))}</tbody></Table>
            )}
          </Card>
          <Card>
            <CardHeader><CardTitle>Factures</CardTitle><Link href={`/factures/new?client=${c.id}`} className={cn(buttonVariants({ size: "sm" }))}><Plus className="h-4 w-4" /> Nouvelle</Link></CardHeader>
            {!inv.length ? <Empty icon={Receipt}>Aucune facture.</Empty> : (
              <Table><tbody>{inv.map((i) => (
                <Tr key={i.id}><Td><Link href={`/factures/${i.id}`} className="font-semibold text-slate-900 hover:underline">{i.number ?? "Brouillon"}</Link></Td>
                  <Td className="text-slate-500">{i.subject}</Td><Td className="whitespace-nowrap">{formatEUR(i.total_ttc)} TTC</Td><Td><StatusBadge status={i.status} /></Td></Tr>
              ))}</tbody></Table>
            )}
          </Card>
        </div>
      )}

      {tab === "historique" && (
        <div className="space-y-5">
          {mailsMissing && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Les mails et les réponses préparées s&apos;afficheront ici après application de la migration 0020 (historique des mails).</p>}

          {draftRows.map((d) => (
            <DraftEditor key={d.id} kind={d.kind as "reponse" | "mise_en_demeure"} generatedBy={d.generated_by as "ia" | "modele" | "manuel"} subject={d.subject} body={d.body} to={d.to_email ?? c.email}
              reservedName={reservedName} save={saveDraftAction.bind(null, d.id, c.id)} send={sendDraftAction.bind(null, d.id, c.id)} dismiss={dismissDraftAction.bind(null, d.id, c.id)} />
          ))}

          <Card>
            <CardHeader><CardTitle>Historique des échanges</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <form action={addInteractionAction.bind(null, c.id)} className="grid gap-3 sm:grid-cols-[11rem_1fr_auto] sm:items-end">
                <Field label="Type"><Select name="kind">{Object.entries(KIND).filter(([k]) => !["demande", "statut"].includes(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <Field label="Résumé"><Input name="summary" required placeholder="Ex. : appelé pour confirmer le passage de jeudi" /></Field>
                <Button><Plus className="h-5 w-5" /> Ajouter</Button>
              </form>
              {!timeline.length ? <Empty>Aucun échange enregistré.</Empty> : (
                <ul className="divide-y divide-slate-100 text-[15px]">
                  {timeline.map((e) => e.type === "mail" ? (
                    <li key={`m_${e.m.id}`} className="py-3">
                      <div className="flex items-start gap-4">
                        <span className="w-24 shrink-0 text-sm text-slate-400">{formatDate(e.at)}</span>
                        <span className="w-36 shrink-0 font-medium text-slate-700">{e.m.direction === "recu" ? "📥 Mail reçu" : e.m.kind === "mise_en_demeure" ? "⚖️ Mise en demeure" : "📤 Mail envoyé"}</span>
                        <details className="flex-1">
                          <summary className="cursor-pointer text-slate-800">{e.m.subject ?? "(sans objet)"}{e.m.direction === "recu" && !e.m.handled && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">à traiter</span>}</summary>
                          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{e.m.body}</p>
                        </details>
                      </div>
                      {e.m.direction === "recu" && !e.m.handled && (
                        <div className="mt-2 flex flex-wrap gap-2 pl-[15.5rem]">
                          {draftRows.some((d) => d.reply_to_mail_id === e.m.id)
                            ? <span className="text-sm text-slate-500">Réponse préparée : voir en haut de page.</span>
                            : <form action={prepareReplyAction.bind(null, c.id, e.m.id)}><Button size="sm">Préparer la réponse</Button></form>}
                          <form action={markMailHandledAction.bind(null, e.m.id, c.id)}><Button size="sm" variant="ghost" className="text-slate-500">Marquer comme traité</Button></form>
                        </div>
                      )}
                    </li>
                  ) : e.type === "relance" ? (
                    <li key={`r_${e.r.id}`} className="flex items-start gap-4 py-3">
                      <span className="w-24 shrink-0 text-sm text-slate-400">{formatDate(e.at)}</span>
                      <span className="w-36 shrink-0 font-medium text-slate-700">🔔 Relance</span>
                      <span className="flex-1 text-slate-800">Relance n° {e.r.level} — facture {e.r.invoices?.number ?? "—"} ({e.r.channel}, {e.r.origin === "auto" ? "automatique" : "manuelle"})</span>
                    </li>
                  ) : (
                    <li key={`i_${e.i.id}`} className="flex items-start gap-4 py-3">
                      <span className="w-24 shrink-0 text-sm text-slate-400">{formatDate(e.at)}</span>
                      <span className="w-36 shrink-0 font-medium text-slate-700">{KIND[e.i.kind] ?? e.i.kind}</span>
                      <span className="flex-1 text-slate-800">{e.i.summary}</span>
                      <ConfirmAction action={deleteInteractionAction.bind(null, e.i.id, c.id)} label="✕" variant="ghost" size="sm" className="text-slate-400 hover:text-red-600"
                        title="Supprimer cette ligne ?" description="La ligne est retirée de l'historique de ce client." confirmLabel="Supprimer" reservedName={reservedName} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckSquare, Square, AlertTriangle, History, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDays, isoWeekday } from "@/lib/domain/dates";
import { MANUAL_STAGES, STAGE_LABEL, nextStage, suggestAgents, type Stage } from "@/lib/domain/missions";
import { addChecklistItemAction, addIssueAction, assignStaffAction, resolveIssueAction, saveMissionNotesAction, setStageAction, toggleChecklistAction } from "@/app/actions/missions";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { ReservedBadge } from "@/components/ui/badge";
import { StageBadge } from "@/components/crm/mission";
import { formatDate, formatEUR } from "@/lib/utils";

const FIELD: Record<string, string> = { stage: "Étape", status: "Statut", staff_id: "Intervenant", assignee: "Intervenant", scheduled_date: "Date", start_time: "Heure", checklist: "Check-list", notes: "Notes", invoice_id: "Facture", unit_price_ht: "Prix", duration_hours: "Durée", site_id: "Site" };
const show = (k: string, v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (k === "stage") return STAGE_LABEL[v as Stage] ?? String(v);
  if (k === "checklist" && Array.isArray(v)) return `${v.filter((c: any) => c.done).length}/${v.length} cochés`;
  if (k.endsWith("_id")) return "modifié";
  return String(v);
};

export default async function MissionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: m } = await supabase.from("interventions")
    .select("*, clients(id, name, is_reserved, phone), sites(id, name, address, city, access_notes, contact_name, contact_phone), invoices:invoice_id(id, number, status)")
    .eq("id", params.id).maybeSingle();
  if (!m) notFound();
  const monday = addDays(m.scheduled_date, 1 - isoWeekday(m.scheduled_date));
  const [{ data: staff }, { data: week }, { data: issues }, { data: history }] = await Promise.all([
    supabase.from("staff").select("id, full_name, zone, weekly_capacity_hours, active").order("full_name"),
    supabase.from("interventions").select("id, staff_id, site_id, scheduled_date, start_time, duration_hours, stage").gte("scheduled_date", monday).lte("scheduled_date", addDays(monday, 6)),
    supabase.from("mission_issues").select("*").eq("intervention_id", m.id).order("created_at", { ascending: false }),
    supabase.from("change_log").select("at, actor, action, changes").eq("table_name", "interventions").eq("row_id", m.id).order("at", { ascending: false }).limit(30)
  ]);

  const back = `/missions/${m.id}`;
  const locked = !!m.invoice_id;
  const next = locked ? null : nextStage(m.stage as Stage);
  const list = (m.checklist ?? []) as { label: string; done: boolean }[];
  const num = (v: any) => (v === null || v === undefined ? null : Number(v));
  const suggestions = suggestAgents(
    { id: m.id, staff_id: m.staff_id, site_id: m.site_id, scheduled_date: m.scheduled_date, start_time: m.start_time, duration_hours: num(m.duration_hours), stage: m.stage, city: m.sites?.city ?? m.site_address },
    (staff ?? []).map((s: any) => ({ ...s, weekly_capacity_hours: num(s.weekly_capacity_hours) })),
    (week ?? []).map((w: any) => ({ ...w, duration_hours: num(w.duration_hours) }))
  );
  const openIssues = (issues ?? []).filter((i: any) => i.status === "ouverte");

  return (
    <>
      <PageHeader title={`${m.title} — ${m.clients.name}`}
        subtitle={`${formatDate(m.scheduled_date)}${m.start_time ? ` à ${m.start_time.slice(0, 5)}` : ""}${m.duration_hours ? ` · ${Number(m.duration_hours)} h` : ""}`}
        actions={<><StageBadge stage={m.stage} /><Link href="/missions" className="text-sm text-primary hover:underline">← Missions</Link></>} />
      {m.clients.is_reserved && <div className="mb-4"><ReservedBadge /> <span className="text-sm text-red-800">Contact réservé : aucune action automatique.</span></div>}
      {locked && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">Mission facturée ({m.invoices?.number ?? "brouillon"}) : étape, date et prix ne changent plus. <Link href={`/factures/${m.invoice_id}`} className="font-medium underline">Voir la facture</Link></div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Avancement</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              {next && (
                <form action={setStageAction.bind(null, m.id)}>
                  <input type="hidden" name="stage" value={next} /><input type="hidden" name="back" value={back} />
                  <Button>Passer à « {STAGE_LABEL[next]} »</Button>
                </form>
              )}
              {!locked && (
                <form action={setStageAction.bind(null, m.id)} className="flex gap-2">
                  <input type="hidden" name="back" value={back} />
                  <Select name="stage" defaultValue={m.stage} className="h-10 w-44">{MANUAL_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select>
                  <Button variant="outline">Changer</Button>
                </form>
              )}
              {openIssues.length > 0 && <span className="text-sm text-red-700">⚠ {openIssues.length} problème(s) ouvert(s) : validation bloquée tant qu&apos;ils ne sont pas réglés.</span>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Check-list ({list.filter((c) => c.done).length}/{list.length})</CardTitle></CardHeader>
            {!list.length ? <Empty>Aucun point de contrôle. Ajoutez-en ici, ou sur la fiche du site pour toutes ses missions.</Empty> : (
              <ul className="divide-y divide-slate-100">{list.map((c, i) => (
                <li key={i}>
                  <form action={toggleChecklistAction.bind(null, m.id, i)}><input type="hidden" name="back" value={back} />
                    <button className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm hover:bg-slate-50" disabled={locked}>
                      {c.done ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5 text-slate-400" />}
                      <span className={c.done ? "text-slate-500 line-through" : "text-slate-800"}>{c.label}</span>
                    </button>
                  </form>
                </li>
              ))}</ul>
            )}
            {!locked && (
              <form action={addChecklistItemAction.bind(null, m.id)} className="flex gap-2 border-t border-slate-100 p-4">
                <input type="hidden" name="back" value={back} />
                <Input name="label" placeholder="Ajouter un point (ex. : nettoyer les vitres)" className="flex-1" />
                <Button variant="outline">Ajouter</Button>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Anomalies & réclamations</CardTitle></CardHeader>
            {(issues ?? []).length > 0 && (
              <ul className="divide-y divide-slate-100">{(issues ?? []).map((i: any) => (
                <li key={i.id} className={`border-l-4 px-5 py-3 text-sm ${i.status === "ouverte" ? (i.kind === "reclamation" ? "border-l-red-600" : "border-l-orange-500") : "border-l-emerald-500"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{i.kind === "reclamation" ? "Réclamation client" : "Anomalie"}</b>
                    {i.severity === "haute" && <span className="rounded bg-red-100 px-1.5 text-xs font-semibold text-red-800">urgente</span>}
                    <span className="text-xs text-slate-500">{formatDate(i.created_at)}{i.reported_by ? ` · ${i.reported_by}` : ""}</span>
                    <span className="ml-auto text-xs font-semibold">{i.status === "ouverte" ? "Ouverte" : `Réglée le ${formatDate(i.resolved_at)}`}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{i.description}</p>
                  {i.resolution && <p className="mt-1 text-xs text-emerald-800">Solution : {i.resolution}</p>}
                  {i.status === "ouverte" && (
                    <form action={resolveIssueAction.bind(null, i.id)} className="mt-2 flex gap-2"><input type="hidden" name="back" value={back} />
                      <Input name="resolution" placeholder="Comment c'est réglé ?" className="h-9 flex-1" /><Button size="sm" variant="outline" className="h-9">Marquer réglé</Button>
                    </form>
                  )}
                </li>
              ))}</ul>
            )}
            <form action={addIssueAction} className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-[150px_120px_1fr_auto]">
              <input type="hidden" name="back" value={back} /><input type="hidden" name="intervention_id" value={m.id} />
              <input type="hidden" name="client_id" value={m.client_id} /><input type="hidden" name="site_id" value={m.site_id ?? ""} />
              <Select name="kind" className="h-10"><option value="anomalie">Anomalie</option><option value="reclamation">Réclamation client</option></Select>
              <Select name="severity" defaultValue="normale" className="h-10"><option value="faible">Faible</option><option value="normale">Normale</option><option value="haute">Urgente</option></Select>
              <Input name="description" placeholder="Que s'est-il passé ?" required />
              <Button variant="outline">Signaler</Button>
            </form>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <form action={saveMissionNotesAction.bind(null, m.id)} className="space-y-2 p-4"><input type="hidden" name="back" value={back} />
              <Textarea name="notes" defaultValue={m.notes ?? ""} rows={3} placeholder="Consignes, remarques du passage…" />
              <Button variant="outline" size="sm">Enregistrer</Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-blue-600" /> Intervenant</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>Actuel : <b className={m.assignee ? "" : "text-orange-600"}>{m.assignee ?? "aucun"}</b></div>
              {!locked && (
                !(staff ?? []).length ? <p className="text-slate-500">Ajoutez d&apos;abord vos agents dans <Link href="/equipe" className="text-primary underline">Équipe</Link>.</p> : (
                  <ul className="space-y-2">{suggestions.map((s, n) => (
                    <li key={s.staff.id} className={`rounded-lg border p-2.5 ${s.blocking.length ? "border-slate-200 bg-slate-50 opacity-70" : n === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <b>{s.staff.full_name}{n === 0 && !s.blocking.length ? " · suggéré" : ""}</b>
                        {m.staff_id === s.staff.id ? <span className="text-xs text-emerald-700">affecté</span> : (
                          <form action={assignStaffAction.bind(null, m.id)}><input type="hidden" name="back" value={back} /><input type="hidden" name="staff_id" value={s.staff.id} />
                            <Button size="sm" variant={s.blocking.length ? "ghost" : "outline"}>Affecter</Button></form>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{[...s.blocking.map((b) => `⛔ ${b}`), ...s.reasons].join(" · ")}</div>
                    </li>
                  ))}</ul>
                )
              )}
              {!locked && m.staff_id && (
                <form action={assignStaffAction.bind(null, m.id)}><input type="hidden" name="back" value={back} /><input type="hidden" name="staff_id" value="" />
                  <button className="text-xs text-red-700 hover:underline">Retirer l&apos;intervenant</button></form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Lieu</CardTitle>{m.sites && <Link href={`/sites/${m.sites.id}`} className="text-xs font-semibold text-primary hover:underline">Fiche site</Link>}</CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-700">
              <div><b>{m.sites?.name ?? "Site non renseigné"}</b></div>
              <div>{m.site_address ?? [m.sites?.address, m.sites?.city].filter(Boolean).join(", ") ?? "—"}</div>
              {m.sites?.access_notes && <div className="rounded bg-amber-50 p-2 text-xs text-amber-900">Accès : {m.sites.access_notes}</div>}
              {m.sites?.contact_name && <div className="text-xs">Contact sur place : {m.sites.contact_name} {m.sites.contact_phone}</div>}
              <div className="pt-2 text-xs text-slate-500">Client : <Link href={`/clients/${m.clients.id}`} className="text-primary hover:underline">{m.clients.name}</Link>{m.clients.phone ? ` · ${m.clients.phone}` : ""}</div>
              {m.billable && m.unit_price_ht !== null && <div className="text-xs text-slate-500">Facturable : {formatEUR(Number(m.unit_price_ht) * Number(m.quantity))} HT</div>}
              {!m.billable && <div className="text-xs text-slate-500">Couverte par le forfait mensuel du contrat.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4 text-slate-500" /> Historique</CardTitle></CardHeader>
            {!(history ?? []).length ? <Empty>Aucune modification enregistrée.</Empty> : (
              <ul className="divide-y divide-slate-100 text-xs">{(history ?? []).map((h: any, n: number) => (
                <li key={n} className="px-4 py-2">
                  <div className="text-slate-500">{new Date(h.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })} · {h.actor}</div>
                  <div className="text-slate-800">{h.action === "insert" ? "Mission créée" : h.action === "delete" ? "Supprimée" :
                    Object.entries(h.changes ?? {}).filter(([k]) => FIELD[k] && k !== "assignee" && k !== "status").map(([k, [a, b]]: any) => `${FIELD[k]} : ${show(k, a)} → ${show(k, b)}`).join(" · ") || "Mise à jour"}</div>
                </li>
              ))}</ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

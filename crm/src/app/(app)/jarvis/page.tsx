import Link from "next/link";
import { Bot, Bell, ListChecks, ShieldCheck, Play, Network } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { runAgentAction, decideActionAction, setAlertStatusAction, completeTaskAction } from "@/app/actions/jarvis";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { LevelBadge, SeverityBadge, SEVERITY_RANK, EVENT_LABEL, fmtDateTime, NotInstalled, isMissingTable } from "@/components/crm/jarvis";
import { AGENTS, AGENT_BY_KEY } from "@/lib/jarvis/registry";
import type { AgentKey } from "@/lib/jarvis/types";

export const dynamic = "force-dynamic";

export default async function JarvisPage() {
  await requireOwner();
  const sb = createClient();
  const [ag, al, ac, tk, ev, rn] = await Promise.all([
    sb.from("jarvis_agents").select("key, status, enabled, last_run_at"),
    sb.from("jarvis_alerts").select("*").neq("status", "resolved"),
    sb.from("jarvis_actions").select("*").in("status", ["proposed", "blocked"]).order("created_at"),
    sb.from("jarvis_tasks").select("*").eq("status", "todo").order("created_at"),
    sb.from("jarvis_events").select("*").eq("status", "pending").order("created_at"),
    sb.from("jarvis_runs").select("id, agent_key, trigger, started_at, ok, summary, stats").order("started_at", { ascending: false }).limit(8)
  ]);
  const missing = [ag, al, ac, tk, ev, rn].some((r) => isMissingTable(r.error));
  const firstError = [ag, al, ac, tk, ev, rn].find((r) => r.error && !isMissingTable(r.error))?.error;
  if (firstError) throw new Error(firstError.message);

  const dbState = new Map((ag.data ?? []).map((a: any) => [a.key, a]));
  const alerts = [...(al.data ?? [])].sort((a: any, b: any) => (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || a.title.localeCompare(b.title));
  const actions = ac.data ?? [], tasks = tk.data ?? [], events = ev.data ?? [], runs = rn.data ?? [];
  const nom = (k: string) => AGENT_BY_KEY[k as AgentKey]?.name ?? k;
  const actifs = AGENTS.filter((a) => a.status === "actif").length;
  const briefing = runs.find((r: any) => r.agent_key === "finance" && r.ok);

  return (
    <>
      <PageHeader
        title="JARVIS"
        subtitle="Supervision des agents : ce qu'ils ont repéré, ce qu'ils proposent, ce qui attend votre validation. Un agent observe et propose ; rien n'est envoyé ni modifié sans vous."
        actions={!missing && (
          <form action={runAgentAction.bind(null, "finance")}>
            <Button type="submit"><Play className="h-4 w-4" /> Lancer l&apos;agent Finance</Button>
          </form>
        )}
      />
      {missing && <NotInstalled />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Agents construits" value={`${actifs} / ${AGENTS.length}`} sub="les autres sont prévus" tone="violet" icon={Bot} />
        <Stat label="À valider" value={actions.filter((a: any) => a.status === "proposed").length} sub={`${actions.filter((a: any) => a.status === "blocked").length} réservée(s) L3`} tone="orange" icon={ShieldCheck} />
        <Stat label="Alertes ouvertes" value={alerts.length} sub={`${alerts.filter((a: any) => a.severity === "urgent").length} urgente(s)`} tone="red" icon={Bell} />
        <Stat label="Tâches pour vous" value={tasks.length} sub="créées par les agents" tone="blue" icon={ListChecks} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>À valider</CardTitle></CardHeader>
        {!actions.length ? <Empty icon={ShieldCheck}>Aucune proposition en attente.</Empty> : (
          <div className="divide-y">
            {actions.map((a: any) => (
              <div key={a.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <LevelBadge level={a.level} /><Badge tone="gray">{nom(a.agent_key)}</Badge>
                  <span className="font-semibold text-slate-900">{a.title}</span>
                </div>
                {a.summary && <p className="text-sm text-slate-600">{a.summary}</p>}
                {a.payload?.brouillon && (
                  <details className="rounded-lg border bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">Voir le brouillon (non envoyé)</summary><pre className="mt-2 whitespace-pre-wrap font-sans text-slate-700">{a.payload.brouillon}</pre></details>
                )}
                {a.status === "blocked" ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <b>Réservé : JARVIS ne peut pas exécuter ceci.</b> Il faut votre autorisation explicite, en dehors de ce circuit. {a.href && <Link href={a.href} className="font-semibold underline">Ouvrir le dossier</Link>}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={decideActionAction.bind(null, a.id, "approve")}><Button size="sm" type="submit">Valider (crée une tâche)</Button></form>
                    <form action={decideActionAction.bind(null, a.id, "reject")}><Button size="sm" variant="outline" type="submit">Refuser</Button></form>
                    {a.href && <Link href={a.href} className="text-sm font-semibold text-primary underline">Ouvrir le dossier</Link>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Alertes</CardTitle></CardHeader>
        {!alerts.length ? <Empty icon={Bell}>Aucune alerte ouverte{missing ? "" : " : lancez un passage pour actualiser."}</Empty> : (
          <div className="divide-y">
            {alerts.map((a: any) => (
              <div key={a.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <SeverityBadge severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{a.title}</div>
                  {a.detail && <div className="text-sm text-slate-500">{a.detail}</div>}
                  <div className="mt-0.5 text-xs text-slate-400">{nom(a.agent_key)} · vue pour la 1re fois le {fmtDateTime(a.first_seen_at)}{a.status === "acknowledged" ? " · notée comme vue" : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  {a.href && <Link href={a.href} className="text-sm font-semibold text-primary underline">Ouvrir</Link>}
                  {a.status === "open" && <form action={setAlertStatusAction.bind(null, a.id, "acknowledged")}><Button size="sm" variant="outline" type="submit">Vu</Button></form>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Tâches créées pour vous</CardTitle></CardHeader>
        {!tasks.length ? <Empty icon={ListChecks}>Aucune tâche en attente.</Empty> : (
          <div className="divide-y">
            {tasks.map((t: any) => (
              <div key={t.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <Badge tone={t.priority === "haute" ? "red" : "gray"}>{t.priority}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{t.title}</div>
                  {t.detail && <div className="whitespace-pre-wrap text-sm text-slate-500">{t.detail}</div>}
                  <div className="mt-0.5 text-xs text-slate-400">{nom(t.agent_key)} · {fmtDateTime(t.created_at)}</div>
                </div>
                {t.href && <Link href={t.href} className="text-sm font-semibold text-primary underline">Ouvrir</Link>}
                <form action={completeTaskAction.bind(null, t.id)}><Button size="sm" variant="outline" type="submit">Terminée</Button></form>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Demandes entre agents</CardTitle></CardHeader>
        {!events.length ? <Empty icon={Network}>Aucune demande en attente entre agents.</Empty> : (
          <div className="divide-y">
            {events.map((e: any) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <Badge tone="gray">{nom(e.source_agent)}</Badge><span aria-hidden>→</span><Badge tone="gray">{nom(e.target_agent)}</Badge>
                <span className="flex-1 text-slate-700">{EVENT_LABEL[e.type] ?? e.type}{e.payload?.label ? ` — ${e.payload.label}` : ""}{e.payload?.number ? ` — ${e.payload.number}` : ""}</span>
                {AGENT_BY_KEY[e.target_agent as AgentKey]?.status === "prevu" && <Badge tone="orange">en attente : cet agent n&apos;est pas encore construit</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {briefing && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Dernier briefing financier</CardTitle><span className="text-xs text-muted-foreground">{fmtDateTime(briefing.started_at)}</span></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{briefing.summary}</pre></CardContent>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Les 9 agents</h2>
      <div className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((a) => {
          const st: any = dbState.get(a.key);
          const nAlerts = alerts.filter((x: any) => x.agent_key === a.key).length;
          const nProp = actions.filter((x: any) => x.agent_key === a.key && x.status === "proposed").length;
          return (
            <Link key={a.key} href={`/jarvis/${a.key}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900">{a.name}</div>
                    <Badge tone={a.status === "actif" ? "green" : "gray"}>{a.status === "actif" ? "Construit" : "Prévu"}</Badge>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{a.department}</div>
                  <p className="line-clamp-3 text-sm text-slate-600">{a.mission}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                    {a.status === "actif" && <><span>{nAlerts} alerte(s)</span><span>·</span><span>{nProp} à valider</span><span>·</span></>}
                    <span>dernier passage : {fmtDateTime(st?.last_run_at)}</span>
                    {st && st.enabled === false && <Badge tone="red">désactivé</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mb-10">
        <CardHeader><CardTitle>Journal des passages</CardTitle></CardHeader>
        {!runs.length ? <Empty>Aucun passage enregistré.</Empty> : (
          <div className="divide-y">
            {runs.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-28 text-slate-500">{fmtDateTime(r.started_at)}</span>
                <Badge tone="gray">{nom(r.agent_key)}</Badge><Badge tone={r.ok ? "green" : "red"}>{r.ok ? "OK" : "Échec"}</Badge>
                <span className="text-slate-500">{r.trigger}</span>
                <span className="flex-1 text-right text-xs text-slate-400">{r.stats?.alertes_urgentes ?? 0} urgente(s) · {r.stats?.propositions ?? 0} proposition(s) · {r.stats?.taches ?? 0} tâche(s)</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

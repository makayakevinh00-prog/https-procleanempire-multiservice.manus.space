import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { runAgentAction } from "@/app/actions/jarvis";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge, SEVERITY_RANK, fmtDateTime, NotInstalled, isMissingTable } from "@/components/crm/jarvis";
import { AGENT_BY_KEY } from "@/lib/jarvis/registry";
import type { AgentKey } from "@/lib/jarvis/types";

export const dynamic = "force-dynamic";
const TOOL: Record<string, [string, "green" | "orange" | "gray"]> = { disponible: ["disponible", "green"], a_connecter: ["à connecter (votre accord requis)", "orange"], a_decider: ["à décider", "gray"] };

const List = ({ items }: { items: string[] }) => <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((x) => <li key={x}>{x}</li>)}</ul>;

export default async function AgentPage({ params }: { params: { agent: string } }) {
  await requireOwner();
  const a = AGENT_BY_KEY[params.agent as AgentKey];
  if (!a) notFound();
  const sb = createClient();
  const [al, rn] = await Promise.all([
    sb.from("jarvis_alerts").select("*").eq("agent_key", a.key).neq("status", "resolved"),
    sb.from("jarvis_runs").select("id, started_at, ok, summary, trigger").eq("agent_key", a.key).order("started_at", { ascending: false }).limit(5)
  ]);
  const missing = isMissingTable(al.error) || isMissingTable(rn.error);
  const alerts = [...(al.data ?? [])].sort((x: any, y: any) => SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity]);
  const nom = (k: string) => AGENT_BY_KEY[k as AgentKey]?.name ?? k;

  return (
    <>
      <PageHeader
        title={a.name}
        subtitle={`${a.department} · ${a.status === "actif" ? "agent construit et testé" : "agent prévu, pas encore construit"}`}
        actions={<>
          <Link href="/jarvis" className="text-sm font-semibold text-primary underline">← Tous les agents</Link>
          {a.key === "finance" && !missing && <form action={runAgentAction.bind(null, "finance")}><Button type="submit"><Play className="h-4 w-4" /> Lancer un passage</Button></form>}
        </>}
      />
      {missing && a.status === "actif" && <NotInstalled />}

      <Card className="mb-4"><CardHeader><CardTitle>Mission</CardTitle></CardHeader><CardContent><p className="text-[15px] text-slate-700">{a.mission}</p></CardContent></Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Responsabilités</CardTitle></CardHeader><CardContent><List items={a.responsibilities} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Limites (ce qu&apos;il ne fait jamais)</CardTitle></CardHeader><CardContent><List items={a.limits} /></CardContent></Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Autonomie</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <div><Badge tone="green">L1 · Automatique</Badge><List items={a.autonomy.L1} /></div>
          <div><Badge tone="orange">L2 · Votre validation</Badge><List items={a.autonomy.L2} /></div>
          <div><Badge tone="red">L3 · Autorisation explicite</Badge><List items={a.autonomy.L3} /></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Données et outils</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <div><div className="mb-1 font-semibold">Lit</div><List items={a.data.read} /></div>
          <div><div className="mb-1 font-semibold">Écrit</div><List items={a.data.write} /></div>
          <div><div className="mb-1 font-semibold">Outils</div><ul className="space-y-1">{a.tools.map((t) => <li key={t.name} className="flex flex-wrap items-center gap-2"><span>{t.name}</span><Badge tone={TOOL[t.state][1]}>{TOOL[t.state][0]}</Badge></li>)}</ul></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Mémoire et collaborations</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <div><div className="mb-1 font-semibold">Mémoire propre</div><List items={a.memory.own} /></div>
          <div><div className="mb-1 font-semibold">Mémoire commune</div><List items={a.memory.shared} /></div>
          <div><div className="mb-1 font-semibold">Travaille avec</div><ul className="space-y-1">{a.collaborates.map((c) => <li key={c.agent}><Link href={`/jarvis/${c.agent}`} className="font-semibold text-primary underline">{nom(c.agent)}</Link> — {c.why}</li>)}</ul></div>
        </CardContent></Card>
      </div>

      <Card className="mb-4"><CardHeader><CardTitle>Automatisations</CardTitle></CardHeader><CardContent>
        <ul className="space-y-1.5 text-sm">{a.automations.map((x) => <li key={x.label} className="flex items-start gap-2"><Badge tone={x.state === "construit" ? "green" : "gray"}>{x.state === "construit" ? "Construit" : "Prévu"}</Badge><span className="text-slate-700">{x.label}</span></li>)}</ul>
      </CardContent></Card>

      {a.status === "actif" && !missing && (
        <>
          <Card className="mb-4"><CardHeader><CardTitle>Alertes ouvertes de cet agent</CardTitle></CardHeader>
            {!alerts.length ? <CardContent><p className="text-sm text-slate-500">Aucune alerte ouverte.</p></CardContent> : (
              <div className="divide-y">{alerts.map((x: any) => (
                <div key={x.id} className="flex flex-wrap items-start gap-3 px-5 py-3"><SeverityBadge severity={x.severity} /><div className="min-w-0 flex-1"><div className="font-medium">{x.title}</div>{x.detail && <div className="text-sm text-slate-500">{x.detail}</div>}</div>{x.href && <Link href={x.href} className="text-sm font-semibold text-primary underline">Ouvrir</Link>}</div>
              ))}</div>
            )}
          </Card>
          <Card className="mb-10"><CardHeader><CardTitle>Derniers passages</CardTitle></CardHeader>
            <div className="divide-y">{(rn.data ?? []).map((r: any) => (
              <div key={r.id} className="px-5 py-3 text-sm"><div className="mb-1 flex items-center gap-2"><span className="text-slate-500">{fmtDateTime(r.started_at)}</span><Badge tone={r.ok ? "green" : "red"}>{r.ok ? "OK" : "Échec"}</Badge><span className="text-slate-400">{r.trigger}</span></div><pre className="whitespace-pre-wrap font-sans text-slate-600">{r.summary}</pre></div>
            ))}{!(rn.data ?? []).length && <CardContent><p className="text-sm text-slate-500">Aucun passage.</p></CardContent>}</div>
          </Card>
        </>
      )}
    </>
  );
}

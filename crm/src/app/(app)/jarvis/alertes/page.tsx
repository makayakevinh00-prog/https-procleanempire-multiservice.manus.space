import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { AutoRefresh } from "@/components/crm/auto-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { loadAlerts } from "@/lib/jarvis/load-alerts";
import { FAMILY, type Severity } from "@/lib/jarvis/alerts";
import { AGENT_BY_KEY } from "@/lib/jarvis/registry";
import type { AgentKey } from "@/lib/jarvis/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alertes JARVIS" };

const SEV: Record<Severity, { label: string; cls: string }> = {
  urgent: { label: "Prioritaire", cls: "bg-red-100 text-red-800" },
  attention: { label: "À traiter", cls: "bg-amber-100 text-amber-800" },
  info: { label: "Information", cls: "bg-sky-100 text-sky-800" }
};
const nom = (k: string) => AGENT_BY_KEY[k as AgentKey]?.name ?? k;

export default async function AlertesPage({ searchParams }: { searchParams: { agent?: string; prio?: string } }) {
  await requireOwner();
  const v = await loadAlerts(createClient());
  const { summary: s } = v;
  const agents = Object.keys(s.byAgent).sort();
  const shown = v.alerts.filter((a) => (!searchParams.agent || a.agent === searchParams.agent) && (searchParams.prio !== "1" || a.severity === "urgent"));
  const statusOf = (agent: string, key: string) => v.tracked?.[`${agent}:${key}`]?.status;
  const q = (p: Record<string, string | undefined>) => { const u = new URLSearchParams(Object.entries({ ...searchParams, ...p }).filter(([, x]) => x) as [string, string][]); return `/jarvis/alertes${u.size ? `?${u}` : ""}`; };
  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader title="Alertes JARVIS" subtitle="Tout ce qui attend votre attention, détecté dans les données réelles du CRM, avec l'agent responsable, la raison et l'action proposée. JARVIS propose : il ne modifie rien sans votre accord."
        actions={<Link href="/jarvis" className="text-sm font-semibold text-primary underline">← Supervision</Link>} />
      {v.errors.length > 0 && <p className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">Lecture incomplète, certaines alertes peuvent manquer : {v.errors.join(" · ")}</p>}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Alertes ouvertes" value={s.open} sub="à traiter" tone="orange" />
        <Stat label="Prioritaires" value={s.priority} sub="à voir en premier" tone="red" />
        <Stat label="En cours de traitement" value={s.tracking ? s.inProgress : "—"} sub={s.tracking ? "prises en charge" : "suivi non installé"} />
        <Stat label="Résolues (30 jours)" value={s.tracking ? s.resolved : "—"} sub={s.tracking ? "plus constatées" : "suivi non installé"} />
      </div>
      {!s.tracking && <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Le suivi de résolution (en cours, résolue) s&apos;active avec le socle JARVIS, qui n&apos;est pas encore installé sur cette base. Les alertes ci-dessous sont lues en direct : elles disparaissent d&apos;elles-mêmes quand la situation est réglée dans le CRM.</p>}

      <Card className="mb-4">
        <CardHeader><CardTitle>Par agent responsable</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-1.5">Agent</th><th>Ouvertes</th><th>Prioritaires</th><th>En cours</th><th>Résolues</th></tr></thead>
            <tbody>
              {agents.map((k) => { const r = s.byAgent[k]; return (
                <tr key={k} className="border-t">
                  <td className="py-1.5"><Link className="font-medium text-primary hover:underline" href={q({ agent: searchParams.agent === k ? undefined : k })}>{nom(k)}</Link></td>
                  <td>{r.open}</td><td className={r.priority ? "font-bold text-red-700" : ""}>{r.priority}</td><td>{s.tracking ? r.inProgress : "—"}</td><td>{s.tracking ? r.resolved : "—"}</td>
                </tr>); })}
              {!agents.length && <tr><td colSpan={5} className="py-3 text-muted-foreground">Aucune alerte.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href={q({ prio: searchParams.prio === "1" ? undefined : "1" })} className={`rounded-full border px-3 py-1 ${searchParams.prio === "1" ? "bg-red-600 text-white" : ""}`}>Prioritaires seulement</Link>
        {searchParams.agent && <Link href={q({ agent: undefined })} className="rounded-full border px-3 py-1">Agent : {nom(searchParams.agent)} ✕</Link>}
        <span className="text-muted-foreground">{shown.length} alerte(s) affichée(s)</span>
      </div>

      {!shown.length ? <Empty>Aucune alerte : tout est à jour.</Empty> : (
        <ul className="space-y-2">
          {shown.map((a) => { const st = statusOf(a.agent, a.dedupe_key); return (
            <li key={`${a.agent}:${a.dedupe_key}`} className="rounded-xl border bg-card p-3 shadow-sm">
              <div className="flex flex-wrap items-start gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEV[a.severity].cls}`}>{SEV[a.severity].label}</span>
                <Badge tone="gray">{nom(a.agent)}</Badge>
                <span className="text-xs text-muted-foreground">{FAMILY[a.code].label}</span>
                {st === "acknowledged" && <Badge tone="blue">En cours de traitement</Badge>}
                <Link href={a.href} className="ml-auto text-sm font-semibold text-primary hover:underline">Ouvrir →</Link>
              </div>
              <p className="mt-1.5 font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground"><b>Pourquoi :</b> {a.reason}</p>
              <p className="text-sm"><b>Action proposée :</b> {a.proposal}</p>
            </li>); })}
        </ul>
      )}
    </>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { loadVerdicts } from "@/lib/mission-verdicts";
import { buildTimeline } from "@/lib/domain/mission-analysis";
import { STAGE_LABEL, type Stage } from "@/lib/domain/missions";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/crm/print-button";

export const dynamic = "force-dynamic";

/** Rapport d'intervention imprimable (enregistrable en PDF depuis le navigateur). Réservé au patron (middleware). */
export default async function ReportPage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: m } = await sb.from("interventions").select("*, clients(name), sites(name, address, city)").eq("id", params.id).maybeSingle();
  if (!m) notFound();
  const settings = await getSettings(sb);
  const v = (await loadVerdicts(sb, [m], Number(settings.indep_hourly_cost ?? 0))).get(m.id)!;
  const [{ data: history }, { data: issues }] = await Promise.all([
    sb.from("change_log").select("at, actor, changes").eq("table_name", "interventions").eq("row_id", m.id).order("at", { ascending: false }).limit(30),
    sb.from("mission_issues").select("created_at, description, severity, kind").eq("intervention_id", m.id)
  ]);
  const timeline = buildTimeline({
    arrivedAt: m.arrived_at ?? null, departedAt: m.departed_at ?? null, arrivedVerified: m.arrived_verified ?? null, arrivedDistanceM: m.arrived_distance_m ?? null,
    photos: [], issues: (issues ?? []).map((i: any) => ({ at: i.created_at, description: i.description, severity: i.severity, kind: i.kind })),
    history: (history ?? []).map((h: any) => ({ at: h.at, actor: h.actor, stage: h.changes?.stage ?? null })), stageLabel: (s) => STAGE_LABEL[s as Stage] ?? s
  });
  const checklist = (m.checklist ?? []) as { label: string; done: boolean; room?: string | null }[];
  return (
    <>
    <style>{`@media print { aside, header, nav, [role="note"] { display: none !important; } div[class*="--nav-w"] { margin-left: 0 !important; } main { padding: 0 !important; max-width: none !important; } }`}</style>
    <article className="mx-auto max-w-3xl space-y-5 bg-card p-6 print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rapport d&apos;intervention</h1>
          <p className="text-sm text-muted-foreground">{m.title} · {m.clients?.name} · {m.sites?.name ?? m.site_address ?? ""}{m.sites?.city ? `, ${m.sites.city}` : ""}</p>
          <p className="text-sm text-muted-foreground">{formatDate(m.scheduled_date)}{m.start_time ? ` à ${String(m.start_time).slice(0, 5)}` : ""} · {m.assignee ?? "sans intervenant"}</p>
        </div>
        <PrintButton />
      </div>
      <section><h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Verdict : {v.r.verdictLabel}</h2><p className="text-[15px] leading-relaxed">{v.r.text}</p></section>
      <section><h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Points d&apos;analyse</h2>
        <ul className="list-disc space-y-1 pl-5 text-[14px]">{v.a.insights.length ? v.a.insights.map((i) => <li key={i.key + i.title}>{i.title}{i.detail ? ` — ${i.detail}` : ""}</li>) : <li>Rien à signaler.</li>}</ul></section>
      <section><h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Check-list ({v.a.metrics.checklistDone}/{v.a.metrics.checklistTotal})</h2>
        {checklist.length ? <ul className="space-y-1 text-[14px]">{checklist.map((c, i) => <li key={i}>{c.done ? "☑" : "☐"} {c.room ? `${c.room} — ` : ""}{c.label}</li>)}</ul> : <p className="text-[14px] text-muted-foreground">Aucun point de contrôle.</p>}</section>
      <section><h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Chronologie</h2>
        <ul className="space-y-1 text-[14px]">{timeline.map((e, i) => <li key={i}>{new Date(e.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} — {e.label}{e.detail ? ` (${e.detail})` : ""}</li>)}</ul></section>
      <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Photos ({v.photos.length})</h2>
        <div className="grid grid-cols-3 gap-2">{v.photos.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <figure key={p.id}><img src={`/api/missions/photo/${p.id}`} alt={`Photo ${p.kind}`} className="aspect-square w-full rounded border object-cover" /><figcaption className="text-xs capitalize text-muted-foreground">{p.kind}</figcaption></figure>
        ))}</div></section>
      <p className="text-[11px] text-muted-foreground">Rapport établi à partir des faits enregistrés (pointage GPS, photos, check-list). Aucun montant n&apos;y figure.</p>
    </article>
    </>
  );
}

import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerJob, type CleanerOverview } from "@/lib/agent";
import { cleanerZoneAction } from "@/app/actions/nettoyeur";
import { dayFr, eur, slot } from "@/lib/cleaner-ui";
import { AgentHeader } from "@/components/agent/header";
import { Gate } from "@/components/agent/gate";
import { LiveRefresh } from "@/components/nettoyeur/live";
import { JobRequest } from "@/components/nettoyeur/job-request";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demandes — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Zone = { postal_code: string; city: string | null; open_jobs: number; listings: number; avg_amount: number | null; km: number | null };
const level = (z: Zone) => (z.open_jobs >= 3 ? { t: "Forte demande", c: "bg-[var(--a-badbg)] text-[var(--a-bad)]" } : z.open_jobs >= 1 ? { t: "Demande", c: "bg-[var(--a-warnbg)] text-[var(--a-warn)]" } : { t: "À venir", c: "bg-[var(--a-soft)] text-[var(--a-pri)]" });

/** Demandes : tous les ménages disponibles autour de soi, puis les zones où il y a de la demande. */
export default async function CleanerRequests({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const c = agentClient();
  const [ov, jobsRes, zonesRes] = await Promise.all([c.rpc("cleaner_overview", { p_token: token }), c.rpc("cleaner_open_jobs", { p_token: token }), c.rpc("cleaner_zones", { p_token: token })]);
  if (ov.error) return <Gate text={agentMessage(ov.error.message)} back={{ href: "/nettoyeur?reset=1", label: "Retrouver mon accès" }} />;
  if (jobsRes.error) return <Gate text={agentMessage(jobsRes.error.message)} />;
  const o = ov.data as CleanerOverview, jobs = (jobsRes.data as { jobs: CleanerJob[] }).jobs, zones = (zonesRes.data ?? []) as Zone[];
  const days = [...new Set(jobs.map((j) => j.date))];
  return (
    <>
      <AgentHeader token={token} base="nettoyeur" name={o.name} title="Demandes" sub={`${o.has_location ? `Dans un rayon de ${o.radius_km} km` : `Département ${o.departments.join(", ")}`} · créneau ${slot(o.window_start, o.window_end)}`} right={<LiveRefresh ids={jobs.map((j) => j.id)} />} />
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      {!jobs.length && <p className="mb-4 rounded-3xl bg-[var(--a-card)] p-6 text-center text-[16px] text-[var(--a-mute)]">{o.online ? "Aucun ménage pour le moment. Restez en ligne : dès qu'un voyageur réserve près de vous, la demande apparaît ici et sur votre téléphone." : "Aucun ménage visible. Mettez-vous en ligne (bouton GO, onglet Aujourd'hui) : les nouvelles demandes vous arrivent en priorité."}</p>}
      {days.map((d) => (
        <section key={d} className="mb-4">
          <h2 className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">{dayFr(d)}</h2>
          <div className="space-y-3">{jobs.filter((j) => j.date === d).map((j) => <JobRequest key={j.id} token={token} j={j} />)}</div>
        </section>
      ))}

      <h2 className="mb-2 mt-6 flex items-center gap-1.5 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]"><Flame className="h-4 w-4" />Où il y a de la demande</h2>
      {!zones.length ? <p className="rounded-3xl bg-[var(--a-card)] p-5 text-[15px] text-[var(--a-mute)]">Les zones de demande apparaissent ici dès que des logements et des réservations sont enregistrés.</p> : (
        <div className="space-y-2">
          {zones.map((z) => { const l = level(z); return (
            <div key={z.postal_code} className="flex items-center gap-3 rounded-2xl bg-[var(--a-card)] p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-extrabold">{z.city ?? z.postal_code} <span className="font-semibold text-[var(--a-mute)]">{z.postal_code}</span></div>
                <div className="text-[13px] text-[var(--a-mute)]">{z.open_jobs} ménage{z.open_jobs > 1 ? "s" : ""} en attente{z.avg_amount ? ` · environ ${eur(z.avg_amount)}` : ""}{z.listings ? ` · ${z.listings} logement${z.listings > 1 ? "s" : ""}` : ""}{z.km != null ? ` · à ${String(z.km).replace(".", ",")} km` : ""}</div>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold ${l.c}`}>{l.t}</span>
              </div>
              <form action={cleanerZoneAction.bind(null, token, z.postal_code, z.city ?? z.postal_code)}><button className="rounded-xl border border-[var(--a-pri)] px-3 py-2 text-[13px] font-extrabold text-[var(--a-pri)]">Y aller</button></form>
            </div>
          ); })}
        </div>
      )}
      <p className="px-2 pt-4 text-center text-xs text-[var(--a-mute)]">L&apos;adresse exacte et les consignes s&apos;affichent après acceptation.</p>
    </>
  );
}

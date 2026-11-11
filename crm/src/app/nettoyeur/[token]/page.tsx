import type { Metadata } from "next";
import { MapPin, Clock, Star } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerJob, type CleanerOverview } from "@/lib/agent";
import { cleanerAcceptAction } from "@/app/actions/nettoyeur";
import { dayFr, eur, slot } from "@/lib/cleaner-ui";
import { Gate } from "@/components/agent/gate";
import { LiveRefresh, Remember, RequestCard } from "@/components/nettoyeur/live";
import { syncMarketplace } from "@/lib/marketplace/sync";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ménages disponibles — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Demandes de ménage disponibles dans les départements du nettoyeur. Le premier qui accepte l'obtient. */
export default async function CleanerRequests({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide. Retrouvez votre accès avec votre e-mail." back={{ href: "/nettoyeur/inscription#lien", label: "Retrouver mon accès" }} />;
  await syncMarketplace({ minutes: 30 }).catch(() => undefined);   // les réservations Airbnb/Booking deviennent des ménages à l'ouverture (au plus toutes les 30 min)
  const c = agentClient();
  const [ov, jobsRes] = await Promise.all([c.rpc("cleaner_overview", { p_token: token }), c.rpc("cleaner_open_jobs", { p_token: token })]);
  if (ov.error) return <Gate text={agentMessage(ov.error.message)} back={{ href: "/nettoyeur?reset=1", label: "Retrouver mon accès" }} />;
  if (jobsRes.error) return <Gate text={agentMessage(jobsRes.error.message)} />;
  const o = ov.data as CleanerOverview, jobs = (jobsRes.data as { jobs: CleanerJob[] }).jobs;
  const days = [...new Set(jobs.map((j) => j.date))];
  return (
    <>
      <header className="mb-4">
        <Remember token={token} />
        <div className="flex items-center justify-between"><span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">ProClean</span><LiveRefresh /></div>
        <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-tight">Bonjour {o.name.split(" ")[0]}</h1>
        <p className="text-[15px] text-[var(--a-mute)]">{o.has_location ? `Ménages dans un rayon de ${o.radius_km} km` : `Ménages en ${o.departments.join(", ")}`} · créneau {slot(o.window_start, o.window_end)}, fin au plus tard à {o.max_end.slice(0, 5).replace(":", "h")}</p>
      </header>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      {!jobs.length && <p className="rounded-3xl bg-[var(--a-card)] p-8 text-center text-[16px] text-[var(--a-mute)]">Aucun ménage disponible pour le moment autour de chez vous. Revenez bientôt : un ménage apparaît ici dès qu&apos;un voyageur réserve.</p>}
      {days.map((d) => (
        <section key={d} className="mb-4">
          <h2 className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">{dayFr(d)}</h2>
          <div className="space-y-3">
            {jobs.filter((j) => j.date === d).map((j) => (
              <RequestCard key={j.id} id={j.id} accept={<form action={cleanerAcceptAction.bind(null, token, j.id)}><button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white active:opacity-90">J&apos;accepte</button></form>}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[18px] font-extrabold leading-snug">{j.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[14px] text-[var(--a-mute)]"><MapPin className="h-4 w-4" />{j.city} {j.postal_code}{j.distance_km != null ? ` · à ${String(j.distance_km).replace(".", ",")} km` : ""}</div>
                    <div className="flex items-center gap-1.5 text-[14px] text-[var(--a-mute)]"><Clock className="h-4 w-4" />{slot(j.window_start, j.window_end)}{j.hours ? ` · environ ${j.hours} h` : ""}</div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-right"><div className="num text-[26px] font-extrabold leading-none text-[var(--a-ok)]">{eur(j.amount)}</div><div className="text-[12px] text-[var(--a-mute)]">pour vous</div></div>
                </div>
                {j.favorite && <div className="inline-flex items-center gap-1 rounded-full bg-[var(--a-warnbg)] px-2.5 py-1 text-xs font-extrabold text-[var(--a-warn)]"><Star className="h-3.5 w-3.5" />Le propriétaire vous a choisi comme favori</div>}
              </RequestCard>
            ))}
          </div>
        </section>
      ))}
      <p className="px-2 pt-2 text-center text-xs text-[var(--a-mute)]">L&apos;adresse exacte et les consignes s&apos;affichent après acceptation. Ce lien est personnel : ne le partagez pas.</p>
    </>
  );
}

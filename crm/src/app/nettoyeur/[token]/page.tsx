import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Clock, Star, Flame } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerJob, type CleanerOverview } from "@/lib/agent";
import { cleanerAcceptAction, cleanerZoneAction } from "@/app/actions/nettoyeur";
import { dayFr, eur, slot } from "@/lib/cleaner-ui";
import { initials } from "@/lib/field-ui";
import { Gate } from "@/components/agent/gate";
import { LiveRefresh, OnlinePanel, Remember, RequestCard } from "@/components/nettoyeur/live";
import { syncMarketplace } from "@/lib/marketplace/sync";
import { dispatchTick } from "@/lib/marketplace/notify";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Accueil — ProClean Nettoyeur", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Zone = { postal_code: string; city: string | null; open_jobs: number; listings: number; avg_amount: number | null; km: number | null };
const level = (z: Zone) => (z.open_jobs >= 3 ? { t: "Forte demande", c: "bg-[var(--a-badbg)] text-[var(--a-bad)]" } : z.open_jobs >= 1 ? { t: "Demande", c: "bg-[var(--a-warnbg)] text-[var(--a-warn)]" } : { t: "À venir", c: "bg-[var(--a-soft)] text-[var(--a-pri)]" });

/** Accueil du nettoyeur, comme l'application des chauffeurs : bouton En ligne, gains du jour, demandes en direct, zones de demande. */
export default async function CleanerHome({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide. Retrouvez votre accès avec votre e-mail." back={{ href: "/nettoyeur/inscription#lien", label: "Retrouver mon accès" }} />;
  await syncMarketplace({ minutes: 30 }).catch(() => undefined);   // réservations Airbnb/Booking → ménages (au plus toutes les 30 min)
  await dispatchTick().catch(() => undefined);                      // vagues de distribution (au plus toutes les 20 s)
  const c = agentClient();
  const [ov, jobsRes, zonesRes, pushRes] = await Promise.all([c.rpc("cleaner_overview", { p_token: token }), c.rpc("cleaner_open_jobs", { p_token: token }), c.rpc("cleaner_zones", { p_token: token }), c.rpc("cleaner_push_status", { p_token: token })]);
  if (ov.error) return <Gate text={agentMessage(ov.error.message)} back={{ href: "/nettoyeur?reset=1", label: "Retrouver mon accès" }} />;
  if (jobsRes.error) return <Gate text={agentMessage(jobsRes.error.message)} />;
  const o = ov.data as CleanerOverview & { online: boolean; today_amount: number; week_amount: number };
  const jobs = (jobsRes.data as { jobs: (CleanerJob & { rank?: number | null })[] }).jobs;
  const zones = ((zonesRes.data ?? []) as Zone[]);
  const days = [...new Set(jobs.map((j) => j.date))];
  const here = o.city ?? o.postal_code ?? "vous";
  return (
    <>
      <Remember token={token} />
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">ProClean</span>
          <div className="flex items-center gap-3">
            <LiveRefresh ids={jobs.map((j) => j.id)} />
            <Link href={`/nettoyeur/${token}/profil`} aria-label="Profil" className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--a-soft)] bg-[var(--a-card)] text-[15px] font-extrabold text-[var(--a-pri)]">{initials(o.name)}</Link>
          </div>
        </div>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">Bonjour {o.name.split(" ")[0]}</h1>
      </header>

      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      <OnlinePanel token={token} online={o.online} hasPush={pushRes.data === true} zone={here} />

      <section className="mb-5 grid grid-cols-3 gap-2 text-center">
        {[["Aujourd'hui", o.today_amount], ["Cette semaine", o.week_amount], ["À recevoir", o.to_pay_amount + o.in_payout_amount]].map(([l, v]) => (
          <Link key={String(l)} href={`/nettoyeur/${token}/gains`} className="rounded-2xl bg-[var(--a-card)] p-3"><div className="num text-[22px] font-extrabold text-[var(--a-ok)]">{eur(Number(v))}</div><div className="text-[12px] font-bold text-[var(--a-mute)]">{l}</div></Link>
        ))}
      </section>

      <h2 className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">Ménages autour de vous · {o.has_location ? `${o.radius_km} km` : `dép. ${o.departments.join(", ")}`} · {slot(o.window_start, o.window_end)}</h2>
      {!jobs.length && (
        <p className="mb-4 rounded-3xl bg-[var(--a-card)] p-6 text-center text-[16px] text-[var(--a-mute)]">
          {o.online ? "Aucun ménage pour le moment. Restez en ligne : dès qu'un voyageur réserve près de vous, la demande apparaît ici et sur votre téléphone." : "Aucun ménage visible. Mettez-vous en ligne : les nouvelles demandes vous arrivent en priorité."}
        </p>
      )}
      {days.map((d) => (
        <section key={d} className="mb-4">
          <h3 className="mb-2 px-1 text-[13px] font-extrabold text-[var(--a-mute)]">{dayFr(d)}</h3>
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
                {j.rank === 1 && <div className="inline-flex rounded-full bg-[var(--a-okbg)] px-2.5 py-1 text-xs font-extrabold text-[var(--a-ok)]">Vous êtes le mieux placé</div>}
                {j.favorite && <div className="inline-flex items-center gap-1 rounded-full bg-[var(--a-warnbg)] px-2.5 py-1 text-xs font-extrabold text-[var(--a-warn)]"><Star className="h-3.5 w-3.5" />Le propriétaire vous a choisi comme favori</div>}
              </RequestCard>
            ))}
          </div>
        </section>
      ))}

      <h2 className="mb-2 mt-6 flex items-center gap-1.5 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]"><Flame className="h-4 w-4" />Où il y a de la demande</h2>
      {!zones.length ? (
        <p className="rounded-3xl bg-[var(--a-card)] p-5 text-[15px] text-[var(--a-mute)]">Les zones de demande apparaissent ici dès que des logements et des réservations sont enregistrés.</p>
      ) : (
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
      <p className="px-2 pt-4 text-center text-xs text-[var(--a-mute)]">L&apos;adresse exacte et les consignes s&apos;affichent après acceptation. Ce lien est personnel : ne le partagez pas.</p>
    </>
  );
}

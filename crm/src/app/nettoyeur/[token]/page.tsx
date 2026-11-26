import type { StockStatus } from "@/components/agent/stock";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerJob, type CleanerOverview } from "@/lib/agent";
import { dayFr, eur, slot } from "@/lib/cleaner-ui";
import { AgentHeader } from "@/components/agent/header";
import { Gate } from "@/components/agent/gate";
import { LiveRefresh, Remember } from "@/components/nettoyeur/live";
import { NextMissionHero, OnlineHero, OnlineSwitch, type HeroJob } from "@/components/nettoyeur/home";
import { Onboarding } from "@/components/nettoyeur/onboarding";
import { WeekStrip } from "@/components/nettoyeur/week-strip";
import { JobRequest } from "@/components/nettoyeur/job-request";
import { MissionFlow, type MissionJob } from "@/components/nettoyeur/mission-flow";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aujourd'hui — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };


/** Accueil : le prochain ménage en grand (ou le radar / le GO quand il n'y a rien), la semaine, les nouvelles demandes, les gains. Le détail est dans les onglets. */
export default async function CleanerToday({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide. Retrouvez votre accès avec votre e-mail." back={{ href: "/connexion", label: "Me connecter" }} />;
  const c = agentClient();
  const [ov, openRes, mineRes, pushRes] = await Promise.all([c.rpc("cleaner_overview", { p_token: token }), c.rpc("cleaner_open_jobs", { p_token: token }), c.rpc("cleaner_my_jobs", { p_token: token }), c.rpc("cleaner_push_status", { p_token: token })]);
  if (ov.error) return <Gate text={agentMessage(ov.error.message)} back={{ href: "/connexion", label: "Me connecter" }} />;
  const o = ov.data as CleanerOverview;
  const open = ((openRes.data as { jobs: CleanerJob[] } | null)?.jobs ?? []);
  const mine = ((mineRes.data as { jobs: CleanerJob[] } | null)?.jobs ?? []);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const missions = `/nettoyeur/${token}/missions`;

  // Mission guidée : dès 2 h avant le créneau, et jusqu'à la fin, le nettoyeur ne voit que sa mission (la plus proche), rien d'autre.
  const [hh, mm] = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
  const parisMin = ((hh ?? 0) % 24) * 60 + (mm ?? 0);
  const startMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const upcoming = mine.filter((j) => (j.status === "acceptee" || j.status === "a_reprendre") && j.date >= today).sort((a, b) => (a.date + a.window_start).localeCompare(b.date + b.window_start));
  const hero = upcoming[0], more = upcoming.slice(1, 4);
  const waiting = mine.filter((j) => j.status === "a_verifier").length;
  const dismissed = (cookies().get("pce_mission_ok")?.value ?? "").split(",");
  // « Retour à l'accueil » ne masque qu'une mission terminée : un ménage encore à faire revient toujours sur l'écran guidé.
  const live = mine.filter((j) => ((j.status === "acceptee" || j.status === "a_reprendre") ? (j.date < today || (j.date === today && (parisMin >= startMin(j.window_start) - 120 || !!j.arrived_at))) : !dismissed.includes(j.id) && (j.status === "a_verifier" || j.status === "validee") && j.date === today && !!j.arrived_at))
    .sort((a, b) => (a.date + a.window_start).localeCompare(b.date + b.window_start))[0];
  if (live) {
    const lists = await c.rpc("cleaner_checklists", { p_token: token });
    const tasks = ((lists.data ?? {}) as Record<string, { label: string; done: boolean }[]>)[live.id] ?? [];
    const job: MissionJob = {
      id: live.id, title: live.title, status: live.status ?? "acceptee", date: live.date, window_start: live.window_start, window_end: live.window_end, hours: live.hours, amount: Number(live.amount),
      address: live.address ?? null, postal_code: live.postal_code, city: live.city, access_notes: live.access_notes ?? null, arrived_at: live.arrived_at ?? null,
      photos_before: live.photos_before ?? 0, photos_after: live.photos_after ?? 0, review_note: live.review_note ?? null, departure: live.departure ?? null,
      before_report: live.before_report ?? null, ai_report: live.ai_report ?? null
    };
    // Le stock n'est demandé qu'une fois le ménage envoyé ou validé : inutile de le lire avant.
    const st = job.status === "a_verifier" || job.status === "validee" ? await agentClient().rpc("stock_status", { p_space: "nettoyeur", p_token: token, p_ref: job.id }) : null;
    return <><Remember token={token} /><MissionFlow token={token} job={job} tasks={tasks} stock={!st || st.error ? null : (st.data as StockStatus)} /></>;
  }
  const hour = Math.floor(parisMin / 60), greet = hour < 5 || hour >= 18 ? "Bonsoir" : hour < 12 ? "Bonjour" : "Bon après-midi";
  const tomorrow = new Date(`${today}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayLabel = (d: string) => (d === today ? "Aujourd'hui" : d === tomorrow.toISOString().slice(0, 10) ? "Demain" : dayFr(d));
  const heroJob: HeroJob | null = hero ? {
    title: hero.title, city: hero.city, day: dayLabel(hero.date), slot: slot(hero.window_start, hero.window_end), amount: eur(hero.amount), hours: hero.hours,
    maps: hero.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([hero.address, hero.postal_code, hero.city].filter(Boolean).join(" "))}` : null
  } : null;
  const inMin = hero ? Math.round((Date.parse(`${hero.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 60000) + startMin(hero.window_start) - parisMin : 0;
  const zone = o.city ?? o.postal_code ?? "vous";
  const hasPush = pushRes.data === true;
  const openTotal = eur(open.reduce((n, j) => n + Number(j.amount), 0));
  const week = Number(o.week_amount), toPay = Number(o.to_pay_amount) + Number(o.in_payout_amount), earned = week > 0 || toPay > 0 || Number(o.today_amount) > 0;
  const lbl = "text-[12px] font-bold uppercase tracking-wider text-[var(--a-mute)]";
  return (
    <>
      <Remember token={token} />
      <AgentHeader token={token} base="nettoyeur" name={o.name} title={`${greet}, ${o.name.split(" ")[0]}`} right={<LiveRefresh ids={open.map((j) => j.id)} />} />
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      {heroJob ? (
        <>
          <NextMissionHero href={missions} job={heroJob} inMin={inMin} />
          <OnlineSwitch token={token} online={o.online} hasPush={hasPush} />
        </>
      ) : (
        <OnlineHero token={token} online={o.online} hasPush={hasPush} zone={zone} openCount={open.length} openTotal={openTotal} />
      )}

      <Onboarding token={token} o={o} />
      <WeekStrip today={today} href={missions} jobs={mine.filter((j) => j.status === "acceptee" || j.status === "a_reprendre" || j.status === "a_verifier")} />

      {waiting > 0 && (
        <Link href={missions} className="fx-in fx-press mt-3 flex items-center gap-3 rounded-3xl bg-[var(--a-warnbg)] p-4 text-[var(--a-warn)]" style={{ animationDelay: "150ms" }}>
          <Clock className="h-6 w-6 shrink-0" /><span className="flex-1 text-[15px] font-extrabold">{waiting} ménage{waiting > 1 ? "s" : ""} en attente de validation</span><ChevronRight className="h-5 w-5" />
        </Link>
      )}

      {open.length > 0 && (
        <section className="fx-in mt-5" style={{ animationDelay: "180ms" }}>
          <div className="mb-2 flex items-center justify-between px-1"><h2 className={lbl}>À saisir ({open.length})</h2><Link href={`/nettoyeur/${token}/demandes`} className="text-[13px] font-extrabold text-[var(--a-pri)]">Tout voir</Link></div>
          <div className="space-y-3">{open.slice(0, 2).map((j) => <JobRequest key={j.id} token={token} j={j} showDay />)}</div>
        </section>
      )}

      {more.length > 0 && (
        <section className="fx-in mt-5 space-y-2" style={{ animationDelay: "220ms" }}>
          <h2 className={`px-1 ${lbl}`}>Ensuite</h2>
          {more.map((j) => (
            <Link key={j.id} href={missions} className="fx-press flex items-center justify-between gap-2 rounded-3xl bg-[var(--a-card)] p-4">
              <span className="min-w-0"><span className="block truncate text-[16px] font-extrabold">{j.title}</span><span className="block truncate text-sm text-[var(--a-mute)]">{dayLabel(j.date)} · {slot(j.window_start, j.window_end)}</span></span>
              <span className="num shrink-0 font-extrabold text-[var(--a-ok)]">{eur(j.amount)}</span>
            </Link>
          ))}
        </section>
      )}

      <Link href={`/nettoyeur/${token}/gains`} className="fx-in fx-press mt-5 flex items-center justify-between gap-3 rounded-3xl bg-[var(--a-card)] p-4" style={{ animationDelay: "260ms" }}>
        {earned ? (
          <>
            <span><span className={`block ${lbl}`}>Cette semaine</span><span className="num block text-[32px] font-extrabold leading-tight text-[var(--a-ok)]">{eur(week)}</span>{Number(o.today_amount) > 0 && <span className="rounded-full bg-[var(--a-okbg)] px-2.5 py-0.5 text-[12px] font-extrabold text-[var(--a-ok)]">+{eur(o.today_amount)} aujourd&apos;hui</span>}</span>
            <span className="text-right"><span className={`block ${lbl}`}>À recevoir</span><span className="num block text-[24px] font-extrabold">{eur(toPay)}</span></span>
          </>
        ) : (
          <span className="text-[15px] font-semibold text-[var(--a-mute)]">Vos gains apparaîtront ici dès votre premier ménage.</span>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--a-mute)]" />
      </Link>
    </>
  );
}

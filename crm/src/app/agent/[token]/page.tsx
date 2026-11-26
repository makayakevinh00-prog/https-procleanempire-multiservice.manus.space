import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentMission } from "@/lib/agent";
import { dayLabel, dict, isoDate, layoutDay, shiftDay, ROW } from "@/lib/field-ui";
import { AgentHeader } from "@/components/agent/header";
import { StagePill } from "@/components/agent/stage-pill";
import { Invalid } from "@/components/agent/invalid";
import { Countdown, NowLine } from "@/components/agent/now-line";
import { DayStrip } from "@/components/agent/day-strip";
import { Navigation } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes missions — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Aujourd'hui : navigation par jour et frise horaire des missions de l'agent. */
export default async function AgentToday({ params, searchParams }: { params: { token: string }; searchParams: { d?: string; ok?: string; error?: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  const token = params.token;
  if (!isToken(token)) return <Invalid t={t} text={t.invalidText} />;
  const asked = isoDate(searchParams.d);
  const call = (d: string | null) => agentClient().rpc("agent_day", { p_token: token, p_date: d });
  let res = await call(asked);
  if (res.error && /ARGUMENT/.test(res.error.message)) res = await call(null);   // date hors période : retour à aujourd'hui
  if (res.error) return <Invalid t={t} text={agentMessage(res.error.message)} />;
  const { agent, today, date, missions } = res.data as { agent: string; today: string; date: string; missions: AgentMission[] };
  const lay = layoutDay(missions);
  const byId = new Map(missions.map((m) => [m.id, m]));
  const link = (d: string) => `/agent/${token}?d=${d}`;
  const href = (id: string) => `/agent/${token}/mission/${id}`;
  // Où en est la journée : la mission en cours, sinon le prochain rendez-vous.
  const isToday = date === today;
  const byTime = [...missions].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
  const current = isToday ? byTime.find((m) => ["en_route", "arrivee", "en_cours"].includes(m.stage)) : undefined;
  const next = isToday && !current ? byTime.find((m) => ["planifiee", "affectee"].includes(m.stage)) : undefined;
  const LIVE: Record<string, string> = { en_route: "Vous êtes en route", arrivee: "Vous êtes sur place", en_cours: "Prestation en cours" };

  return (
    <>
      <AgentHeader token={token} name={agent} title={`${t.hello}, ${agent.split(" ")[0]}`} />
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      <div className="mb-4 flex items-center rounded-2xl border border-[var(--a-line)] px-2 py-3">
        <Link href={link(shiftDay(date, -1))} aria-label={t.prevDay} className="flex h-10 w-10 items-center justify-center text-[var(--a-pri)]"><ChevronLeft className="h-6 w-6" /></Link>
        <div className="flex-1 text-center">
          <div className="text-[19px] font-extrabold">{dayLabel(date, lang)}</div>
          {date === today ? <span className="mt-1 inline-block rounded-full bg-[var(--a-soft)] px-3 py-0.5 text-[13px] font-bold text-[var(--a-pri)]">{t.today}</span>
            : <Link href={`/agent/${token}`} className="mt-1 inline-block rounded-full bg-[var(--a-soft)] px-3 py-0.5 text-[13px] font-bold text-[var(--a-pri)]">{t.backToday}</Link>}
        </div>
        <Link href={link(shiftDay(date, 1))} aria-label={t.nextDay} className="flex h-10 w-10 items-center justify-center text-[var(--a-pri)]"><ChevronRight className="h-6 w-6" /></Link>
      </div>

      <DayStrip token={token} date={date} today={today} />

      {missions.length > 0 && (
        <div className="fx-in mb-4 grid grid-cols-3 gap-2 text-center" style={{ animationDelay: "100ms" }}>
          <div className="rounded-2xl bg-[var(--a-card)] p-3"><b className="num block text-[26px] leading-tight text-[var(--a-pri)]">{missions.length}</b><span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--a-mute)]">Missions</span></div>
          <div className="rounded-2xl bg-[var(--a-card)] p-3"><b className="num block text-[26px] leading-tight text-[var(--a-pri)]">{String(Math.round(missions.reduce((a, m) => a + (m.hours ?? 0), 0) * 10) / 10).replace(".", ",")} h</b><span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--a-mute)]">Au total</span></div>
          <div className="rounded-2xl bg-[var(--a-card)] p-3"><b className="num block text-[26px] leading-tight text-[var(--a-pri)]">{byTime[0]?.time ? byTime[0].time.slice(0, 5).replace(":", "h") : "—"}</b><span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--a-mute)]">Début</span></div>
        </div>
      )}

      {current && (
        <Link href={href(current.id)} className="fx-hero fx-shine fx-in fx-press relative mb-4 block rounded-[32px] p-5 text-white shadow-[0_24px_44px_-20px_rgba(30,58,110,0.75)]">
          <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider opacity-90"><span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white" />{LIVE[current.stage]}</span>
          <span className="mt-1 block text-[22px] font-extrabold leading-tight">{current.client}</span>
          <span className="block text-[14px] opacity-90">{current.time ? `${current.time.slice(0, 5)} · ` : ""}{current.title}{current.hours ? ` · ${current.hours} h` : ""}</span>
          <span className="mt-3 flex h-12 items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-[var(--a-pri)]">Reprendre la mission</span>
        </Link>
      )}
      {next && (
        <section className="fx-hero fx-shine fx-in relative mb-4 rounded-[32px] p-5 text-white shadow-[0_24px_44px_-20px_rgba(30,58,110,0.75)]">
          <span className="flex items-center justify-between gap-2"><span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-extrabold uppercase tracking-wider">Prochain rendez-vous</span>{next.time && <span className="num text-[16px] font-extrabold"><Countdown time={next.time} /></span>}</span>
          <Link href={href(next.id)} className="mt-4 block">
            <span className="block text-[28px] font-extrabold leading-[1.05] tracking-tight">{next.client}</span>
            <span className="mt-1.5 block text-[15px] font-semibold text-white/85">{next.time ? `${next.time.slice(0, 5)} · ` : ""}{next.title}{next.hours ? ` · ${next.hours} h` : ""}</span>
            {next.address && <span className="block text-[14px] text-white/75">{next.address}</span>}
          </Link>
          <div className="mt-5 flex gap-2">
            <Link href={href(next.id)} className="fx-press flex h-14 flex-1 items-center justify-center rounded-full bg-white text-[17px] font-extrabold" style={{ color: "#1e3a6e" }}>Ouvrir la mission</Link>
            {next.address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next.address)}`} target="_blank" rel="noopener noreferrer" aria-label="Itinéraire" className="fx-press flex h-14 w-14 items-center justify-center rounded-full bg-white/20"><Navigation className="h-6 w-6" /></a>}
          </div>
        </section>
      )}
      {isToday && !current && !next && missions.length > 0 && <p className="mb-4 rounded-3xl bg-[var(--a-okbg)] p-4 text-center text-[15px] font-extrabold text-[var(--a-ok)]">Journée terminée : plus de rendez-vous aujourd&apos;hui.</p>}

      {lay.loose.length > 0 && (
        <section className="mb-3 space-y-2">
          <h2 className="px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">{t.noTime}</h2>
          {lay.loose.map((id) => { const m = byId.get(id)!; return (
            <Link key={id} href={href(id)} className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--a-card)] p-4">
              <span className="min-w-0"><span className="block truncate text-[17px] font-extrabold">{m.client}</span><span className="block truncate text-sm text-[var(--a-mute)]">{m.title}{m.site ? ` · ${m.site}` : ""}</span></span>
              <StagePill stage={m.stage} t={t} />
            </Link>); })}
        </section>
      )}

      <section aria-label="Frise horaire" className="relative" style={{ height: lay.height }}>
        {lay.hours.map((h, i) => (
          <div key={h} className="absolute inset-x-0 border-t border-[var(--a-line)]" style={{ top: i * ROW }}>
            <span className="num -mt-0 block w-12 pt-1 text-[15px] font-bold text-[var(--a-mute)]">{String(h).padStart(2, "0")}h</span>
          </div>
        ))}
        {isToday && lay.hours.length > 0 && <NowLine firstHour={lay.hours[0]!} hours={lay.hours.length} row={ROW} scroll={!current && !next} />}
        {!missions.length && <p className="absolute inset-x-0 text-center text-[17px] text-[var(--a-mute)]" style={{ top: 18 }}>{t.noMission}</p>}
        <div className="absolute inset-y-0 left-14 right-0">
          {lay.blocks.map((b) => { const m = byId.get(b.id)!; return (
            <Link key={b.id} href={href(b.id)} className="absolute overflow-hidden rounded-2xl border-l-4 border-[var(--a-pri)] bg-[var(--a-soft)] p-2.5"
              style={{ top: b.top + 2, height: b.height - 4, left: `${(b.col / b.cols) * 100}%`, width: `calc(${100 / b.cols}% - 4px)` }}>
              <span className="block truncate text-[15px] font-extrabold leading-tight text-[var(--a-ink)]">{m.client}</span>
              <span className="block truncate text-[13px] text-[var(--a-mute)]">{b.start}–{b.end}{m.site ? ` · ${m.site}` : ""}</span>
              {b.height >= 84 && <span className="mt-1 inline-block"><StagePill stage={m.stage} t={t} /></span>}
            </Link>); })}
        </div>
      </section>
    </>
  );
}

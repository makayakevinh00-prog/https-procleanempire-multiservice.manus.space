import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentMission } from "@/lib/agent";
import { dayLabel, dict, isoDate, layoutDay, shiftDay, ROW } from "@/lib/field-ui";
import { AgentHeader } from "@/components/agent/header";
import { StagePill } from "@/components/agent/stage-pill";
import { Invalid } from "@/components/agent/invalid";

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

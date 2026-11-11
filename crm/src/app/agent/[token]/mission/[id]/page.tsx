import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare, Square, MapPin, Phone, KeyRound, AlertTriangle, Clock, ChevronLeft } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentMission } from "@/lib/agent";
import { agentCheckAction, agentCheckInAction, agentFinishAction, agentIssueAction, agentStageAction } from "@/app/actions/agent";
import { GeoButton } from "@/components/crm/geo-button";
import { PhotoButton } from "@/components/crm/photo-button";
import { dayLabel, dict } from "@/lib/field-ui";
import { StagePill } from "@/components/agent/stage-pill";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mission — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const NEXT: Record<string, string> = { planifiee: "en_route", affectee: "en_route", en_route: "arrivee", arrivee: "en_cours", en_cours: "terminee" };
const hhmm = (t: string) => new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const UUID = /^[0-9a-f-]{36}$/i;

/** Détail d'une mission : tout ce qu'il faut sur place (adresse, accès, consignes, contact, check-list, photos, pointage, signalement). */
export default async function MissionPage({ params, searchParams }: { params: { token: string; id: string }; searchParams: { ok?: string; error?: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  const { token, id } = params;
  if (!isToken(token) || !UUID.test(id)) return <Invalid t={t} text={t.invalidText} />;
  const { data, error } = await agentClient().rpc("agent_mission", { p_token: token, p_id: id });
  if (error) return <Invalid t={t} text={agentMessage(error.message)} />;
  const m = (data as { mission: AgentMission }).mission;
  const nextStage = NEXT[m.stage];
  const done = m.checklist.filter((c) => c.done).length;
  const editable = ["planifiee", "affectee", "en_route", "arrivee", "en_cours"].includes(m.stage);
  const finished = ["terminee", "a_verifier", "validee", "facturable", "facturee"].includes(m.stage);
  const card = "rounded-2xl bg-[var(--a-card)] p-4";

  return (
    <article className="space-y-3">
      <Link href={`/agent/${token}?d=${m.date}`} className="inline-flex items-center gap-1 text-[15px] font-bold text-[var(--a-pri)]"><ChevronLeft className="h-5 w-5" />{t.back}</Link>
      {searchParams.error && <div role="alert" className="rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{m.client}</h1>
          <p className="text-[15px] text-[var(--a-mute)]">{m.title}{m.site ? ` · ${m.site}` : ""}</p>
        </div>
        <StagePill stage={m.stage} t={t} />
      </header>

      <div className={`${card} flex items-center gap-2 text-[16px] font-bold`}><Clock className="h-5 w-5 text-[var(--a-pri)]" />{dayLabel(m.date, lang)} · {m.time ? m.time.slice(0, 5) : t.freeTime}{m.hours ? ` · ${m.hours} h` : ""}</div>

      {m.address && <a className={`${card} flex items-start gap-3 text-[16px] font-bold text-[var(--a-pri)]`} href={`https://maps.google.com/?q=${encodeURIComponent(m.address)}`} target="_blank" rel="noopener noreferrer"><MapPin className="mt-0.5 h-5 w-5 shrink-0" />{m.address}</a>}
      {m.access && <div className="flex items-start gap-3 rounded-2xl bg-[var(--a-warnbg)] p-4 text-[15px] text-[var(--a-warn)]"><KeyRound className="mt-0.5 h-5 w-5 shrink-0" /><span><b>{t.access} :</b> {m.access}</span></div>}
      {m.notes && <p className={`${card} text-[15px]`}><b>{t.instructions} :</b> {m.notes}</p>}
      {m.contact_phone && <a href={`tel:${m.contact_phone}`} className={`${card} flex items-center gap-3 text-[16px] font-bold text-[var(--a-pri)]`}><Phone className="h-5 w-5" />{m.contact_name ?? t.contact} · {m.contact_phone}</a>}

      {m.checklist.length > 0 && (
        <section className={card}>
          <div className="mb-2 text-[15px] font-extrabold">{t.checklist} ({done}/{m.checklist.length})</div>
          <ul className="space-y-1.5">{m.checklist.map((c, i) => (
            <li key={i}>
              <form action={agentCheckAction.bind(null, token, m.id, i, !c.done)}>
                <button disabled={!editable && m.stage !== "terminee"} className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--a-bg)] px-3 text-left text-[16px] disabled:opacity-60">
                  {c.done ? <CheckSquare className="h-6 w-6 shrink-0 text-[var(--a-ok)]" /> : <Square className="h-6 w-6 shrink-0 text-[var(--a-mute)]" />}
                  <span className={c.done ? "text-[var(--a-mute)] line-through" : ""}>{c.label}</span>
                </button>
              </form>
            </li>
          ))}</ul>
        </section>
      )}

      {editable && (
        <div className="grid grid-cols-2 gap-2">
          <PhotoButton token={token} mission={m.id} kind="avant" label={t.photoBefore} />
          <PhotoButton token={token} mission={m.id} kind="apres" label={t.photoAfter} />
        </div>
      )}
      {m.photos > 0 && <div className="text-xs text-[var(--a-mute)]">{t.photosSent(m.photos)}</div>}

      {m.arrived_at && <div className="rounded-2xl bg-[var(--a-soft)] p-3 text-[14px] font-bold text-[var(--a-pri)]">{t.arrival} {hhmm(m.arrived_at)} {m.arrived_verified ? `✓ ${t.verified}` : `(${t.notVerified})`}{m.departed_at ? ` · ${t.departure} ${hhmm(m.departed_at)}` : ""}</div>}
      {nextStage === "arrivee" && <GeoButton label={t.next.arrivee} action={agentCheckInAction.bind(null, token, m.id)} className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white active:opacity-90 disabled:opacity-60" />}
      {nextStage === "terminee" && <GeoButton optional label={t.next.terminee} action={agentFinishAction.bind(null, token, m.id)} className="h-14 w-full rounded-2xl bg-[var(--a-ok)] text-lg font-extrabold text-[var(--a-bg)] active:opacity-90 disabled:opacity-60" />}
      {nextStage && nextStage !== "arrivee" && nextStage !== "terminee" && (
        <form action={agentStageAction.bind(null, token, m.id, nextStage)}><button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white active:opacity-90">{t.next[nextStage]}</button></form>
      )}
      {finished && <div className="rounded-2xl bg-[var(--a-okbg)] p-3 text-center text-sm font-bold text-[var(--a-ok)]">{m.stage === "terminee" || m.stage === "a_verifier" ? t.finishedWait : t.checked}</div>}
      {m.open_issues > 0 && <div className="flex items-center gap-2 text-sm font-bold text-[var(--a-warn)]"><AlertTriangle className="h-4 w-4" />{t.issuesOpen(m.open_issues)}</div>}

      {(editable || m.stage === "terminee") && (
        <details className="rounded-2xl border border-[var(--a-line)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[16px] font-extrabold text-[var(--a-warn)]"><AlertTriangle className="h-5 w-5" /> {t.reportIssue}</summary>
          <form action={agentIssueAction.bind(null, token, m.id)} className="space-y-2 border-t border-[var(--a-line)] p-3">
            <textarea name="description" required minLength={3} rows={3} placeholder={t.whatHappened} className="w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] p-3 text-base" />
            <select name="severity" defaultValue="normale" className="h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base">
              <option value="faible">{t.minor}</option><option value="normale">{t.normal}</option><option value="haute">{t.urgent}</option>
            </select>
            <button className="h-12 w-full rounded-2xl bg-[var(--a-warn)] text-base font-extrabold text-[var(--a-bg)]">{t.sendManager}</button>
          </form>
          <div className="border-t border-[var(--a-line)] p-3"><PhotoButton token={token} mission={m.id} kind="anomalie" label={t.issuePhoto} /></div>
        </details>
      )}
    </article>
  );
}

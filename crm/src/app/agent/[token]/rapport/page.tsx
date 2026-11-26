import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken } from "@/lib/agent";
import { dict, shortDate } from "@/lib/field-ui";
import { AgentHeader } from "@/components/agent/header";
import { StagePill } from "@/components/agent/stage-pill";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon mois — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Month = {
  agent: string; month: string; today: string; first_month: string | null;
  missions: number; hours: number; days: number; sites: number;
  arrivals: number; verified: number; punct_total: number; punct_ok: number;
  validated: number; redo: number; issues: number; cancelled: number; upcoming: number; upcoming_hours: number;
  by_client: { client: string; missions: number; hours: number }[];
  list: { id: string; date: string; time: string | null; client: string; site: string | null; hours: number | null; stage: string }[];
};

const h = (n: number) => `${Math.round(n * 10) / 10}`.replace(".", ",");
const ym = (iso: string) => iso.slice(0, 7);
const shift = (iso: string, d: number) => { const x = new Date(`${iso.slice(0, 7)}-15T12:00:00Z`); x.setUTCMonth(x.getUTCMonth() + d); return x.toISOString().slice(0, 7); };
const monthName = (iso: string) => { const s = new Date(`${iso.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }); return s.charAt(0).toUpperCase() + s.slice(1); };

/** « Mon mois » : ce que l'agent a fait (heures, missions), s'il arrive à l'heure, la qualité de son travail, et où il a travaillé. Sert aussi à vérifier sa paie. */
export default async function ReportPage({ params, searchParams }: { params: { token: string }; searchParams: { m?: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  const token = params.token;
  if (!isToken(token)) return <Invalid t={t} text={t.invalidText} />;
  const m = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.m ?? "") ? searchParams.m! : null;
  const { data, error } = await agentClient().rpc("agent_month", { p_token: token, p_month: m ? `${m}-01` : null });
  if (error) return <Invalid t={t} text={agentMessage(error.message)} />;
  const r = data as Month;
  const cur = ym(r.month), now = ym(r.today);
  const prev = shift(r.month, -1), next = shift(r.month, 1);
  const canPrev = !!r.first_month && cur > ym(r.first_month), canNext = cur < now;
  const link = (mm: string) => (mm === now ? `/agent/${token}/rapport` : `/agent/${token}/rapport?m=${mm}`);
  const punct = r.punct_total ? Math.round((100 * r.punct_ok) / r.punct_total) : null;
  const clean = r.missions ? Math.round((100 * (r.missions - r.redo)) / r.missions) : null;
  const maxH = Math.max(1, ...r.by_client.map((c) => c.hours));
  const card = "rounded-3xl border border-[var(--a-line)] p-4";
  const nav = "flex h-11 w-11 items-center justify-center rounded-full border border-[var(--a-line)]";

  return (
    <>
      <AgentHeader token={token} name={r.agent} title="Mon mois" sub="Ce que vous avez fait, et comment" />

      <div className="mb-4 flex items-center justify-between">
        {canPrev ? <Link href={link(prev)} aria-label="Mois précédent" className={nav}><ChevronLeft className="h-5 w-5" /></Link> : <span className={`${nav} opacity-30`}><ChevronLeft className="h-5 w-5" /></span>}
        <b className="text-[20px]">{monthName(r.month)}</b>
        {canNext ? <Link href={link(next)} aria-label="Mois suivant" className={nav}><ChevronRight className="h-5 w-5" /></Link> : <span className={`${nav} opacity-30`}><ChevronRight className="h-5 w-5" /></span>}
      </div>

      <section className="fx-hero fx-in relative mb-3 rounded-[32px] p-5 text-white">
        <div className="text-[13px] font-extrabold uppercase tracking-[0.16em] opacity-80">Heures travaillées</div>
        <div className="mt-1 flex items-end gap-2"><b className="num text-[56px] leading-none">{h(r.hours)}</b><span className="pb-2 text-[20px] font-bold">h</span></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[["Missions", r.missions], ["Jours", r.days], ["Lieux", r.sites]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-white/15 py-2"><b className="num block text-[24px] leading-none">{v}</b><span className="text-[12px] font-bold opacity-90">{k}</span></div>)}
        </div>
        <p className="mt-3 text-[13px] opacity-85">Ce sont les heures de vos missions terminées. Comparez-les à votre fiche de paie.</p>
      </section>

      {r.upcoming > 0 && cur === now && <p className="mb-3 rounded-2xl bg-[var(--a-soft)] p-3 text-center text-[14px] font-bold text-[var(--a-pri)]">À venir : {r.upcoming} mission{r.upcoming > 1 ? "s" : ""} · {h(r.upcoming_hours)} h prévues</p>}

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <section className={card}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--a-soft)] text-[var(--a-pri)]"><Clock className="h-5 w-5" /></span>
          <b className="num mt-2 block text-[34px] leading-none">{punct === null ? "—" : `${punct}%`}</b>
          <b className="mt-1 block text-[15px]">Ponctualité</b>
          <span className="text-[13px] leading-snug text-[var(--a-mute)]">{punct === null ? "Pas encore d'arrivée pointée ce mois-ci." : `${r.punct_ok} arrivée${r.punct_ok > 1 ? "s" : ""} à l'heure sur ${r.punct_total} (10 min de marge).`}</span>
        </section>
        <section className={card}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--a-okbg)] text-[var(--a-ok)]"><Sparkles className="h-5 w-5" /></span>
          <b className="num mt-2 block text-[34px] leading-none">{clean === null ? "—" : `${clean}%`}</b>
          <b className="mt-1 block text-[15px]">Qualité</b>
          <span className="text-[13px] leading-snug text-[var(--a-mute)]">{clean === null ? "Aucune mission terminée ce mois-ci." : r.redo ? `${r.redo} mission${r.redo > 1 ? "s" : ""} avec des zones à reprendre signalées par l'IA.` : "Aucune reprise demandée. Bravo !"}</span>
        </section>
      </div>

      <section className={`${card} mb-3 flex items-center gap-3`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--a-soft)] text-[var(--a-pri)]"><ShieldCheck className="h-5 w-5" /></span>
        <span className="text-[14px] leading-snug"><b>{r.verified}</b> arrivée{r.verified > 1 ? "s" : ""} confirmée{r.verified > 1 ? "s" : ""} sur place par votre position · <b>{r.validated}</b> mission{r.validated > 1 ? "s" : ""} validée{r.validated > 1 ? "s" : ""} · <b>{r.issues}</b> problème{r.issues > 1 ? "s" : ""} signalé{r.issues > 1 ? "s" : ""}{r.cancelled ? ` · ${r.cancelled} annulée${r.cancelled > 1 ? "s" : ""}` : ""}</span>
      </section>

      {r.by_client.length > 0 && (
        <section className={`${card} mb-4`}>
          <b className="mb-3 flex items-center gap-2 text-[17px]"><MapPin className="h-5 w-5 text-[var(--a-pri)]" />Où vous avez travaillé</b>
          <ul className="space-y-3">{r.by_client.map((c) => (
            <li key={c.client}>
              <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px] font-bold">{c.client}</span><span className="num shrink-0 text-[14px] text-[var(--a-mute)]">{h(c.hours)} h · {c.missions} mission{c.missions > 1 ? "s" : ""}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--a-card)]"><div className="h-full rounded-full bg-[var(--a-pri)]" style={{ width: `${Math.max(6, (100 * c.hours) / maxH)}%` }} /></div>
            </li>
          ))}</ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-[22px] font-extrabold">Missions du mois</h2><Link href={`/agent/${token}/historique`} className="text-[15px] font-extrabold text-[var(--a-pri)]">{t.seeAll}</Link></div>
        {!r.list.length ? <p className="py-8 text-center text-[16px] text-[var(--a-mute)]">Aucune mission terminée ce mois-ci.</p> : (
          <ul className="space-y-2">{r.list.map((x) => (
            <li key={x.id}><Link href={`/agent/${token}/mission/${x.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--a-card)] p-4">
              <span className="min-w-0"><span className="block truncate text-[16px] font-extrabold">{x.client}</span><span className="block truncate text-[13px] text-[var(--a-mute)]">{shortDate(x.date, lang)}{x.time ? ` · ${x.time.slice(0, 5)}` : ""}{x.hours ? ` · ${h(Number(x.hours))} h` : ""}{x.site ? ` · ${x.site}` : ""}</span></span>
              <StagePill stage={x.stage} t={t} />
            </Link></li>
          ))}</ul>
        )}
      </section>
    </>
  );
}

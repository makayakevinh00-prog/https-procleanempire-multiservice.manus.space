import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerJob, type CleanerOverview } from "@/lib/agent";
import { JOB_STATUS, dayFr, eur, slot } from "@/lib/cleaner-ui";
import { ROW, layoutDay } from "@/lib/field-ui";
import { AgentHeader } from "@/components/agent/header";
import { Gate } from "@/components/agent/gate";
import { LiveRefresh, OnlinePanel, Remember } from "@/components/nettoyeur/live";
import { JobRequest } from "@/components/nettoyeur/job-request";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aujourd'hui — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TONE: Record<string, string> = { acceptee: "border-[var(--a-pri)] bg-[var(--a-soft)]", a_verifier: "border-[var(--a-warn)] bg-[var(--a-warnbg)]", a_reprendre: "border-[var(--a-bad)] bg-[var(--a-badbg)]", validee: "border-[var(--a-ok)] bg-[var(--a-okbg)]" };

/** Aujourd'hui : même page que l'application des agents (frise de la journée), avec en plus le bouton En ligne, les gains et les nouvelles demandes. */
export default async function CleanerToday({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide. Retrouvez votre accès avec votre e-mail." back={{ href: "/nettoyeur/inscription#lien", label: "Retrouver mon accès" }} />;
  const c = agentClient();
  const [ov, openRes, mineRes, pushRes] = await Promise.all([c.rpc("cleaner_overview", { p_token: token }), c.rpc("cleaner_open_jobs", { p_token: token }), c.rpc("cleaner_my_jobs", { p_token: token }), c.rpc("cleaner_push_status", { p_token: token })]);
  if (ov.error) return <Gate text={agentMessage(ov.error.message)} back={{ href: "/nettoyeur?reset=1", label: "Retrouver mon accès" }} />;
  const o = ov.data as CleanerOverview;
  const open = ((openRes.data as { jobs: CleanerJob[] } | null)?.jobs ?? []);
  const mine = ((mineRes.data as { jobs: CleanerJob[] } | null)?.jobs ?? []);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const todays = mine.filter((j) => j.date === today), next = mine.filter((j) => j.date > today && j.status !== "validee").slice(0, 4);
  const lay = layoutDay(todays.map((j) => ({ id: j.id, time: j.window_start, hours: j.hours ?? 2 })));
  const byId = new Map(todays.map((j) => [j.id, j]));
  const missions = `/nettoyeur/${token}/missions`;
  return (
    <>
      <Remember token={token} />
      <AgentHeader token={token} base="nettoyeur" name={o.name} title={`Bonjour, ${o.name.split(" ")[0]}`} right={<LiveRefresh ids={open.map((j) => j.id)} />} />
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      <OnlinePanel token={token} online={o.online} hasPush={pushRes.data === true} zone={o.city ?? o.postal_code ?? "vous"} />

      <section className="mb-5 grid grid-cols-3 gap-2 text-center">
        {([["Aujourd'hui", o.today_amount], ["Cette semaine", o.week_amount], ["À recevoir", Number(o.to_pay_amount) + Number(o.in_payout_amount)]] as [string, number][]).map(([l, v]) => (
          <Link key={l} href={`/nettoyeur/${token}/gains`} className="rounded-2xl bg-[var(--a-card)] p-3"><div className="num text-[22px] font-extrabold text-[var(--a-ok)]">{eur(v)}</div><div className="text-[12px] font-bold text-[var(--a-mute)]">{l}</div></Link>
        ))}
      </section>

      {open.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">Nouvelles demandes ({open.length})</h2><Link href={`/nettoyeur/${token}/demandes`} className="text-[13px] font-extrabold text-[var(--a-pri)]">Tout voir</Link></div>
          <div className="space-y-3">{open.slice(0, 2).map((j) => <JobRequest key={j.id} token={token} j={j} showDay />)}</div>
        </section>
      )}

      <div className="mb-3 flex items-center rounded-2xl border border-[var(--a-line)] px-4 py-3">
        <div className="flex-1"><div className="text-[19px] font-extrabold">{dayFr(today)}</div><span className="mt-1 inline-block rounded-full bg-[var(--a-soft)] px-3 py-0.5 text-[13px] font-bold text-[var(--a-pri)]">{todays.length ? `${todays.length} ménage${todays.length > 1 ? "s" : ""}` : "Aucun ménage"}</span></div>
        <Link href={missions} className="flex items-center gap-1 text-[14px] font-extrabold text-[var(--a-pri)]">Mes ménages<ChevronRight className="h-5 w-5" /></Link>
      </div>
      <section aria-label="Frise horaire" className="relative" style={{ height: lay.height }}>
        {lay.hours.map((h, i) => (
          <div key={h} className="absolute inset-x-0 border-t border-[var(--a-line)]" style={{ top: i * ROW }}><span className="num block w-12 pt-1 text-[15px] font-bold text-[var(--a-mute)]">{String(h).padStart(2, "0")}h</span></div>
        ))}
        {!todays.length && <p className="absolute inset-x-0 px-14 text-center text-[16px] text-[var(--a-mute)]" style={{ top: 18 }}>{o.online ? "Rien de prévu aujourd'hui. Restez en ligne : les demandes arrivent ici." : "Rien de prévu aujourd'hui. Appuyez sur GO pour recevoir des ménages."}</p>}
        <div className="absolute inset-y-0 left-14 right-0">
          {lay.blocks.map((b) => { const j = byId.get(b.id)!; return (
            <Link key={b.id} href={missions} className={`absolute overflow-hidden rounded-2xl border-l-4 p-2.5 ${TONE[j.status ?? ""] ?? TONE.acceptee}`} style={{ top: b.top + 2, height: b.height - 4, left: `${(b.col / b.cols) * 100}%`, width: `calc(${100 / b.cols}% - 4px)` }}>
              <span className="block truncate text-[15px] font-extrabold leading-tight text-[var(--a-ink)]">{j.title}</span>
              <span className="block truncate text-[13px] text-[var(--a-mute)]">{slot(j.window_start, j.window_end)} · {j.city} · {eur(j.amount)}</span>
              <span className="mt-1 inline-block rounded-full bg-[var(--a-bg)] px-2 py-0.5 text-[11px] font-extrabold">{j.status === "acceptee" && j.arrived_at ? "Sur place" : JOB_STATUS[j.status ?? ""] ?? j.status}</span>
            </Link>); })}
        </div>
      </section>

      {next.length > 0 && (
        <section className="mt-5 space-y-2">
          <h2 className="px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">À venir</h2>
          {next.map((j) => (
            <Link key={j.id} href={missions} className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--a-card)] p-4">
              <span className="min-w-0"><span className="block truncate text-[16px] font-extrabold">{j.title}</span><span className="block truncate text-sm text-[var(--a-mute)]">{dayFr(j.date)} · {slot(j.window_start, j.window_end)}</span></span>
              <span className="num shrink-0 font-extrabold text-[var(--a-ok)]">{eur(j.amount)}</span>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}

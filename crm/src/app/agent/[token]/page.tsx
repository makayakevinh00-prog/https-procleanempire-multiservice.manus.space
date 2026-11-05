import type { Metadata } from "next";
import Image from "next/image";
import { CheckSquare, Square, MapPin, Phone, KeyRound, AlertTriangle, Clock } from "lucide-react";
import { agentClient, agentMessage, isToken, type AgentMission } from "@/lib/agent";
import { agentCheckAction, agentCheckInAction, agentFinishAction, agentIssueAction, agentStageAction } from "@/app/actions/agent";
import { GeoButton } from "@/components/crm/geo-button";
import { STAGE_LABEL, type Stage } from "@/lib/domain/missions";
import { PhotoButton } from "@/components/crm/photo-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes missions — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const NEXT: Record<string, [string, string]> = {
  planifiee: ["en_route", "Je pars"], affectee: ["en_route", "Je pars"], en_route: ["arrivee", "Je suis arrivé(e)"],
  arrivee: ["en_cours", "Je commence"], en_cours: ["terminee", "J'ai terminé"]
};
const hhmm = (t: string) => new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const day = (d: string, today: string) => d === today ? "Aujourd'hui" : new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function Invalid({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f172a] p-6 text-center text-white">
      <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="h-24 w-auto rounded-lg bg-white p-2" />
      <h1 className="text-xl font-bold">Accès impossible</h1>
      <p className="max-w-xs text-slate-300">{text}</p>
    </main>
  );
}

export default async function AgentPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Invalid text="Ce lien n'est pas valide. Demandez un nouveau lien à votre responsable." />;
  const { data, error } = await agentClient().rpc("agent_missions", { p_token: token });
  if (error) return <Invalid text={agentMessage(error.message)} />;
  const { agent, today, missions } = data as { agent: string; today: string; missions: AgentMission[] };
  const groups = [...new Set(missions.map((m) => m.date))].map((d) => ({ d, items: missions.filter((m) => m.date === d) }));

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#0f172a] px-4 py-3 text-white shadow">
        <Image src="/logo.png" alt="" width={187} height={344} className="h-10 w-auto rounded bg-white p-1" />
        <div className="leading-tight"><div className="text-xs text-slate-400">ProClean Empire</div><div className="text-base font-bold">Bonjour {agent.split(" ")[0]}</div></div>
      </header>
      <main className="mx-auto max-w-md space-y-5 px-3 pt-4">
        {searchParams.error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">{searchParams.error}</div>}
        {searchParams.ok && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{searchParams.ok}</div>}
        {!missions.length && <div className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">Aucune mission prévue ces prochains jours. 🙌</div>}

        {groups.map((g) => (
          <section key={g.d}>
            <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-slate-500">{day(g.d, today)}</h2>
            <div className="space-y-3">
              {g.items.map((m) => {
                const next = NEXT[m.stage];
                const done = m.checklist.filter((c) => c.done).length;
                const editable = ["planifiee", "affectee", "en_route", "arrivee", "en_cours"].includes(m.stage);
                const finished = ["terminee", "a_verifier", "validee", "facturable"].includes(m.stage);
                return (
                  <article id={`m-${m.id}`} key={m.id} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-lg font-bold leading-snug text-slate-900">{m.client}</div>
                        <div className="text-sm text-slate-600">{m.title}{m.site ? ` · ${m.site}` : ""}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">{STAGE_LABEL[m.stage as Stage] ?? m.stage}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{m.time ? m.time.slice(0, 5) : "heure libre"}{m.hours ? ` · ${m.hours} h` : ""}</span>
                    </div>
                    {m.address && <a className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-base font-medium text-blue-700" href={`https://maps.google.com/?q=${encodeURIComponent(m.address)}`} target="_blank" rel="noopener noreferrer"><MapPin className="mt-0.5 h-5 w-5 shrink-0" />{m.address}</a>}
                    {m.access && <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" /><span><b>Accès :</b> {m.access}</span></div>}
                    {m.notes && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><b>Consignes :</b> {m.notes}</p>}
                    {m.contact_phone && <a href={`tel:${m.contact_phone}`} className="flex items-center gap-2 text-base font-medium text-blue-700"><Phone className="h-5 w-5" />{m.contact_name ?? "Contact sur place"} · {m.contact_phone}</a>}

                    {m.checklist.length > 0 && (
                      <div>
                        <div className="mb-1 text-sm font-bold text-slate-700">Check-list ({done}/{m.checklist.length})</div>
                        <ul className="space-y-1">{m.checklist.map((c, i) => (
                          <li key={i}>
                            <form action={agentCheckAction.bind(null, token, m.id, i, !c.done)}>
                              <button disabled={!editable && !["terminee"].includes(m.stage)} className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 px-3 text-left text-base active:bg-slate-100 disabled:opacity-60">
                                {c.done ? <CheckSquare className="h-6 w-6 shrink-0 text-emerald-600" /> : <Square className="h-6 w-6 shrink-0 text-slate-400" />}
                                <span className={c.done ? "text-slate-500 line-through" : "text-slate-900"}>{c.label}</span>
                              </button>
                            </form>
                          </li>
                        ))}</ul>
                      </div>
                    )}

                    {editable && (
                      <div className="grid grid-cols-2 gap-2">
                        <PhotoButton token={token} mission={m.id} kind="avant" label="Photo avant" />
                        <PhotoButton token={token} mission={m.id} kind="apres" label="Photo après" />
                      </div>
                    )}
                    {m.photos > 0 && <div className="text-xs text-slate-500">{m.photos} photo(s) envoyée(s)</div>}

                    {m.arrived_at && <div className="rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-900">Arrivée à {hhmm(m.arrived_at)}{m.arrived_verified ? " ✓ position vérifiée" : " (position non vérifiée)"}{m.departed_at ? ` · départ à ${hhmm(m.departed_at)}` : ""}</div>}
                    {next && next[0] === "arrivee" && (
                      <GeoButton label={next[1]} action={agentCheckInAction.bind(null, token, m.id)} className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white active:opacity-90 disabled:opacity-60" />
                    )}
                    {next && next[0] === "terminee" && (
                      <GeoButton optional label={next[1]} action={agentFinishAction.bind(null, token, m.id)} className="h-14 w-full rounded-xl bg-emerald-600 text-lg font-bold text-white active:opacity-90 disabled:opacity-60" />
                    )}
                    {next && next[0] !== "arrivee" && next[0] !== "terminee" && (
                      <form action={agentStageAction.bind(null, token, m.id, next[0])}>
                        <button className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white active:opacity-90">{next[1]}</button>
                      </form>
                    )}
                    {finished && <div className="rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-800">{m.stage === "terminee" ? "Terminée — en attente de validation" : "Mission contrôlée ✓"}</div>}
                    {m.open_issues > 0 && <div className="flex items-center gap-2 text-sm font-medium text-orange-700"><AlertTriangle className="h-4 w-4" />{m.open_issues} problème(s) signalé(s)</div>}

                    {(editable || m.stage === "terminee") && (
                      <details className="rounded-xl border border-slate-200">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 text-base font-semibold text-orange-700"><AlertTriangle className="h-5 w-5" /> Signaler un problème</summary>
                        <form action={agentIssueAction.bind(null, token, m.id)} className="space-y-2 border-t border-slate-200 p-3">
                          <textarea name="description" required minLength={3} rows={3} placeholder="Que s'est-il passé ?" className="w-full rounded-lg border border-slate-300 p-3 text-base" />
                          <select name="severity" defaultValue="normale" className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base">
                            <option value="faible">Peu grave</option><option value="normale">À traiter</option><option value="haute">Urgent</option>
                          </select>
                          <button className="h-12 w-full rounded-xl bg-orange-600 text-base font-bold text-white">Envoyer à mon responsable</button>
                        </form>
                        <div className="border-t border-slate-200 p-3"><PhotoButton token={token} mission={m.id} kind="anomalie" label="Photo du problème" /></div>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
        <p className="px-2 text-center text-xs text-slate-400">Ce lien est personnel : ne le partagez pas. En cas de perte, votre responsable en génère un nouveau.</p>
      </main>
    </div>
  );
}

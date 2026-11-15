import type { Metadata } from "next";
import { MapPin, KeyRound, Clock, Route, ListChecks, CheckCircle2, User, LogOut, Truck, Shirt, Phone } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken } from "@/lib/agent";
import { courierRunAction } from "@/app/actions/nettoyeur";
import { dayFr, slot } from "@/lib/cleaner-ui";
import { FIELD_CSS } from "@/components/agent/theme";
import { Gate } from "@/components/agent/gate";
import { CourierLive, Remember } from "@/components/nettoyeur/live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Linge — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Run = { id: string; kind: "livraison" | "collecte"; status: "a_faire" | "en_route" | "fait"; date: string; mine: boolean; taken: boolean; title: string; address: string | null; postal_code: string | null; city: string | null; access_notes: string | null; window_start: string; window_end: string; job_status: string; stock: { clean: number; dirty: number; per_stay: number } | null };

/** Application du livreur de linge : ses tournées (livrer le linge propre avant le ménage, récupérer le linge sale après). Même mise en page que les autres applications ProClean. */
export default async function CourierPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string; v?: string } }) {
  const token = params.token;
  const shell = (children: React.ReactNode) => (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <div className="mx-auto max-w-md px-4 pb-28 pt-5">{children}</div>
    </div>
  );
  if (!isToken(token)) return shell(<Gate text="Ce lien n'est pas valide. Demandez un nouveau lien à l'entreprise." />);
  const { data, error } = await agentClient().rpc("courier_runs", { p_token: token });
  if (error) return shell(<Gate text={agentMessage(error.message)} />);
  const d = data as { name: string; today: string; runs: Run[] };
  const view = searchParams.v === "faites" || searchParams.v === "profil" ? searchParams.v : "tournees";
  const open = d.runs.filter((r) => r.status !== "fait" && !(r.taken && !r.mine)), finished = d.runs.filter((r) => r.status === "fait");
  const todo = open.filter((r) => r.date === d.today);
  const list = view === "faites" ? finished : open;
  const days = [...new Set(list.map((r) => r.date))];
  const moving = d.runs.some((r) => r.mine && r.status === "en_route");
  const current = d.runs.find((r) => r.mine && r.status === "en_route") ?? null;
  const next = current ?? open.find((r) => r.status === "a_faire") ?? null;
  const where = (r: Run) => `${r.address ?? ""} ${r.postal_code ?? ""} ${r.city ?? ""}`.trim();
  // Itinéraire du jour : toutes les adresses d'aujourd'hui, dans l'ordre des horaires, ouvertes dans l'application de cartes du téléphone.
  const stops = [...new Set(todo.filter((r) => r.address).sort((a, b) => a.window_start.localeCompare(b.window_start)).map(where))].slice(0, 9);
  const routeUrl = stops.length ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stops[stops.length - 1]!)}${stops.length > 1 ? `&waypoints=${encodeURIComponent(stops.slice(0, -1).join("|"))}` : ""}` : null;
  const tab = (v: string) => `/linge/${token}${v === "tournees" ? "" : `?v=${v}`}`;
  const tile = "rounded-2xl bg-[var(--a-card)] p-3 text-center";
  return shell(
    <>
      <Remember token={token} base="linge" />
      <header className="mb-4">
        <div className="flex items-center justify-between"><span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">ProClean</span><CourierLive token={token} active={moving} /></div>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">Bonjour, {d.name.split(" ")[0]}</h1>
        <p className="text-[15px] text-[var(--a-mute)]">{view === "profil" ? "Votre espace livreur de linge." : todo.length ? `${todo.length} tournée${todo.length > 1 ? "s" : ""} à faire aujourd'hui.` : "Rien à livrer aujourd'hui pour l'instant."}</p>
      </header>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      {view === "tournees" && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className={tile}><b className="block text-[26px] leading-none text-[var(--a-pri)]">{todo.filter((r) => r.kind === "livraison").length}</b><span className="text-[12px] font-bold text-[var(--a-mute)]">à livrer aujourd&apos;hui</span></div>
            <div className={tile}><b className="block text-[26px] leading-none text-[var(--a-pri)]">{todo.filter((r) => r.kind === "collecte").length}</b><span className="text-[12px] font-bold text-[var(--a-mute)]">à récupérer</span></div>
            <div className={tile}><b className="block text-[26px] leading-none text-[var(--a-ok)]">{finished.filter((r) => r.date === d.today).length}</b><span className="text-[12px] font-bold text-[var(--a-mute)]">faites aujourd&apos;hui</span></div>
          </div>
          {next && (
            <section className="mb-4 rounded-3xl bg-[var(--a-pri)] p-5 text-white">
              <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] opacity-80">{current ? <Truck className="h-4 w-4" /> : <Shirt className="h-4 w-4" />}{current ? "En cours" : "Prochaine tournée"}</div>
              <div className="mt-1 text-[22px] font-extrabold leading-snug">{next.kind === "livraison" ? "Livrer le linge propre" : "Récupérer le linge sale"}</div>
              <div className="text-[15px] opacity-90">{next.date === d.today ? "Aujourd'hui" : dayFr(next.date)} · {next.kind === "livraison" ? `avant ${next.window_start.slice(0, 5).replace(":", "h")}` : `après ${next.window_end.slice(0, 5).replace(":", "h")}`}</div>
              {next.address && <div className="mt-1 text-[15px] opacity-90">{next.address}, {next.postal_code} {next.city}</div>}
              {next.address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where(next))}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-[16px] font-extrabold text-[var(--a-pri)]"><Route className="h-5 w-5" />Y aller</a>}
            </section>
          )}
          {routeUrl && stops.length > 1 && <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="mb-4 flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--a-pri)] text-[15px] font-extrabold text-[var(--a-pri)]"><Route className="h-5 w-5" />Itinéraire du jour ({stops.length} adresses)</a>}
        </>
      )}

      {view !== "profil" && !list.length && <p className="rounded-3xl bg-[var(--a-card)] p-8 text-center text-[16px] text-[var(--a-mute)]">{view === "faites" ? "Aucune tournée terminée pour l'instant." : "Aucune tournée pour le moment. Elles apparaissent ici dès qu'un ménage est prévu."}</p>}
      {view !== "profil" && days.map((day) => (
        <section key={day} className="mb-5">
          <h2 className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">{day === d.today ? "Aujourd'hui" : dayFr(day)}</h2>
          <div className="space-y-3">
            {list.filter((r) => r.date === day).map((r) => (
              <article key={r.id} className="space-y-3 rounded-3xl bg-[var(--a-card)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="text-[18px] font-extrabold leading-snug">{r.kind === "livraison" ? "Livrer le linge propre" : "Récupérer le linge sale"}</div><div className="truncate text-[14px] text-[var(--a-mute)]">{r.title}</div></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${r.status === "fait" ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : r.status === "en_route" ? "bg-[var(--a-warnbg)] text-[var(--a-warn)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>{r.status === "fait" ? "Fait" : r.status === "en_route" ? (r.taken ? "Pris par un autre" : "En route") : "À faire"}</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] font-bold"><Clock className="h-4 w-4 text-[var(--a-pri)]" />{r.kind === "livraison" ? `À livrer avant ${r.window_start.slice(0, 5).replace(":", "h")}` : `Ménage ${slot(r.window_start, r.window_end)} : à récupérer après`}</div>
                {r.stock && <div className="text-[13px] text-[var(--a-mute)]">Dans le logement : {r.stock.clean} parure{r.stock.clean > 1 ? "s" : ""} propre{r.stock.clean > 1 ? "s" : ""}, {r.stock.dirty} sale{r.stock.dirty > 1 ? "s" : ""} · il en faut {r.stock.per_stay} par séjour</div>}
                {r.address && <a className="flex items-start gap-2 rounded-2xl bg-[var(--a-bg)] p-3 text-[15px] font-bold text-[var(--a-pri)]" href={`https://maps.google.com/?q=${encodeURIComponent(`${r.address} ${r.postal_code ?? ""} ${r.city ?? ""}`)}`} target="_blank" rel="noopener noreferrer"><MapPin className="mt-0.5 h-5 w-5 shrink-0" />{r.address}, {r.postal_code} {r.city}</a>}
                {r.access_notes && <div className="flex items-start gap-2 rounded-2xl bg-[var(--a-warnbg)] p-3 text-[14px] text-[var(--a-warn)]"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" /><span><b>Accès :</b> {r.access_notes}</span></div>}
                {r.status === "a_faire" && !r.taken && <form action={courierRunAction.bind(null, token, r.id, "en_route")}><button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white active:opacity-90">Je pars</button></form>}
                {r.status === "en_route" && r.mine && (
                  <div className="grid grid-cols-[1fr_2fr] items-end gap-2">
                    <form action={courierRunAction.bind(null, token, r.id, "a_faire")}><button className="h-14 w-full rounded-2xl border border-[var(--a-line)] text-[15px] font-extrabold text-[var(--a-mute)]">Je ne peux plus</button></form>
                    <form action={courierRunAction.bind(null, token, r.id, "fait")} className="space-y-2">
                      {r.stock && <label className="flex items-center justify-between gap-2 text-[13px] font-bold text-[var(--a-mute)]">{r.kind === "livraison" ? "Parures propres déposées" : "Parures sales emportées"}<input name="sets" type="number" min={0} max={50} defaultValue={r.kind === "livraison" ? r.stock.per_stay : r.stock.dirty} className="h-10 w-20 rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-2 text-center text-base text-[var(--a-ink)]" /></label>}
                      <button className="h-14 w-full rounded-2xl bg-[var(--a-ok)] text-lg font-extrabold text-[var(--a-bg)] active:opacity-90">{r.kind === "livraison" ? "Linge déposé sur place" : "Linge récupéré"}</button>
                    </form>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      {view === "profil" && (
        <>
          <section className="rounded-3xl bg-[var(--a-card)] p-5">
            <b className="block text-[20px]">{d.name}</b><span className="text-[14px] text-[var(--a-mute)]">Livreur de linge · ProClean Empire</span>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[var(--a-bg)] p-3 text-center"><b className="block text-[24px] text-[var(--a-pri)]">{finished.length}</b><span className="text-[12px] font-bold text-[var(--a-mute)]">tournées terminées</span></div>
              <div className="rounded-2xl bg-[var(--a-bg)] p-3 text-center"><b className="block text-[24px] text-[var(--a-pri)]">{open.length}</b><span className="text-[12px] font-bold text-[var(--a-mute)]">à venir</span></div>
            </div>
          </section>
          <section className="mt-4 space-y-3 rounded-3xl bg-[var(--a-card)] p-5 text-[15px]">
            <b className="block text-[13px] uppercase tracking-[0.14em] text-[var(--a-mute)]">Comment ça marche</b>
            <p><b>1. Avant le ménage</b> : vous déposez le linge propre dans le logement.</p>
            <p><b>2. « Je pars »</b> : le nettoyeur voit que vous arrivez et où vous êtes.</p>
            <p><b>3. Sur place</b> : indiquez le nombre de parures déposées ou emportées, puis validez.</p>
            <p><b>4. Après le ménage</b> : vous récupérez le linge sale.</p>
          </section>
          <a href="mailto:contact@procleanempire.com" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--a-line)] text-[15px] font-extrabold"><Phone className="h-5 w-5" />Contacter ProClean Empire</a>
          <form method="post" action="/connexion/sortir" className="mt-3"><input type="hidden" name="t" value={token} /><button className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--a-line)] text-[16px] font-extrabold text-[var(--a-bad)]"><LogOut className="h-5 w-5" />Se déconnecter</button></form>
          <a href="/connexion?choisir=1" className="mt-3 block text-center text-[14px] font-bold text-[var(--a-mute)]">Changer d&apos;espace</a>
        </>
      )}

      <nav aria-label="Navigation" className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1 rounded-full border border-[var(--a-line)] bg-[var(--a-dock)] p-2 shadow-[0_8px_30px_rgba(16,24,40,0.12)]">
          {([["tournees", "Tournées", ListChecks], ["faites", "Faites", CheckCircle2], ["profil", "Profil", User]] as const).map(([v, l, Icon]) => (
            <a key={v} href={tab(v)} aria-current={view === v ? "page" : undefined} className={`flex flex-col items-center gap-0.5 rounded-full py-2 text-[13px] font-bold ${view === v ? "bg-[var(--a-soft)] text-[var(--a-pri)]" : "text-[var(--a-mute)]"}`}><Icon className="h-6 w-6" strokeWidth={view === v ? 2.4 : 1.8} />{l}</a>
          ))}
        </div>
      </nav>
    </>
  );
}

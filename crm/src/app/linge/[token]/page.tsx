import type { Metadata } from "next";
import { MapPin, KeyRound, Clock } from "lucide-react";
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
export default async function CourierPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  const shell = (children: React.ReactNode) => (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <div className="mx-auto max-w-md px-4 pb-16 pt-5">{children}</div>
    </div>
  );
  if (!isToken(token)) return shell(<Gate text="Ce lien n'est pas valide. Demandez un nouveau lien à l'entreprise." />);
  const { data, error } = await agentClient().rpc("courier_runs", { p_token: token });
  if (error) return shell(<Gate text={agentMessage(error.message)} />);
  const d = data as { name: string; today: string; runs: Run[] };
  const days = [...new Set(d.runs.map((r) => r.date))];
  const moving = d.runs.some((r) => r.mine && r.status === "en_route");
  return shell(
    <>
      <Remember token={token} base="linge" />
      <header className="mb-4">
        <div className="flex items-center justify-between"><span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">ProClean</span><CourierLive token={token} active={moving} /></div>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">Bonjour, {d.name.split(" ")[0]}</h1>
        <p className="text-[15px] text-[var(--a-mute)]">Vos tournées de linge. Appuyez sur « Je pars » : le nettoyeur voit que vous arrivez.</p>
      </header>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      {!d.runs.length && <p className="rounded-3xl bg-[var(--a-card)] p-8 text-center text-[16px] text-[var(--a-mute)]">Aucune tournée pour le moment. Elles apparaissent ici dès qu&apos;un ménage est prévu.</p>}
      {days.map((day) => (
        <section key={day} className="mb-5">
          <h2 className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">{day === d.today ? "Aujourd'hui" : dayFr(day)}</h2>
          <div className="space-y-3">
            {d.runs.filter((r) => r.date === day).map((r) => (
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
      <a href="/connexion?choisir=1" className="mt-6 block text-center text-[14px] font-bold text-[var(--a-mute)]">Changer d&apos;espace ou me déconnecter</a>
    </>
  );
}

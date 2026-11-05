import type { Metadata } from "next";
import Image from "next/image";
import { CalendarCheck, CheckCircle2, FileText, Receipt, ClipboardCheck } from "lucide-react";
import { fetchStatus } from "@/lib/public-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suivi de votre demande — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const eur = (n: number) => Number(n).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const date = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const STEPS = [["recue", "Demande reçue"], ["devis_envoye", "Devis envoyé"], ["devis_accepte", "Devis accepté"], ["planifie", "Intervention planifiée"], ["facture", "Facture"]] as const;
const ORDER: Record<string, number> = { recue: 0, en_traitement: 0, devis_envoye: 1, devis_accepte: 2, planifie: 3, facture: 4 };

export default async function TrackingPage({ params, searchParams }: { params: { number: string }; searchParams: { t?: string } }) {
  const s = await fetchStatus(params.number, searchParams.t);
  const t = searchParams.t ?? "";
  const doc = (kind: string) => `/api/public/requests/${params.number}/documents/${kind}?t=${t}`;
  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-[#0f172a] px-4 py-4 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Image src="/logo.png" alt="" width={187} height={344} className="h-12 w-auto rounded bg-white p-1" />
          <div><div className="text-lg font-bold">ProClean Empire</div><div className="text-xs text-slate-300">Suivi de votre demande</div></div>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        {!s ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-bold text-slate-900">Demande introuvable</h1>
            <p className="mt-2 text-sm text-slate-600">Le lien est incomplet ou n&apos;est plus valable. Utilisez le lien reçu par e-mail, ou contactez-nous.</p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demande {s.request_number}</div>
              <h1 className="mt-1 text-xl font-bold text-slate-900">{s.status_label}</h1>
              <p className="mt-1 text-sm text-slate-500">Reçue le {date(s.received_at)}{s.service ? ` · ${s.service}` : ""}</p>
              {s.status in ORDER && (
                <ol className="mt-4 space-y-2">
                  {STEPS.map(([code, label], i) => {
                    const done = i <= ORDER[s.status];
                    return <li key={code} className={`flex items-center gap-2 text-sm ${done ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                      <CheckCircle2 className={`h-5 w-5 ${done ? "text-emerald-600" : "text-slate-300"}`} />{label}</li>;
                  })}
                </ol>
              )}
            </section>

            {s.quote && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 font-bold text-slate-900"><FileText className="h-5 w-5 text-blue-600" /> Devis {s.quote.number}</h2>
                <p className="mt-1 text-sm text-slate-600">Total TTC : <b>{eur(s.quote.total_ttc)}</b>{s.quote.valid_until ? ` · valable jusqu'au ${date(s.quote.valid_until)}` : ""}</p>
                <a href={doc("devis")} className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Télécharger le devis (PDF)</a>
              </section>
            )}

            {!!s.appointments?.length && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 font-bold text-slate-900"><CalendarCheck className="h-5 w-5 text-teal-600" /> Vos interventions</h2>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {s.appointments.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 py-2">
                      <span><b className="text-slate-900">{date(a.date)}</b>{a.time ? ` à ${a.time.slice(0, 5)}` : ""}<span className="block text-xs text-slate-500">{a.title}{a.hours ? ` · ${a.hours} h` : ""}</span></span>
                      <span className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.finished ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>{a.label}</span>
                        {a.finished && a.total > 0 && <span className="flex items-center gap-1 text-xs text-slate-500"><ClipboardCheck className="h-3.5 w-3.5" />{a.done}/{a.total} points contrôlés</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {s.invoice && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 font-bold text-slate-900"><Receipt className="h-5 w-5 text-orange-600" /> Facture {s.invoice.number}</h2>
                <p className="mt-1 text-sm text-slate-600">Total TTC : <b>{eur(s.invoice.total_ttc)}</b> · {s.invoice.paid ? "réglée, merci !" : s.invoice.due_date ? `à régler avant le ${date(s.invoice.due_date)}` : "à régler"}</p>
                <a href={doc("facture")} className="mt-3 inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Télécharger la facture (PDF)</a>
              </section>
            )}
          </>
        )}
        <p className="px-2 text-center text-xs text-slate-400">Lien personnel : ne le partagez pas. Une question ? Répondez simplement à nos e-mails.</p>
      </main>
    </div>
  );
}

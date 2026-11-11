import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { monthLabel, monthOf, parisToday } from "@/lib/domain/dates";
import { numberingGaps } from "@/lib/domain/accounting";
import { quarterOf } from "@/lib/compta/period";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatEUR } from "@/lib/utils";

export interface ComptaData {
  month: string;
  invoices: { id: string | null; number: string; issue_date: string; due_date: string | null; status: string; total_ht: number; total_vat: number; total_ttc: number; paid_at: string | null; client: string }[];
  vat: { rate: number; base: number; vat: number }[];
  payments: { received_at: string; amount: number; counterparty: string | null; label: string | null; match_status: string; nature?: string; invoice: string | null }[];
  supplier_payments: { id?: string; has_doc?: boolean; paid_on: string; amount: number; label: string | null; supplier: string }[];
  open_total: number; late_count: number; late_total: number; unmatched: number; numbers: string[];
}

const shift = (month: string, n: number) => { const [y, m] = month.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
const STATUS: Record<string, string> = { envoye: "Envoyée", paye: "Payée", en_retard: "En retard", annule: "Annulée" };
const MATCH: Record<string, string> = { rapproche: "Rapproché", non_rapproche: "À rapprocher", propose: "À valider", ignore: "Ignoré" };

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "err" }) {
  return (
    <Card className="p-4">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-[24px] font-semibold tracking-tight ${tone === "err" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground"}`}>{value}</div>
      {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

/** Vue comptable partagée : le patron (/comptabilite) et son comptable invité (/compta) voient exactement la même chose, lue par compta_data(). */
export function AccountingView({ data, basePath, owner }: { data: ComptaData; basePath: string; owner: boolean }) {
  const month = data.month, today = parisToday();
  const live = data.invoices.filter((i) => i.status !== "annule");
  const sum = (a: any[], k: string) => a.reduce((t, x) => t + Number(x[k] ?? 0), 0);
  const ht = sum(live, "total_ht"), vat = sum(live, "total_vat"), ttc = sum(live, "total_ttc");
  const cashIn = sum(data.payments, "amount"), cashOut = sum(data.supplier_payments, "amount");
  const gaps = numberingGaps(data.numbers);
  const nav = (m: string) => `${basePath}?mois=${m}`;
    const checks: { ok: boolean; text: string; href?: string }[] = [
    { ok: !data.unmatched, text: data.unmatched ? `${data.unmatched} virement(s) reçu(s) pas encore rapproché(s) d'une facture` : "Tous les virements reçus sont rapprochés", href: owner ? "/paiements" : undefined },
    { ok: !data.late_count, text: data.late_count ? `${data.late_count} facture(s) en retard de paiement (${formatEUR(Number(data.late_total))} TTC)` : "Aucune facture en retard", href: owner ? "/factures" : undefined },
    { ok: !gaps.length, text: gaps.length ? `Numérotation : numéro(s) manquant(s) ${gaps.slice(0, 5).join(", ")}${gaps.length > 5 ? "…" : ""}` : "Numérotation des factures continue, sans trou" }
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card shadow-sm">
          <Link href={nav(shift(month, -1))} className="p-2 hover:bg-muted" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Link>
          <span className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel(month)}</span>
          <Link href={nav(shift(month, 1))} className="p-2 hover:bg-muted" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Link>
        </div>
        {month !== monthOf(today) && <Link href={nav(monthOf(today))} className="text-sm text-primary hover:underline">Mois en cours</Link>}
        <details className="ml-auto rounded-lg border bg-card shadow-sm">
          <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 px-3 text-[13px] font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> Exports et documents</summary>
          <div className="space-y-3 border-t p-3 text-[13px]">
            {([[monthLabel(month), month], [`Trimestre ${quarterOf(month).slice(-2)}`, quarterOf(month)], [`Année ${month.slice(0, 4)}`, month.slice(0, 4)]] as const).map(([label, per]) => (
              <div key={per} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-32 font-medium capitalize">{label}</span>
                {([["ventes", "Ventes"], ["encaissements", "Encaissements"], ["fournisseurs", "Fournisseurs"]] as const).map(([t, l]) => <a key={t} href={`/api/compta/export?type=${t}&periode=${per}`} className="text-primary hover:underline">{l} (CSV)</a>)}
                <a href={`/api/compta/export?type=fec&periode=${per}`} className="text-primary hover:underline">FEC partiel</a>
                <a href={`/api/compta/factures-pdf?periode=${per}`} className="text-primary hover:underline">Factures (PDF)</a>
              </div>
            ))}
            <p className="max-w-md text-[12px] text-muted-foreground">Le FEC contient les ventes et les encaissements ; les achats et la TVA déductible restent à compléter par l&apos;expert-comptable.</p>
          </div>
        </details>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile label="Facturé HT" value={formatEUR(ht)} hint={`${live.length} facture(s) émise(s)`} />
        <Tile label="TVA collectée" value={formatEUR(vat)} hint="sur les factures du mois" />
        <Tile label="Facturé TTC" value={formatEUR(ttc)} />
        <Tile label="Encaissé" value={formatEUR(cashIn)} hint="virements reçus ce mois" />
        <Tile label="Payé aux fournisseurs" value={formatEUR(cashOut)} hint="paiements enregistrés" />
        <Tile label="Reste à encaisser" value={formatEUR(Number(data.open_total))} hint="toutes factures ouvertes (TTC)" tone={Number(data.late_total) ? "warn" : undefined} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Contrôles</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2.5 text-[14px]">
            {checks.map((c) => (
              <li key={c.text} className="flex items-start gap-2.5">
                {c.ok ? <CheckCircle2 className="mt-0.5 h-[17px] w-[17px] shrink-0 text-success" strokeWidth={1.8} /> : <AlertTriangle className="mt-0.5 h-[17px] w-[17px] shrink-0 text-warning" strokeWidth={1.8} />}
                <span>{c.text}{!c.ok && c.href && <> · <Link href={c.href} className="font-medium text-primary hover:underline">Traiter</Link></>}</span>
              </li>
            ))}
          </ul></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>TVA collectée par taux</CardTitle></CardHeader>
          <CardContent>
            {!data.vat.length ? <p className="text-[14px] text-muted-foreground">Aucune facture ce mois-ci.</p> : (
              <table className="w-full text-[14px]"><thead><tr className="text-left text-[12px] text-muted-foreground"><th className="pb-1 font-medium">Taux</th><th className="pb-1 text-right font-medium">Base HT</th><th className="pb-1 text-right font-medium">TVA</th></tr></thead>
                <tbody>{data.vat.map((r) => <tr key={r.rate}><td className="py-1">{Number(r.rate).toLocaleString("fr-FR")} %</td><td className="num py-1 text-right">{formatEUR(Number(r.base))}</td><td className="num py-1 text-right">{formatEUR(Number(r.vat))}</td></tr>)}</tbody></table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4 overflow-x-auto">
        <CardHeader><CardTitle>Journal des ventes</CardTitle></CardHeader>
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead><tr className="border-y border-border/70 text-[12px] uppercase tracking-wider text-muted-foreground">{["N°", "Date", "Client", "HT", "TVA", "TTC", "Statut"].map((h, i) => <th key={h} className={`px-5 py-2.5 font-medium ${i >= 3 && i <= 5 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            {!data.invoices.length ? <tr><td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">Aucune facture émise ce mois-ci.</td></tr> : data.invoices.map((i) => (
              <tr key={i.number} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                <td className="px-5 py-2.5">{owner && i.id ? <Link href={`/factures/${i.id}`} className="font-medium hover:underline">{i.number}</Link> : <span className="font-medium">{i.number}</span>}</td>
                <td className="num px-5 py-2.5">{formatDate(i.issue_date)}</td><td className="px-5 py-2.5">{i.client}</td>
                <td className="num px-5 py-2.5 text-right">{formatEUR(Number(i.total_ht))}</td><td className="num px-5 py-2.5 text-right">{formatEUR(Number(i.total_vat))}</td><td className="num px-5 py-2.5 text-right font-medium">{formatEUR(Number(i.total_ttc))}</td>
                <td className="px-5 py-2.5">{STATUS[i.status] ?? i.status}{i.paid_at ? ` · ${formatDate(i.paid_at.slice(0, 10))}` : ""} · <a href={`/api/compta/facture/${encodeURIComponent(i.number)}`} className="text-primary hover:underline">PDF</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Encaissements du mois</CardTitle>{owner && <Link href="/paiements" className="text-xs font-semibold text-primary hover:underline">Rapprochement</Link>}</CardHeader>
          <ul className="divide-y divide-border/50 text-[14px]">
            {!data.payments.length ? <li className="px-5 py-5 text-muted-foreground">Aucun virement reçu ce mois-ci.</li> : data.payments.map((p, k) => (
              <li key={k} className="flex items-center justify-between gap-3 px-5 py-2.5"><span className="min-w-0"><span className="block truncate font-medium">{p.counterparty ?? p.label ?? "—"}</span><span className="text-[12.5px] text-muted-foreground">{formatDate(p.received_at.slice(0, 10))} · {p.nature && p.nature !== "encaissement_client" ? ({ remboursement: "Remboursement", apport: "Apport du dirigeant", autre: "Hors facturation" } as Record<string, string>)[p.nature] : (MATCH[p.match_status] ?? p.match_status)}{p.invoice ? ` · ${p.invoice}` : ""}</span></span><b className="num">{formatEUR(Number(p.amount))}</b></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader><CardTitle>Paiements fournisseurs du mois</CardTitle>{owner && <Link href="/fournisseurs" className="text-xs font-semibold text-primary hover:underline">Fournisseurs</Link>}</CardHeader>
          <ul className="divide-y divide-border/50 text-[14px]">
            {!data.supplier_payments.length ? <li className="px-5 py-5 text-muted-foreground">Aucun paiement fournisseur enregistré ce mois-ci.</li> : data.supplier_payments.map((p, k) => (
              <li key={k} className="flex items-center justify-between gap-3 px-5 py-2.5"><span className="min-w-0"><span className="block truncate font-medium">{p.supplier}</span><span className="text-[12.5px] text-muted-foreground">{formatDate(p.paid_on)}{p.label ? ` · ${p.label}` : ""} · {p.has_doc && p.id ? <a href={`/api/compta/justificatif/${p.id}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Justificatif</a> : "sans justificatif"}</span></span><b className="num">{formatEUR(Number(p.amount))}</b></li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="mt-5 max-w-3xl text-xs text-muted-foreground">
        Limites : la TVA affichée est la TVA <b className="font-medium">collectée</b> d&apos;après les lignes de factures ; la TVA déductible n&apos;est pas suivie ici ; les justificatifs d&apos;achats sont ceux que le patron a joints aux paiements (sinon à demander, ou à retrouver dans Qonto). Les dépenses sont les paiements fournisseurs enregistrés dans le CRM. Ces chiffres préparent le travail de l&apos;expert-comptable, ils ne remplacent pas un logiciel comptable.
      </p>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileText, Paperclip, Table2 } from "lucide-react";
import { canViewAccounting } from "@/lib/auth";
import { monthOf, parisToday } from "@/lib/domain/dates";
import { quarterOf } from "@/lib/compta/period";
import { loadPeriod } from "@/lib/compta/load";
import { createClient } from "@/lib/supabase/server";
import { numberingGaps } from "@/lib/domain/accounting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatEUR } from "@/lib/utils";
import type { ComptaData } from "@/components/crm/accounting-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espace comptable" };

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const prevMonth = (m: string) => { const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
const sum = (a: any[], k: string) => a.reduce((t, x) => t + Number(x[k] ?? 0), 0);

/** Accueil du comptable : ce qui compte ce mois-ci, ce qui reste à contrôler, et les téléchargements les plus fréquents. */
export default async function ComptaHome() {
  if (!(await canViewAccounting())) redirect("/compta/activer");
  const month = monthOf(parisToday()), prev = prevMonth(month), q = quarterOf(month), year = month.slice(0, 4);
  const { data, error } = await createClient().rpc("compta_data", { p_month: month });
  if (error || !data) throw new Error("Comptabilité indisponible");
  const d = data as ComptaData;
  const last = await loadPeriod({ key: prev, label: prev, months: [prev] });
  const live = d.invoices.filter((i) => i.status !== "annule");
  const gaps = numberingGaps(d.numbers);
  const noDoc = d.supplier_payments.filter((p) => !p.has_doc).length;
  const checks = [
    { ok: !d.unmatched, text: d.unmatched ? `${d.unmatched} virement(s) reçu(s) pas encore rapproché(s) d'une facture` : "Tous les virements reçus sont rapprochés" },
    { ok: !d.late_count, text: d.late_count ? `${d.late_count} facture(s) en retard de paiement (${formatEUR(Number(d.late_total))} TTC)` : "Aucune facture en retard" },
    { ok: !gaps.length, text: gaps.length ? `Numérotation : numéro(s) manquant(s) ${gaps.slice(0, 4).join(", ")}` : "Numérotation des factures continue" },
    { ok: !noDoc, text: noDoc ? `${noDoc} dépense(s) du mois sans justificatif joint` : "Toutes les dépenses du mois ont leur justificatif" }
  ];
  const recent = [...(last?.invoices ?? []), ...d.invoices].filter((i: any) => i.status !== "annule").sort((a: any, b: any) => String(b.issue_date).localeCompare(String(a.issue_date))).slice(0, 6);
  const tile = "rounded-2xl border border-border bg-card p-4";
  const link = "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-medium hover:bg-muted";
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Bienvenue</h1>
      <p className="mb-5 max-w-3xl text-[15px] text-muted-foreground">Voici l&apos;essentiel de {MONTHS[Number(month.slice(5)) - 1]} {year}. Vous retrouvez les factures en PDF, les exports et les justificatifs dans les onglets ci-dessus. Accès en lecture seule.</p>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={tile}><div className="text-[12px] text-muted-foreground">Facturé ce mois (HT)</div><div className="num mt-1 text-[24px] font-semibold">{formatEUR(sum(live, "total_ht"))}</div><div className="text-[12px] text-muted-foreground">{live.length} facture(s) · TVA {formatEUR(sum(live, "total_vat"))}</div></div>
        <div className={tile}><div className="text-[12px] text-muted-foreground">Encaissé ce mois</div><div className="num mt-1 text-[24px] font-semibold">{formatEUR(sum(d.payments.filter((p: any) => !p.nature || p.nature === "encaissement_client"), "amount"))}</div><div className="text-[12px] text-muted-foreground">virements de clients</div></div>
        <div className={tile}><div className="text-[12px] text-muted-foreground">Payé aux fournisseurs</div><div className="num mt-1 text-[24px] font-semibold">{formatEUR(sum(d.supplier_payments, "amount"))}</div><div className="text-[12px] text-muted-foreground">{d.supplier_payments.length} paiement(s)</div></div>
        <div className={tile}><div className="text-[12px] text-muted-foreground">Reste à encaisser (TTC)</div><div className={`num mt-1 text-[24px] font-semibold ${Number(d.late_total) ? "text-warning" : ""}`}>{formatEUR(Number(d.open_total))}</div><div className="text-[12px] text-muted-foreground">{d.late_count ? `dont ${formatEUR(Number(d.late_total))} en retard` : "aucun retard"}</div></div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>À contrôler</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2.5 text-[14px]">{checks.map((c) => (
            <li key={c.text} className="flex items-start gap-2.5">{c.ok ? <CheckCircle2 className="mt-0.5 h-[17px] w-[17px] shrink-0 text-success" strokeWidth={1.8} /> : <AlertTriangle className="mt-0.5 h-[17px] w-[17px] shrink-0 text-warning" strokeWidth={1.8} />}<span>{c.text}</span></li>
          ))}</ul></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Téléchargements rapides</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <a href={`/api/compta/factures-pdf?periode=${prev}`} className={link}><Download className="h-4 w-4" /> Factures de {MONTHS[Number(prev.slice(5)) - 1]} (PDF)</a>
            <a href={`/api/compta/factures-pdf?periode=${q}`} className={link}><Download className="h-4 w-4" /> Factures du trimestre (PDF)</a>
            <a href={`/api/compta/export?type=ventes&periode=${year}`} className={link}><Table2 className="h-4 w-4" /> Journal des ventes {year} (CSV)</a>
            <a href={`/api/compta/export?type=fec&periode=${year}`} className={link}><Table2 className="h-4 w-4" /> FEC partiel {year}</a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Dernières factures</CardTitle><Link href="/compta/factures" className="text-xs font-semibold text-primary hover:underline">Toutes les factures</Link></CardHeader>
        {!recent.length ? <p className="px-5 py-6 text-sm text-muted-foreground">Aucune facture émise récemment.</p> : (
          <ul className="divide-y divide-border/50 text-[14px]">{recent.map((i: any) => (
            <li key={i.number} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="min-w-0"><span className="block truncate font-medium">{i.number} · {i.client}</span><span className="text-[12.5px] text-muted-foreground">{formatDate(i.issue_date)}</span></span>
              <span className="flex items-center gap-3"><b className="num">{formatEUR(Number(i.total_ttc))}</b><a href={`/api/compta/facture/${encodeURIComponent(i.number)}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"><FileText className="h-3.5 w-3.5" />PDF</a></span>
            </li>
          ))}</ul>
        )}
      </Card>
      {noDoc > 0 && <p className="mt-4 text-sm"><Link href="/compta/justificatifs" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"><Paperclip className="h-4 w-4" /> Voir les dépenses sans justificatif</Link></p>}
    </>
  );
}

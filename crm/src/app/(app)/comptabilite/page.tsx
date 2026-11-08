import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { monthBounds, monthLabel, monthOf, parisToday } from "@/lib/domain/dates";
import { vatByRate, numberingGaps, type AcctLine } from "@/lib/domain/accounting";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
const shift = (month: string, n: number) => { const [y, m] = month.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
const STATUS: Record<string, string> = { envoye: "Envoyée", paye: "Payée", en_retard: "En retard" };
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

/** Espace comptable : chiffres du mois, journal des ventes, TVA, contrôles, exports pour l'expert-comptable. Lecture seule. */
export default async function AccountingPage({ searchParams }: { searchParams: { mois?: string } }) {
  const today = parisToday();
  const month = /^\d{4}-\d{2}$/.test(searchParams.mois ?? "") ? searchParams.mois! : monthOf(today);
  const { start, end } = monthBounds(month);
  const sb = createClient();
  const [inv, pay, sup, open, unmatched, allNumbers] = await Promise.all([
    sb.from("invoices").select("id, number, issue_date, due_date, status, total_ht, total_vat, total_ttc, paid_at, clients(name)").not("number", "is", null).in("status", ["envoye", "paye", "en_retard"]).gte("issue_date", start).lte("issue_date", end).order("number"),
    sb.from("payments").select("id, received_at, amount, counterparty, label, match_status, matched:matched_invoice_id(number)").gte("received_at", `${start}T00:00:00Z`).lte("received_at", `${end}T23:59:59Z`).order("received_at", { ascending: false }),
    sb.from("supplier_payments").select("id, paid_on, amount, label, suppliers(name)").gte("paid_on", start).lte("paid_on", end).order("paid_on", { ascending: false }),
    sb.from("invoices").select("id, total_ttc, paid_amount, status").in("status", ["envoye", "en_retard"]),
    sb.from("payments").select("id", { count: "exact", head: true }).in("match_status", ["non_rapproche", "propose"]),
    sb.from("invoices").select("number").not("number", "is", null).neq("status", "brouillon")
  ]);
  for (const r of [inv, pay, sup, open, allNumbers]) if (r.error) throw new Error(r.error.message);
  const invoices = (inv.data ?? []) as any[];
  const ids = invoices.map((i) => i.id);
  const { data: lines } = ids.length ? await sb.from("invoice_lines").select("invoice_id, quantity, unit_price_ht, vat_rate").in("invoice_id", ids) : { data: [] as AcctLine[] };
  const sum = (a: any[], k: string) => a.reduce((t, x) => t + Number(x[k] ?? 0), 0);
  const ht = sum(invoices, "total_ht"), vat = sum(invoices, "total_vat"), ttc = sum(invoices, "total_ttc");
  const cashIn = sum(pay.data ?? [], "amount"), cashOut = sum(sup.data ?? [], "amount");
  const toCollect = ((open.data ?? []) as any[]).reduce((t, i) => t + Math.max(0, Number(i.total_ttc) - Number(i.paid_amount ?? 0)), 0);
  const late = ((open.data ?? []) as any[]).filter((i) => i.status === "en_retard");
  const lateTotal = late.reduce((t, i) => t + Math.max(0, Number(i.total_ttc) - Number(i.paid_amount ?? 0)), 0);
  const gaps = numberingGaps(((allNumbers.data ?? []) as any[]).map((x) => x.number));
  const rates = vatByRate((lines ?? []) as AcctLine[]);
  const nav = (m: string) => `/comptabilite?mois=${m}`;
  const exp = (t: string) => `/api/comptabilite/export?type=${t}&mois=${month}`;
  const checks: { ok: boolean; text: string; href?: string }[] = [
    { ok: !unmatched.count, text: unmatched.count ? `${unmatched.count} virement(s) reçu(s) pas encore rapproché(s) d'une facture` : "Tous les virements reçus sont rapprochés", href: "/paiements" },
    { ok: !late.length, text: late.length ? `${late.length} facture(s) en retard de paiement (${formatEUR(lateTotal)} TTC)` : "Aucune facture en retard", href: "/factures" },
    { ok: !gaps.length, text: gaps.length ? `Numérotation : numéro(s) manquant(s) ${gaps.slice(0, 5).join(", ")}${gaps.length > 5 ? "…" : ""}` : "Numérotation des factures continue, sans trou" }
  ];

  return (
    <>
      <PageHeader title="Comptabilité" subtitle="Les chiffres du mois et les exports pour votre expert-comptable. Lecture seule : rien n'est modifié ici." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card shadow-sm">
          <Link href={nav(shift(month, -1))} className="p-2 hover:bg-muted" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Link>
          <span className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel(month)}</span>
          <Link href={nav(shift(month, 1))} className="p-2 hover:bg-muted" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Link>
        </div>
        {month !== monthOf(today) && <Link href={nav(monthOf(today))} className="text-sm text-primary hover:underline">Mois en cours</Link>}
        <div className="ml-auto flex flex-wrap gap-2">
          {([["ventes", "Journal des ventes"], ["encaissements", "Encaissements"], ["fournisseurs", "Paiements fournisseurs"]] as const).map(([t, l]) => (
            <a key={t} href={exp(t)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> {l} (CSV)</a>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile label="Facturé HT" value={formatEUR(ht)} hint={`${invoices.length} facture(s) émise(s)`} />
        <Tile label="TVA collectée" value={formatEUR(vat)} hint="sur les factures du mois" />
        <Tile label="Facturé TTC" value={formatEUR(ttc)} />
        <Tile label="Encaissé" value={formatEUR(cashIn)} hint="virements reçus ce mois" />
        <Tile label="Payé aux fournisseurs" value={formatEUR(cashOut)} hint="paiements enregistrés" />
        <Tile label="Reste à encaisser" value={formatEUR(toCollect)} hint="toutes factures ouvertes (TTC)" tone={lateTotal ? "warn" : undefined} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Contrôles avant d&apos;envoyer au comptable</CardTitle></CardHeader>
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
            {!rates.length ? <p className="text-[14px] text-muted-foreground">Aucune facture ce mois-ci.</p> : (
              <table className="w-full text-[14px]"><thead><tr className="text-left text-[12px] text-muted-foreground"><th className="pb-1 font-medium">Taux</th><th className="pb-1 text-right font-medium">Base HT</th><th className="pb-1 text-right font-medium">TVA</th></tr></thead>
                <tbody>{rates.map((r) => <tr key={r.rate}><td className="py-1">{r.rate.toLocaleString("fr-FR")} %</td><td className="num py-1 text-right">{formatEUR(r.base)}</td><td className="num py-1 text-right">{formatEUR(r.vat)}</td></tr>)}</tbody></table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4 overflow-x-auto">
        <CardHeader><CardTitle>Journal des ventes</CardTitle></CardHeader>
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead><tr className="border-y border-border/70 text-[12px] uppercase tracking-wider text-muted-foreground">{["N°", "Date", "Client", "HT", "TVA", "TTC", "Statut"].map((h, i) => <th key={h} className={`px-5 py-2.5 font-medium ${i >= 3 && i <= 5 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            {!invoices.length ? <tr><td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">Aucune facture émise ce mois-ci.</td></tr> : invoices.map((i) => (
              <tr key={i.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                <td className="px-5 py-2.5"><Link href={`/factures/${i.id}`} className="font-medium hover:underline">{i.number}</Link></td>
                <td className="num px-5 py-2.5">{formatDate(i.issue_date)}</td><td className="px-5 py-2.5">{i.clients?.name ?? "—"}</td>
                <td className="num px-5 py-2.5 text-right">{formatEUR(Number(i.total_ht))}</td><td className="num px-5 py-2.5 text-right">{formatEUR(Number(i.total_vat))}</td><td className="num px-5 py-2.5 text-right font-medium">{formatEUR(Number(i.total_ttc))}</td>
                <td className="px-5 py-2.5">{STATUS[i.status] ?? i.status}{i.paid_at ? ` · ${formatDate(i.paid_at.slice(0, 10))}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Encaissements du mois</CardTitle><Link href="/paiements" className="text-xs font-semibold text-primary hover:underline">Rapprochement</Link></CardHeader>
          <ul className="divide-y divide-border/50 text-[14px]">
            {!(pay.data ?? []).length ? <li className="px-5 py-5 text-muted-foreground">Aucun virement reçu ce mois-ci.</li> : (pay.data as any[]).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5"><span className="min-w-0"><span className="block truncate font-medium">{p.counterparty ?? p.label ?? "—"}</span><span className="text-[12.5px] text-muted-foreground">{formatDate(p.received_at.slice(0, 10))} · {MATCH[p.match_status] ?? p.match_status}{p.matched?.number ? ` · ${p.matched.number}` : ""}</span></span><b className="num">{formatEUR(Number(p.amount))}</b></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader><CardTitle>Paiements fournisseurs du mois</CardTitle><Link href="/fournisseurs" className="text-xs font-semibold text-primary hover:underline">Fournisseurs</Link></CardHeader>
          <ul className="divide-y divide-border/50 text-[14px]">
            {!(sup.data ?? []).length ? <li className="px-5 py-5 text-muted-foreground">Aucun paiement fournisseur enregistré ce mois-ci.</li> : (sup.data as any[]).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5"><span className="min-w-0"><span className="block truncate font-medium">{p.suppliers?.name ?? "—"}</span><span className="text-[12.5px] text-muted-foreground">{formatDate(p.paid_on)}{p.label ? ` · ${p.label}` : ""}</span></span><b className="num">{formatEUR(Number(p.amount))}</b></li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="mt-5 max-w-3xl text-xs text-muted-foreground">
        Limites : la TVA affichée est la TVA <b className="font-medium">collectée</b> d&apos;après les lignes de factures ; la TVA déductible et les justificatifs d&apos;achats ne sont pas suivis ici. Les dépenses sont les paiements fournisseurs enregistrés dans le CRM. Ces chiffres préparent le travail de votre expert-comptable, ils ne remplacent pas votre logiciel comptable.
      </p>
    </>
  );
}

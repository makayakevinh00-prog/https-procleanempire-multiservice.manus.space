import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { canViewAccounting } from "@/lib/auth";
import { monthOf, parisToday } from "@/lib/domain/dates";
import { parsePeriod, quarterOf } from "@/lib/compta/period";
import { loadPeriod } from "@/lib/compta/load";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Factures — espace comptable" };
const STATUS: Record<string, string> = { envoye: "Envoyée", paye: "Payée", en_retard: "En retard", annule: "Annulée" };
const prevMonth = (m: string) => { const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

/** Toutes les factures émises d'une période, à télécharger une par une ou en un seul PDF. */
export default async function ComptaInvoices({ searchParams }: { searchParams: { periode?: string; q?: string } }) {
  if (!(await canViewAccounting())) redirect("/compta/activer");
  const now = monthOf(parisToday());
  const period = parsePeriod(searchParams.periode) ?? parsePeriod(now)!;
  const data = await loadPeriod(period);
  if (!data) throw new Error("Comptabilité indisponible");
  const needle = (searchParams.q ?? "").trim().toLowerCase();
  const rows = (data.invoices as any[]).filter((i) => !needle || `${i.number} ${i.client}`.toLowerCase().includes(needle));
  const live = rows.filter((i) => i.status !== "annule");
  const chips: [string, string][] = [[now, "Ce mois"], [prevMonth(now), "Mois dernier"], [quarterOf(now), "Ce trimestre"], [now.slice(0, 4), `Année ${now.slice(0, 4)}`], [String(Number(now.slice(0, 4)) - 1), `Année ${Number(now.slice(0, 4)) - 1}`]];
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Factures émises</h1>
      <p className="mb-4 text-[15px] text-muted-foreground">Période : <b className="font-medium text-foreground capitalize">{period.label}</b>. Chaque facture se télécharge en PDF, ou toutes ensemble.</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chips.map(([p, l]) => <Link key={p} href={`/compta/factures?periode=${p}`} className={`rounded-full border px-3 py-1 text-sm ${period.key === p ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted"}`}>{l}</Link>)}
        <form action="/compta/factures" className="ml-auto flex gap-2">
          <input type="hidden" name="periode" value={period.key} />
          <input name="q" defaultValue={searchParams.q ?? ""} placeholder="N° ou client…" aria-label="Rechercher" className="h-9 w-44 rounded-lg border bg-card px-3 text-sm" />
          <button className="h-9 rounded-lg border bg-card px-3 text-sm hover:bg-muted">Chercher</button>
        </form>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <a href={`/api/compta/factures-pdf?periode=${period.key}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background"><Download className="h-3.5 w-3.5" /> Tout télécharger en un PDF ({live.length})</a>
        <a href={`/api/compta/export?type=ventes&periode=${period.key}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> Journal (CSV)</a>
        <a href={`/api/compta/export?type=fec&periode=${period.key}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> FEC partiel</a>
      </div>
      <Card className="overflow-x-auto">
        <CardHeader><CardTitle>{rows.length} facture{rows.length > 1 ? "s" : ""} · {formatEUR(live.reduce((t, i) => t + Number(i.total_ttc), 0))} TTC</CardTitle></CardHeader>
        {!rows.length ? <p className="px-5 py-6 text-sm text-muted-foreground">Aucune facture sur cette période.</p> : (
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead><tr className="border-y border-border/70 text-[12px] uppercase tracking-wider text-muted-foreground"><th className="px-5 py-2.5 font-medium">N°</th><th className="px-5 py-2.5 font-medium">Date</th><th className="px-5 py-2.5 font-medium">Client</th><th className="px-5 py-2.5 text-right font-medium">TTC</th><th className="px-5 py-2.5 font-medium">Statut</th><th className="px-5 py-2.5" /></tr></thead>
            <tbody>{rows.map((i) => (
              <tr key={i.number} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                <td className="px-5 py-2.5 font-medium">{i.number}</td><td className="num px-5 py-2.5">{formatDate(i.issue_date)}</td><td className="px-5 py-2.5">{i.client}</td>
                <td className="num px-5 py-2.5 text-right font-medium">{formatEUR(Number(i.total_ttc))}</td><td className="px-5 py-2.5">{STATUS[i.status] ?? i.status}</td>
                <td className="px-5 py-2.5 text-right"><a href={`/api/compta/facture/${encodeURIComponent(i.number)}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><FileText className="h-3.5 w-3.5" /> PDF</a></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}

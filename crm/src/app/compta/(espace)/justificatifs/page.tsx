import Link from "next/link";
import { redirect } from "next/navigation";
import { Paperclip } from "lucide-react";
import { canViewAccounting } from "@/lib/auth";
import { monthOf, parisToday } from "@/lib/domain/dates";
import { parsePeriod, quarterOf } from "@/lib/compta/period";
import { loadPeriod } from "@/lib/compta/load";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Justificatifs — espace comptable" };

/** Dépenses (paiements fournisseurs) avec leur justificatif, ou signalées comme manquantes. */
export default async function ComptaProofs({ searchParams }: { searchParams: { periode?: string; manquants?: string } }) {
  if (!(await canViewAccounting())) redirect("/compta/activer");
  const now = monthOf(parisToday());
  const period = parsePeriod(searchParams.periode) ?? parsePeriod(quarterOf(now))!;
  const data = await loadPeriod(period);
  if (!data) throw new Error("Comptabilité indisponible");
  const all = data.supplier_payments as any[];
  const onlyMissing = searchParams.manquants === "1";
  const rows = all.filter((p) => !onlyMissing || !p.has_doc);
  const missing = all.filter((p) => !p.has_doc).length;
  const chips: [string, string][] = [[now, "Ce mois"], [quarterOf(now), "Ce trimestre"], [now.slice(0, 4), `Année ${now.slice(0, 4)}`]];
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Justificatifs de dépenses</h1>
      <p className="mb-4 max-w-3xl text-[15px] text-muted-foreground">Période : <b className="font-medium capitalize text-foreground">{period.label}</b>. Les justificatifs sont ceux joints par le dirigeant aux paiements fournisseurs ; pour les achats non enregistrés ici, voir Qonto.</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chips.map(([p, l]) => <Link key={p} href={`/compta/justificatifs?periode=${p}${onlyMissing ? "&manquants=1" : ""}`} className={`rounded-full border px-3 py-1 text-sm ${period.key === p ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted"}`}>{l}</Link>)}
        <Link href={`/compta/justificatifs?periode=${period.key}${onlyMissing ? "" : "&manquants=1"}`} className={`ml-auto rounded-full border px-3 py-1 text-sm ${onlyMissing ? "border-warning bg-warning/10" : "bg-card hover:bg-muted"}`}>{onlyMissing ? "Voir tout" : `Seulement les manquants (${missing})`}</Link>
        <a href={`/api/compta/export?type=fournisseurs&periode=${period.key}`} className="rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted">Export CSV</a>
      </div>
      <Card>
        <CardHeader><CardTitle>{rows.length} dépense{rows.length > 1 ? "s" : ""} · {formatEUR(rows.reduce((t, p) => t + Number(p.amount), 0))}</CardTitle></CardHeader>
        {!rows.length ? <p className="px-5 py-6 text-sm text-muted-foreground">{onlyMissing ? "Aucun justificatif manquant sur cette période." : "Aucune dépense enregistrée sur cette période."}</p> : (
          <ul className="divide-y divide-border/50 text-[14px]">{rows.map((p, k) => (
            <li key={p.id ?? k} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="min-w-0"><span className="block truncate font-medium">{p.supplier}</span><span className="text-[12.5px] text-muted-foreground">{formatDate(p.paid_on)}{p.label ? ` · ${p.label}` : ""}</span></span>
              <span className="flex items-center gap-3"><b className="num">{formatEUR(Number(p.amount))}</b>{p.has_doc && p.id ? <a href={`/api/compta/justificatif/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"><Paperclip className="h-3.5 w-3.5" />Justificatif</a> : <span className="text-[13px] text-warning">manquant</span>}</span>
            </li>
          ))}</ul>
        )}
      </Card>
    </>
  );
}

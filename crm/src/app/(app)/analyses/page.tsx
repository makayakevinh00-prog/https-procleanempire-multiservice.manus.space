import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
import {
  PERIODS,
  averageComplete,
  groupSmall,
  monthsBack,
  scenario,
  sumByMonth,
  toPeriod,
} from "@/lib/analyses";
import { ACTIVITY, MONTH_NAMES } from "@/lib/prix";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Seg } from "@/components/crm/home-kit";
import { RankBars } from "@/components/crm/charts";
import {
  GroupedBars,
  Legend,
  LineChart,
  PALETTE,
  PieChart,
  Waterfall,
  type WaterStep,
} from "@/components/crm/charts-more";
import { CATEGORY as SUPPLIER_CATEGORY } from "@/components/crm/supplier-fields";
import { formatEUR, round2 } from "@/lib/utils";

export const dynamic = "force-dynamic";
const SHORT = MONTH_NAMES.map((m) => (m.length > 4 ? `${m.slice(0, 4)}.` : m));
const pct = (v: unknown, fallback: number) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(Math.max(n, -90), 200) : fallback;
};

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: { p?: string; ca?: string; cout?: string };
}) {
  const sb = createClient();
  const cur = parisToday().slice(0, 7);
  const period = toPeriod(searchParams.p);
  const months = monthsBack(cur, period);
  const start = `${months[0]}-01`;
  const [inv, pay, sup, ct] = await Promise.all([
    sb
      .from("invoices")
      .select("client_id, total_ht, issue_date")
      .not("status", "in", "(brouillon,annule)")
      .gte("issue_date", start),
    sb
      .from("payments")
      .select("amount, received_at")
      .gt("amount", 0)
      .gte("received_at", start),
    sb
      .from("supplier_payments")
      .select("amount, paid_on, suppliers(category)")
      .gte("paid_on", start),
    sb.from("contracts").select("client_id, activity"),
  ]);
  for (const r of [inv, pay, sup, ct])
    if (r.error) throw new Error(r.error.message);
  const invoices = (inv.data ?? []) as any[],
    payments = (pay.data ?? []) as any[],
    spends = (sup.data ?? []) as any[];

  const billed = sumByMonth(
    invoices,
    (i) => i.issue_date,
    (i) => num(i.total_ht),
    months,
  );
  const cashed = sumByMonth(
    payments,
    (x) => x.received_at,
    (x) => num(x.amount),
    months,
  );
  const spent = sumByMonth(
    spends,
    (x) => x.paid_on,
    (x) => num(x.amount),
    months,
  );
  const labels = months.map((m) => SHORT[Number(m.slice(5)) - 1]);
  const total = (a: number[]) => round2(a.reduce((x, y) => x + y, 0));
  const last = period - 2,
    before = period - 3; // dernier mois complet et celui d'avant (le mois en cours est incomplet)

  const activityOf = new Map<string, string>();
  for (const k of (ct.data ?? []) as any[])
    if (k.activity && !activityOf.has(k.client_id))
      activityOf.set(k.client_id, k.activity);
  const byActivity = new Map<string, number>();
  for (const i of invoices) {
    const a =
      ACTIVITY[activityOf.get(i.client_id) ?? ""] ?? "Sans contrat récurrent";
    byActivity.set(a, round2((byActivity.get(a) ?? 0) + num(i.total_ht)));
  }
  const activityRows = [...byActivity]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const byCategory = new Map<string, number>();
  for (const x of spends) {
    const c = SUPPLIER_CATEGORY[x.suppliers?.category ?? "autre"] ?? "Autre";
    byCategory.set(c, round2((byCategory.get(c) ?? 0) + num(x.amount)));
  }
  const costParts = groupSmall(
    [...byCategory].map(([label, value]) => ({ label, value })),
  );
  const revenue = total(billed),
    costs = total(spent),
    result = round2(revenue - costs);
  const steps: WaterStep[] = [
    { label: "CA facturé", value: revenue, kind: "total" },
    ...costParts.map((c) => ({
      label: c.label,
      value: c.value,
      kind: "cost" as const,
    })),
    {
      label: result >= 0 ? "Bénéfice estimé" : "Perte estimée",
      value: result,
      kind: "result",
    },
  ];

  const caPct = pct(searchParams.ca, 10),
    costPct = pct(searchParams.cout, 5);
  const sc = scenario({ revenue, costs }, caPct, costPct);
  const label = (m: string) => MONTH_NAMES[Number(m.slice(5)) - 1];

  return (
    <>
      <PageHeader
        title="Analyses"
        subtitle="Vos chiffres en images : évolution, comparaisons, répartition et scénarios."
      />
      <Seg
        items={PERIODS.map((n) => ({
          href: `/analyses?p=${n}`,
          label: `${n} mois`,
          active: period === n,
        }))}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Évolution mois par mois</CardTitle>
            <span className="text-xs text-muted-foreground">
              le mois en cours est incomplet
            </span>
          </CardHeader>
          <CardContent className="pt-3">
            <Legend
              items={[
                { label: "Facturé (HT)", color: PALETTE[0] },
                {
                  label: "Encaissé (virements reçus)",
                  color: PALETTE[1],
                  dash: true,
                },
                {
                  label: "Dépenses (payées aux fournisseurs)",
                  color: PALETTE[3],
                },
              ]}
            />
            <LineChart
              labels={labels}
              label="Évolution du facturé, de l'encaissé et des dépenses"
              series={[
                { name: "Facturé", color: PALETTE[0], values: billed },
                {
                  name: "Encaissé",
                  color: PALETTE[1],
                  dash: true,
                  values: cashed,
                },
                { name: "Dépenses", color: PALETTE[3], values: spent },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparer les périodes</CardTitle>
            <span className="text-xs text-muted-foreground">mois complets</span>
          </CardHeader>
          <CardContent className="pt-3">
            <Legend
              items={[
                { label: label(months[before]), color: PALETTE[0] },
                { label: label(months[last]), color: PALETTE[1] },
                { label: "Moyenne", color: PALETTE[2] },
              ]}
            />
            <GroupedBars
              label="Comparaison du facturé, de l'encaissé et des dépenses entre deux mois et la moyenne"
              names={[label(months[before]), label(months[last]), "Moyenne"]}
              groups={[
                {
                  label: "Facturé",
                  values: [
                    billed[before],
                    billed[last],
                    averageComplete(billed),
                  ],
                },
                {
                  label: "Encaissé",
                  values: [
                    cashed[before],
                    cashed[last],
                    averageComplete(cashed),
                  ],
                },
                {
                  label: "Dépenses",
                  values: [spent[before], spent[last], averageComplete(spent)],
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>D&apos;où vient le chiffre d&apos;affaires</CardTitle>
            <span className="text-xs text-muted-foreground">
              {period} mois, HT
            </span>
          </CardHeader>
          <CardContent className="pt-3">
            {activityRows.length ? (
              <RankBars rows={activityRows} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune facture émise sur la période.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Classé par activité du contrat du client.{" "}
              <Link href="/#detail-mois" className="text-primary underline">
                Voir les clients mois par mois
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des dépenses</CardTitle>
            <span className="text-xs text-muted-foreground">{period} mois</span>
          </CardHeader>
          <CardContent className="pt-3">
            {costParts.length ? (
              <PieChart
                parts={costParts}
                center={formatEUR(costs)}
                sub="dépensés"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune dépense fournisseur enregistrée sur la période.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Du chiffre d&apos;affaires au bénéfice</CardTitle>
            <span className="text-xs text-muted-foreground">{period} mois</span>
          </CardHeader>
          <CardContent className="pt-3">
            <Waterfall
              steps={steps}
              label="Cascade du chiffre d'affaires facturé au bénéfice estimé"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Estimation : seules les dépenses enregistrées dans Fournisseurs
              sont déduites (ni charges, ni impôts).{" "}
              {revenue > 0 && (
                <>
                  Marge estimée :{" "}
                  <b className="font-medium text-foreground">
                    {Math.round((result / revenue) * 1000) / 10} %
                  </b>
                  .
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Et si… ? Comparer deux scénarios</CardTitle>
            <span className="text-xs text-muted-foreground">
              sur {period} mois
            </span>
          </CardHeader>
          <CardContent className="pt-3">
            <form
              action="/analyses"
              className="mb-4 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="p" value={period} />
              <label className="text-[13px] font-medium text-slate-700">
                Si le CA change de (%)
                <Input
                  name="ca"
                  inputMode="decimal"
                  defaultValue={caPct}
                  className="mt-1.5 h-10 w-28"
                />
              </label>
              <label className="text-[13px] font-medium text-slate-700">
                et les dépenses de (%)
                <Input
                  name="cout"
                  inputMode="decimal"
                  defaultValue={costPct}
                  className="mt-1.5 h-10 w-28"
                />
              </label>
              <Button size="sm">Comparer</Button>
            </form>
            <Legend
              items={[
                { label: "Actuel", color: PALETTE[0] },
                {
                  label: `Scénario : CA ${caPct >= 0 ? "+" : ""}${caPct} %, dépenses ${costPct >= 0 ? "+" : ""}${costPct} %`,
                  color: PALETTE[1],
                },
              ]}
            />
            <GroupedBars
              label="Comparaison du scénario avec la situation actuelle"
              names={["Actuel", "Scénario"]}
              groups={[
                { label: "CA", values: [revenue, sc.revenue] },
                { label: "Dépenses", values: [costs, sc.costs] },
                {
                  label: "Résultat",
                  values: [Math.max(result, 0), Math.max(sc.result, 0)],
                },
              ]}
            />
            <p className="mt-2 text-sm text-secondary-foreground">
              Résultat estimé :{" "}
              <b className="font-medium text-foreground">{formatEUR(result)}</b>{" "}
              aujourd&apos;hui,{" "}
              <b className="font-medium text-foreground">
                {formatEUR(sc.result)}
              </b>{" "}
              dans ce scénario
              {sc.marginPct != null ? ` (marge ${sc.marginPct} %)` : ""}.
            </p>
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Les parts de marché ne sont pas calculables avec vos seules données.
        Pour situer votre place face aux concurrents, voyez la{" "}
        <Link href="/veille" className="text-primary underline">
          Veille concurrentielle
        </Link>
        .
      </p>
    </>
  );
}

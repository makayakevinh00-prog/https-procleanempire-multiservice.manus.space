import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num, numOrNull } from "@/lib/data";
import {
  monthlyRevenueHt,
  summarize,
  weeklyHours,
  weeklyRevenueHt,
  type SiteRow,
} from "@/lib/domain/recruitment";
import { parisToday } from "@/lib/domain/dates";
import type { Contract } from "@/lib/domain/types";
import { saveThresholdsAction } from "@/app/actions/objectifs";
import {
  DEFAULT_TOP_SHARE,
  THRESHOLD_KEYS,
  THRESHOLD_LABEL,
  isMet,
  positiveMonths,
  progress,
  topShare,
  verdict,
  type Criterion,
  type Fmt,
  type Verdict,
} from "@/lib/croissance";
import { shiftMonth } from "@/lib/objectifs";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { round2 } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Tone = "green" | "blue" | "orange" | "gray";
const TONE: Record<Verdict, Tone> = {
  pret: "green",
  approche: "blue",
  pas_encore: "gray",
  a_definir: "orange",
};
const WORDS: Record<Verdict, string> = {
  pret: "Prêt",
  approche: "En approche",
  pas_encore: "Pas encore",
  a_definir: "À définir",
};
const fmt = (n: number | null, f: Fmt) =>
  n == null
    ? "—"
    : f === "eur"
      ? `${Math.round(n).toLocaleString("fr-FR")} €`
      : f === "pct"
        ? `${n} %`
        : f === "h"
          ? `${n} h`
          : String(Math.round(n));

export default async function GrowthPage() {
  const sb = createClient();
  const today = parisToday();
  const month = today.slice(0, 7);
  const since6 = `${shiftMonth(month, -6)}-01`,
    since12 = `${shiftMonth(month, -12)}-01`;
  const [settings, contracts, invoices, pay, sup, thr, open] =
    await Promise.all([
      getSettings(sb),
      sb.from("contracts").select("*").eq("status", "actif"),
      sb
        .from("invoices")
        .select("client_id, issue_date, total_ht, status")
        .neq("status", "annule")
        .neq("status", "brouillon")
        .gte("issue_date", since12),
      sb
        .from("payments")
        .select("amount, received_at")
        .gt("amount", 0)
        .gte("received_at", since6),
      sb
        .from("supplier_payments")
        .select("amount, paid_on")
        .gte("paid_on", since12),
      sb.from("growth_thresholds").select("key, value"),
      sb
        .from("interventions")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_date", today)
        .lte(
          "scheduled_date",
          new Date(Date.parse(today) + 30 * 864e5).toISOString().slice(0, 10),
        )
        .is("staff_id", null)
        .is("assignee", null)
        .neq("stage", "annulee"),
    ]);
  if (thr.error)
    throw new Error("Page indisponible : la base n'est pas encore à jour.");
  for (const r of [contracts, invoices, pay, sup])
    if (r.error) throw new Error(r.error.message);

  const rows: SiteRow[] = ((contracts.data ?? []) as any[]).map((k) => {
    const c = {
      ...k,
      monthly_amount_ht: numOrNull(k.monthly_amount_ht),
      per_visit_amount_ht: numOrNull(k.per_visit_amount_ht),
      hours_per_visit: numOrNull(k.hours_per_visit),
      visits_per_week: numOrNull(k.visits_per_week),
    } as Contract;
    return {
      contract: c,
      clientName: "",
      weeklyHours: weeklyHours(c),
      weeklyRevenue: weeklyRevenueHt(c),
    };
  });
  const rec = summarize(rows, settings);
  const mrr = round2(
    rows.reduce((a, r) => a + (monthlyRevenueHt(r.contract) ?? 0), 0),
  );
  const inv = (invoices.data ?? []) as any[];
  const byClient = new Map<string, number>();
  for (const i of inv)
    byClient.set(
      i.client_id,
      round2((byClient.get(i.client_id) ?? 0) + num(i.total_ht)),
    );
  const share = topShare([...byClient.values()]);
  const ca12 = round2(inv.reduce((a, i) => a + num(i.total_ht), 0));
  const t = new Map(
    ((thr.data ?? []) as any[]).map((r) => [r.key as string, num(r.value)]),
  );
  const topLimit = t.get("diversify_top_share") ?? DEFAULT_TOP_SHARE;
  const supplier = (m: string) =>
    round2(
      ((sup.data ?? []) as any[])
        .filter((x) => String(x.paid_on).startsWith(m))
        .reduce((a, x) => a + num(x.amount), 0),
    );
  const billed = (m: string) =>
    round2(
      inv
        .filter((i) => String(i.issue_date).startsWith(m))
        .reduce((a, i) => a + num(i.total_ht), 0),
    );
  const last3 = [3, 2, 1].map((d) => shiftMonth(month, -d));
  const positive = positiveMonths(
    last3.map((m) => ({ billed: billed(m), supplier: supplier(m) })),
  );
  const surplus = round2(
    ((pay.data ?? []) as any[]).reduce((a, x) => a + num(x.amount), 0) -
      ((sup.data ?? []) as any[])
        .filter((x) => String(x.paid_on) >= since6)
        .reduce((a, x) => a + num(x.amount), 0),
  );
  const orange = Number(settings.recruit_orange_max_hours);

  const cards: {
    title: string;
    question: string;
    words?: Partial<Record<Verdict, string>>;
    criteria: Criterion[];
    foot?: string;
  }[] = [
    {
      title: "Recruter",
      question: "Quand embaucher ou prendre un sous-traitant en plus ?",
      words: {
        pret: "À recruter",
        approche: "À préparer",
        pas_encore: "Pas besoin",
      },
      criteria: [
        {
          label: "Heures par semaine à couvrir (seuil orange de vos réglages)",
          value: rec.totalHours,
          threshold: orange,
          op: ">=",
          fmt: "h",
        },
        {
          label: "Missions des 30 prochains jours sans intervenant",
          value: open.count ?? 0,
          threshold: 1,
          op: ">=",
          fmt: "n",
        },
      ],
      foot: "Le détail est dans Recrutement.",
    },
    {
      title: "Ouvrir une autre agence",
      question: "Quand l'activité peut-elle porter un second site ?",
      criteria: [
        {
          label: "CA récurrent mensuel",
          value: mrr,
          threshold: t.get("agency_mrr") ?? null,
          op: ">=",
          fmt: "eur",
          key: "agency_mrr",
        },
        {
          label:
            "Mois consécutifs où le CA dépasse les paiements fournisseurs (3 derniers mois)",
          value: positive,
          threshold: 3,
          op: ">=",
          fmt: "n",
        },
      ],
    },
    {
      title: "Racheter une entreprise",
      question: "Quand avoir assez de marge de manœuvre pour acheter ?",
      criteria: [
        {
          label: "Excédent sur 6 mois (encaissé moins payé aux fournisseurs)",
          value: surplus,
          threshold: t.get("buyout_surplus") ?? null,
          op: ">=",
          fmt: "eur",
          key: "buyout_surplus",
        },
        {
          label: "Part du plus gros client dans le CA",
          value: share,
          threshold: topLimit,
          op: "<=",
          fmt: "pct",
        },
      ],
      foot: "Estimation : seules les dépenses enregistrées dans Fournisseurs sont comptées.",
    },
    {
      title: "S'ouvrir à l'international",
      question: "Quand l'assise est-elle assez solide pour viser l'étranger ?",
      criteria: [
        {
          label: "CA facturé sur 12 mois",
          value: ca12,
          threshold: t.get("intl_revenue_12m") ?? null,
          op: ">=",
          fmt: "eur",
          key: "intl_revenue_12m",
        },
        {
          label: "Part du plus gros client dans le CA",
          value: share,
          threshold: topLimit,
          op: "<=",
          fmt: "pct",
        },
      ],
    },
    {
      title: "Développer plus de services",
      question: "Quand diversifier l'offre ?",
      words: {
        pret: "À faire",
        approche: "À surveiller",
        pas_encore: "Pas urgent",
      },
      criteria: [
        {
          label: "Part du plus gros client dans le CA",
          value: share,
          threshold: topLimit,
          op: ">=",
          fmt: "pct",
        },
      ],
      foot: "Si un seul client pèse trop, perdre ce client fragiliserait toute l'activité.",
    },
  ];

  return (
    <>
      <PageHeader
        title="Croissance"
        subtitle="Les caps à franchir et où vous en êtes, d'après vos vrais chiffres."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((c) => {
          const v = verdict(c.criteria);
          return (
            <Card key={c.title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-semibold text-foreground">
                      {c.title}
                    </h2>
                    <p className="text-[13px] text-muted-foreground">
                      {c.question}
                    </p>
                  </div>
                  <Badge tone={TONE[v]}>{c.words?.[v] ?? WORDS[v]}</Badge>
                </div>
                <ul className="mt-4 space-y-4">
                  {c.criteria.map((k) => {
                    const pr = progress(k),
                      met = isMet(k);
                    return (
                      <li key={k.label}>
                        <div className="flex items-baseline justify-between gap-3 text-[13px]">
                          <span className="text-secondary-foreground">
                            {k.label}
                          </span>
                          <span className="num shrink-0 font-medium text-foreground">
                            {fmt(k.value, k.fmt)}{" "}
                            <span className="font-normal text-muted-foreground">
                              {k.op === ">=" ? "sur" : "max"}{" "}
                              {k.threshold == null
                                ? "à fixer"
                                : fmt(k.threshold, k.fmt)}
                            </span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${(pr ?? 0) * 100}%`,
                              background: met ? "#2f7a55" : "#2b4c7e",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {c.foot && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {c.foot}
                    {c.title === "Recruter" && (
                      <>
                        {" "}
                        <Link
                          href="/recrutement"
                          className="text-primary underline"
                        >
                          Ouvrir
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <details
        className="mt-6 rounded-xl border bg-card"
        open={
          !THRESHOLD_KEYS.some((k) => k !== "diversify_top_share" && t.has(k))
        }
      >
        <summary className="cursor-pointer list-none px-5 py-3.5 text-[14px] font-semibold text-primary">
          Fixer mes paliers
        </summary>
        <form
          action={saveThresholdsAction}
          className="grid gap-4 border-t px-5 py-4 sm:grid-cols-2"
        >
          {THRESHOLD_KEYS.map((k) => (
            <label key={k} className="text-[13px] font-medium text-slate-700">
              {THRESHOLD_LABEL[k].label}
              <Input
                name={k}
                inputMode="decimal"
                defaultValue={
                  t.get(k) ??
                  (k === "diversify_top_share" ? DEFAULT_TOP_SHARE : "")
                }
                placeholder="À fixer"
                className="mt-1.5 h-10"
              />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                {THRESHOLD_LABEL[k].unit} · {THRESHOLD_LABEL[k].hint}
              </span>
            </label>
          ))}
          <div className="sm:col-span-2">
            <Button size="sm">Enregistrer</Button>
          </div>
        </form>
      </details>
      <p className="mt-4 text-xs text-muted-foreground">
        Ces repères aident à décider, ils ne remplacent pas l&apos;avis de votre
        comptable. Les paliers en euros sont les vôtres : aucun n&apos;est
        imposé.
      </p>
    </>
  );
}

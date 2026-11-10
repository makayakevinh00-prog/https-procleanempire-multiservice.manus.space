import Link from "next/link";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { num, numOrNull } from "@/lib/data";
import { monthlyRevenueHt } from "@/lib/domain/recruitment";
import type { Contract } from "@/lib/domain/types";
import { askPlanAction, saveGoalsAction } from "@/app/actions/objectifs";
import {
  GOALS,
  GOAL_ORDER,
  STATUS_LABEL,
  buildLevers,
  forecastStatus,
  pace,
  paceStatus,
  shiftMonth,
  type GoalKind,
  type Status,
} from "@/lib/objectifs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { formatDate, round2 } from "@/lib/utils";

const TONE: Record<Status, "green" | "blue" | "orange" | "red"> = {
  atteint: "green",
  rythme: "blue",
  surveiller: "orange",
  retard: "red",
};
const FILL: Record<Status, string> = {
  atteint: "#2f7a55",
  rythme: "#2b4c7e",
  surveiller: "#c98a2b",
  retard: "#b3382c",
};
const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const show = (k: GoalKind, n: number) =>
  GOALS[k].money ? eur0(n) : String(Math.round(n));
const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export async function Objectives({ today }: { today: string }) {
  const sb = createClient();
  const p = pace(today);
  const month = p.month,
    prev = shiftMonth(month, -1);
  const [goals, inv, pay, cl, qt, ct, req, plan, unmatched, prospects, activeCl] =
    await Promise.all([
      sb
        .from("monthly_goals")
        .select("month, kind, target")
        .in("month", [month, prev]),
      sb
        .from("invoices")
        .select(
          "client_id, status, issue_date, billing_month, total_ht, total_ttc, paid_amount",
        )
        .neq("status", "annule"),
      sb
        .from("payments")
        .select("amount, received_at")
        .gt("amount", 0)
        .gte("received_at", `${prev}-01`),
      sb.from("clients").select("created_at").gte("created_at", `${prev}-01`),
      sb
        .from("quotes")
        .select(
          "status, total_ht, sent_at, invoice_id, invoices:invoice_id(status)",
        )
        .neq("status", "brouillon"),
      sb.from("contracts").select("*").eq("status", "actif"),
      sb
        .from("quote_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "nouvelle"),
      sb
        .from("goal_plans")
        .select("body, author, updated_at")
        .eq("month", month)
        .maybeSingle(),
      sb
        .from("payments")
        .select("id", { count: "exact", head: true })
        .in("match_status", ["non_rapproche", "propose"]),
      sb
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("status", "prospect"),
      sb
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("status", "actif"),
    ]);
  if (goals.error) return null; // base pas encore migrée : l'accueil reste intact
  for (const r of [inv, pay, cl, qt, ct])
    if (r.error) throw new Error(r.error.message);

  const invoices = (inv.data ?? []) as any[];
  const quotes = (qt.data ?? []) as any[];
  const sum = (rows: any[], f: (r: any) => number) =>
    round2(rows.reduce((a, r) => a + f(r), 0));
  const billed = (m: string) =>
    sum(
      invoices.filter(
        (i) =>
          i.status !== "brouillon" && String(i.issue_date ?? "").startsWith(m),
      ),
      (i) => num(i.total_ht),
    );
  const cashed = (m: string) =>
    sum(
      ((pay.data ?? []) as any[]).filter((x) =>
        String(x.received_at).startsWith(m),
      ),
      (x) => num(x.amount),
    );
  const newClients = (m: string) =>
    ((cl.data ?? []) as any[]).filter((x) => String(x.created_at).startsWith(m))
      .length;
  const sentQuotes = (m: string) =>
    quotes.filter((q) => String(q.sent_at ?? "").startsWith(m)).length;
  const actual = (m: string): Record<GoalKind, number> => ({
    ca_facture: billed(m),
    encaisse: cashed(m),
    nouveaux_clients: newClients(m),
    devis_envoyes: sentQuotes(m),
  });
  const now = actual(month),
    before = actual(prev);

  const drafts = invoices.filter((i) => i.status === "brouillon");
  const accepted = quotes.filter(
    (q) =>
      q.status === "accepte" &&
      (!q.invoice_id || q.invoices?.status === "annule"),
  );
  const pending = quotes.filter((q) => q.status === "envoye");
  const late = invoices.filter((i) => i.status === "en_retard");
  const invoicedThisMonth = new Set(
    invoices
      .filter(
        (i) =>
          String(i.issue_date ?? "").startsWith(month) ||
          String(i.billing_month ?? "").startsWith(month),
      )
      .map((i) => i.client_id),
  );
  const unbilled = ((ct.data ?? []) as any[])
    .filter((k) => !invoicedThisMonth.has(k.client_id))
    .map((k) =>
      monthlyRevenueHt({
        ...k,
        monthly_amount_ht: numOrNull(k.monthly_amount_ht),
        per_visit_amount_ht: numOrNull(k.per_visit_amount_ht),
        visits_per_week: numOrNull(k.visits_per_week),
      } as Contract),
    )
    .filter((v): v is number => v != null);
  const draftsAmt = sum(drafts, (i) => num(i.total_ht)),
    acceptedAmt = sum(accepted, (q) => num(q.total_ht)),
    unbilledAmt = round2(unbilled.reduce((a, b) => a + b, 0));
  const forecast = round2(
    now.ca_facture + draftsAmt + acceptedAmt + unbilledAmt,
  );

  // Objectifs suggérés d'après les vrais chiffres, tant que rien n'est fixé : la carte n'est jamais vide.
  const mrrAll = round2(
    ((ct.data ?? []) as any[])
      .map((k) =>
        monthlyRevenueHt({
          ...k,
          monthly_amount_ht: numOrNull(k.monthly_amount_ht),
          per_visit_amount_ht: numOrNull(k.per_visit_amount_ht),
          visits_per_week: numOrNull(k.visits_per_week),
        } as Contract),
      )
      .filter((v): v is number => v != null)
      .reduce((a, b) => a + b, 0),
  );
  const base = Math.max(before.ca_facture, mrrAll);
  const sugCa = base > 0 ? Math.ceil((base * 1.05) / 100) * 100 : null;
  const sugNew = Math.max(1, Math.ceil((activeCl.count ?? 0) * 0.1));
  const suggested: Record<GoalKind, number | null> = {
    ca_facture: sugCa,
    encaisse: sugCa ? Math.ceil((sugCa * 1.2) / 100) * 100 : null,
    nouveaux_clients: sugNew,
    devis_envoyes: sugNew * 2,
  };
  const why: Record<GoalKind, string> = {
    ca_facture: `${eur0(base)} ${before.ca_facture >= mrrAll ? "facturés le mois dernier" : "de contrats récurrents"}, plus 5 %`,
    encaisse: "le CA suggéré avec 20 % de TVA",
    nouveaux_clients: `10 % de vos ${activeCl.count ?? 0} clients actifs`,
    devis_envoyes: "en comptant 1 devis accepté sur 2",
  };
  const rows = (goals.data ?? []) as {
    month: string;
    kind: GoalKind;
    target: number;
  }[];
  const target = (m: string, k: GoalKind) => {
    const g = rows.find((r) => r.month === m && r.kind === k);
    return g ? num(g.target) : null;
  };
  const saved = GOAL_ORDER.filter((k) => target(month, k) != null);
  const isSuggested = saved.length === 0;
  const tgt = (k: GoalKind) => (isSuggested ? suggested[k] : target(month, k));
  const active = GOAL_ORDER.filter((k) => tgt(k) != null);
  const levers = buildLevers({
    drafts: { n: drafts.length, amount: draftsAmt },
    acceptedToInvoice: { n: accepted.length, amount: acceptedAmt },
    unbilledContracts: { n: unbilled.length, amount: unbilledAmt },
    sentQuotes: {
      n: pending.length,
      amount: sum(pending, (q) => num(q.total_ht)),
    },
    late: {
      n: late.length,
      amount: sum(late, (i) => num(i.total_ttc) - num(i.paid_amount)),
    },
    unmatched: unmatched.count ?? 0,
    prospects: prospects.count ?? 0,
    requests: req.count ?? 0,
  });
  const caTarget = tgt("ca_facture");
  const missing = caTarget != null ? Math.max(caTarget - now.ca_facture, 0) : 0;
  const pipe = round2(draftsAmt + acceptedAmt + unbilledAmt);
  const monthLabel = MONTH_NAMES[Number(month.slice(5)) - 1];
  const form = (
    <details className="group">
      <summary className="cursor-pointer list-none text-[13px] font-medium text-primary hover:underline">
        {isSuggested ? "Ajuster les objectifs avant de les adopter" : "Modifier les objectifs"}
      </summary>
      <form
        action={saveGoalsAction.bind(null, month)}
        className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {GOAL_ORDER.map((k) => (
          <label key={k} className="text-[13px] font-medium text-slate-700">
            {GOALS[k].label}
            <Input
              name={`goal_${k}`}
              inputMode="decimal"
              defaultValue={target(month, k) ?? target(prev, k) ?? suggested[k] ?? ""}
              placeholder="Non suivi"
              className="mt-1.5 h-10"
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              {GOALS[k].hint}
            </span>
          </label>
        ))}
        <div className="sm:col-span-2 lg:col-span-4">
          <Button size="sm">Enregistrer</Button>{" "}
          <span className="ml-2 text-xs text-muted-foreground">
            Un champ vide = indicateur non suivi. Préremplis avec les objectifs
            suggérés ou ceux du mois dernier.
          </span>
        </div>
      </form>
    </details>
  );

  return (
    <Card className="mt-9 overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-6 py-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Target className="h-4 w-4 text-primary" strokeWidth={1.75} />{" "}
          Objectifs de {monthLabel}
        </h2>
        <span className="text-xs text-muted-foreground">
          jour {p.day} sur {p.days}
        </span>
      </div>
      <div className="px-6 py-5">
        {isSuggested && active.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-secondary/60 px-4 py-3 text-[13px] text-secondary-foreground">
            <span>
              <b className="font-medium text-foreground">Objectifs suggérés</b>{" "}
              d&apos;après vos chiffres. Adoptez-les pour suivre le mois, ou ajustez-les.
            </span>
            <form action={saveGoalsAction.bind(null, month)} className="ml-auto">
              {active.map((k) => (
                <input key={k} type="hidden" name={`goal_${k}`} value={suggested[k]!} />
              ))}
              <Button size="sm">Adopter ces objectifs</Button>
            </form>
          </div>
        )}
        {active.length > 0 && (
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {active.map((k) => {
              const t = tgt(k)!,
                v = now[k];
              const st: Status =
                k === "ca_facture"
                  ? forecastStatus(v, forecast, t)
                  : paceStatus(v, t, p.elapsed);
              const pct = Math.min((v / t) * 100, 100),
                fpct =
                  k === "ca_facture" ? Math.min((forecast / t) * 100, 100) : 0;
              return (
                <div key={k}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-muted-foreground">
                      {GOALS[k].label}
                    </span>
                    <Badge tone={TONE[st]}>{STATUS_LABEL[st]}</Badge>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="num text-[26px] font-semibold leading-none tracking-tight text-foreground">
                      {show(k, v)}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      sur {show(k, t)}
                    </span>
                  </div>
                  <div
                    className="relative mt-3 h-2 rounded-full bg-secondary"
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={GOALS[k].label}
                  >
                    {fpct > pct && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full opacity-30"
                        style={{ width: `${fpct}%`, background: FILL[st] }}
                      />
                    )}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${pct}%`, background: FILL[st] }}
                    />
                    {k !== "ca_facture" && (
                      <div
                        className="absolute -inset-y-1 w-0.5 rounded bg-foreground/60"
                        style={{ left: `${p.elapsed * 100}%` }}
                        title="Où vous devriez en être aujourd'hui"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {k === "ca_facture" ? (
                      <>
                        Prévision fin de mois :{" "}
                        <b className="font-medium text-foreground">
                          {eur0(forecast)}
                        </b>{" "}
                        ·{" "}
                      </>
                    ) : (
                      <>
                        Attendu aujourd&apos;hui :{" "}
                        <b className="font-medium text-foreground">
                          {show(k, t * p.elapsed)}
                        </b>{" "}
                        ·{" "}
                      </>
                    )}
                    mois dernier : {show(k, before[k])}
                    {isSuggested && (
                      <span className="mt-1 block">Suggestion : {why[k]}</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {active.length > 0 && caTarget != null && missing > 0 && (
          <p className="mt-5 rounded-lg bg-secondary/60 px-4 py-3 text-[13px] text-secondary-foreground">
            Il manque{" "}
            <b className="font-medium text-foreground">{eur0(missing)} HT</b>{" "}
            pour l&apos;objectif de CA. {eur0(pipe)} sont déjà dans les tuyaux
            (brouillons, devis acceptés, contrats à facturer)
            {pipe >= missing
              ? " : de quoi l'atteindre si tout part."
              : ` : il reste ${eur0(missing - pipe)} à aller chercher.`}
          </p>
        )}
        {active.length > 0 && levers.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer list-none text-[13px] font-medium text-primary hover:underline">
              Pour y arriver : {levers.length} piste
              {levers.length > 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 divide-y divide-border/70">
              {levers.slice(0, 5).map((l) => (
                <li key={l.key}>
                  <Link
                    href={l.href}
                    className="flex items-center gap-3 py-2.5 text-sm hover:text-primary"
                  >
                    <span className="num w-7 text-right font-semibold">
                      {l.count}
                    </span>
                    <span className="min-w-0 flex-1">
                      {l.label}
                      <span className="block text-xs text-muted-foreground">
                        {l.note}
                      </span>
                    </span>
                    {l.amount != null && (
                      <span className="num font-medium">{eur0(l.amount)}</span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        {!isSuggested && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
            <form action={askPlanAction.bind(null, month)}>
              <Button size="sm" variant="outline">
                <Sparkles className="mr-1.5 h-4 w-4" /> Demander un plan à
                l&apos;assistant
              </Button>
            </form>
            <span className="text-xs text-muted-foreground">
              Il étudie vos chiffres, vos clients et vos échanges, puis écrit le
              plan ici.
            </span>
          </div>
        )}
        {plan.data && (
          <details className="mt-3 rounded-lg bg-secondary/50 px-4 py-3" open>
            <summary className="cursor-pointer list-none text-[13px] font-medium text-foreground">
              Plan de l&apos;assistant · {formatDate(plan.data.updated_at)}
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-sm text-secondary-foreground">
              {plan.data.body}
            </p>
          </details>
        )}
        <div
          className={active.length ? "mt-4 border-t border-border/70 pt-4" : ""}
        >
          {form}
        </div>
      </div>
    </Card>
  );
}

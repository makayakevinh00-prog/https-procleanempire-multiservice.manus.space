import Link from "next/link";
import {
  AlertTriangle,
  Lock,
  UserPlus,
  FilePlus,
  CalendarPlus,
  CalendarCheck,
  Zap,
  Mail,
  Siren,
  TrendingUp,
  TrendingDown,
  Repeat,
  Receipt,
  Wallet,
  Clock,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num, numOrNull } from "@/lib/data";
import { loadActions, menuCountsFrom } from "@/lib/actions";
import {
  monthlyRevenueHt,
  summarize,
  weeklyHours,
  weeklyRevenueHt,
  type SiteRow,
} from "@/lib/domain/recruitment";
import { parisToday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Tr } from "@/components/ui/table";
import { ClientName } from "@/components/crm/client-name";
import { MonthlyBars, Donut, RankBars } from "@/components/crm/charts";
import {
  daysBetween,
  formatDate,
  formatEUR,
  formatHours,
  round2,
} from "@/lib/utils";
import type { Contract } from "@/lib/domain/types";

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function Kpi({
  label,
  value,
  sub,
  href,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  href: string;
  icon: any;
  accent: "emerald" | "teal" | "blue" | "orange" | "violet" | "amber" | "red";
  trend?: { pct: number; hint: string } | null;
}) {
  const a = {
    emerald: ["bg-emerald-50 text-emerald-600", "bg-emerald-500"],
    teal: ["bg-teal-50 text-teal-700", "bg-teal-500"],
    blue: ["bg-blue-50 text-blue-600", "bg-blue-500"],
    orange: ["bg-orange-50 text-orange-600", "bg-orange-500"],
    violet: ["bg-violet-50 text-violet-600", "bg-violet-500"],
    amber: ["bg-amber-50 text-amber-600", "bg-amber-500"],
    red: ["bg-red-50 text-red-600", "bg-red-500"],
  }[accent];
  return (
    <Link href={href} className="group block">
      <Card className="relative h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <span className={`absolute inset-x-0 top-0 h-1 ${a[1]}`} aria-hidden />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-medium text-slate-500">
              {label}
            </div>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${a[0]}`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="mt-2 text-[34px] font-bold leading-none tracking-tight text-slate-900 xl:text-[40px]">
            {value}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {trend && (
              <span
                title={trend.hint}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${trend.pct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
              >
                {trend.pct >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.pct >= 0 ? "+" : ""}
                {trend.pct} %
              </span>
            )}
            {sub}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function Dashboard() {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const settings = await getSettings(supabase);

  const [contracts, invoices, quotes, payments, reserved, actions, clients] =
    await Promise.all([
      supabase
        .from("contracts")
        .select("*, clients(id, name, is_reserved)")
        .eq("status", "actif"),
      supabase
        .from("invoices")
        .select(
          "id, number, status, due_date, issue_date, total_ht, total_ttc, paid_amount, reminder_count, last_reminder_at, clients(id, name, is_reserved)",
        )
        .neq("status", "annule"),
      supabase
        .from("quotes")
        .select(
          "id, number, status, subject, total_ht, invoice_id, clients(id, name, is_reserved), invoices:invoice_id(status)",
        )
        .eq("status", "accepte"),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .in("match_status", ["non_rapproche", "propose"]),
      supabase.from("clients").select("id, name").eq("is_reserved", true),
      loadActions(supabase),
      supabase.from("clients").select("kind, status"),
    ]);
  for (const r of [contracts, invoices, quotes, payments, reserved, clients])
    if (r.error) throw new Error(r.error.message);

  const inv = (invoices.data ?? []) as any[];
  const drafts = inv.filter((i) => i.status === "brouillon");
  const open = inv.filter((i) => ["envoye", "en_retard"].includes(i.status));
  const late = open.filter((i) => i.status === "en_retard");
  const outstanding = round2(
    open.reduce((a, i) => a + num(i.total_ttc) - num(i.paid_amount), 0),
  );
  const today = parisToday();
  const [ty, tm] = today.split("-").map(Number);
  const ym = (y: number, m: number) => {
    const d = new Date(Date.UTC(y, m - 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const month = ym(ty, tm),
    prevMonth = ym(ty, tm - 1);
  const issued = inv.filter((i) => i.status !== "brouillon" && i.issue_date);
  const sumWhere = (f: (i: any) => boolean) =>
    round2(issued.filter(f).reduce((a, i) => a + num(i.total_ht), 0));
  const billedMonth = sumWhere((i) => i.issue_date.startsWith(month));
  // La facturation part en fin de mois : on compare le dernier mois complet au précédent (comparaison juste).
  const prev2Month = ym(ty, tm - 2);
  const billedPrev = sumWhere((i) => i.issue_date.startsWith(prevMonth));
  const billedPrev2 = sumWhere((i) => i.issue_date.startsWith(prev2Month));
  const billedTrend =
    billedPrev2 > 0
      ? {
          pct: Math.round(((billedPrev - billedPrev2) / billedPrev2) * 100),
          hint: `${formatEUR(billedPrev)} contre ${formatEUR(billedPrev2)} HT le mois d'avant`,
        }
      : null;
  const monthName = (key: string) =>
    [
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
    ][Number(key.slice(5)) - 1];
  const series = Array.from({ length: 12 }, (_, k) => {
    const key = ym(ty, tm - 11 + k);
    return {
      label: MONTHS[Number(key.slice(5)) - 1],
      value: sumWhere((i) => i.issue_date.startsWith(key)),
      current: key === month,
      key,
    };
  });
  const total12 = round2(series.reduce((a, d) => a + d.value, 0));
  const firstData = series.find((d) => d.value > 0);
  const byClient = new Map<string, { label: string; value: number }>();
  for (const i of issued.filter((i) => i.issue_date >= `${series[0].key}-01`)) {
    const c = byClient.get(i.clients.id) ?? { label: i.clients.name, value: 0 };
    c.value = round2(c.value + num(i.total_ht));
    byClient.set(i.clients.id, c);
  }
  const topClients = [...byClient.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const cl = (clients.data ?? []) as any[];
  const activeClients = cl.filter((c) => c.status === "actif");
  const toInvoice = ((quotes.data ?? []) as any[]).filter(
    (q) => !q.invoice_id || q.invoices?.status === "annule",
  );

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
      clientName: k.clients.name,
      weeklyHours: weeklyHours(c),
      weeklyRevenue: weeklyRevenueHt(c),
    };
  });
  const rec = summarize(rows, settings);
  const mrr = round2(
    rows.reduce((a, r) => a + (monthlyRevenueHt(r.contract) ?? 0), 0),
  );
  const lateAmount = round2(
    late.reduce((a, i) => a + num(i.total_ttc) - num(i.paid_amount), 0),
  );

  const hour = new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "numeric",
    hour12: false,
  });
  const h = Number(hour);
  const greeting = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <>
      {/* En-tête de bienvenue — plus visuel */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1a28] via-[#0b1e22] to-[#061412] px-8 py-7 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white md:text-3xl">
              {greeting} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {new Date().toLocaleDateString("fr-FR", {
                timeZone: "Europe/Paris",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" — "}ProClean Empire
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.length > 0 && (
              <Link
                href="/actions"
                className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 shadow transition hover:bg-amber-300"
              >
                <Siren className="h-4 w-4" />
                {menuCountsFrom(actions)["/actions"]} action(s)
              </Link>
            )}
          </div>
        </div>
      </div>

      {(reserved.data?.length ?? 0) > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
          <Lock className="h-4 w-4" /> <b>Contacts réservés :</b>
          {reserved.data!.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="font-medium underline"
            >
              {c.name}
            </Link>
          ))}
          <span className="text-red-700">— aucune action automatique.</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {(
          [
            [
              "/clients/new",
              UserPlus,
              "Ajouter un client",
              "bg-emerald-600 hover:bg-emerald-700",
            ],
            [
              "/devis/new",
              FilePlus,
              "Créer un devis",
              "bg-emerald-600 hover:bg-emerald-700",
            ],
            [
              "/planning",
              CalendarPlus,
              "Planifier une mission",
              "bg-teal-600 hover:bg-teal-700",
            ],
            [
              "/planning",
              CalendarCheck,
              "Générer le planning",
              "bg-teal-600 hover:bg-teal-700",
            ],
            [
              "/facturation-auto",
              Zap,
              "Préparer les factures",
              "bg-orange-500 hover:bg-orange-600",
            ],
            [
              "/factures?statut=en_retard",
              Mail,
              "Relancer les clients",
              "bg-violet-600 hover:bg-violet-700",
            ],
            [
              "/actions",
              Siren,
              "Voir les urgences",
              "bg-red-600 hover:bg-red-700",
            ],
          ] as const
        ).map(([href, Icon, label, color]) => (
          <Link
            key={label}
            href={href}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors sm:px-3.5 sm:text-sm ${color}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="CA récurrent / mois (HT)"
          value={formatEUR(mrr)}
          icon={Repeat}
          accent="emerald"
          href="/contrats"
          sub={<span>{rows.length} contrat(s) actif(s)</span>}
        />
        <Kpi
          label={`Facturé en ${monthName(prevMonth)} (HT)`}
          value={formatEUR(billedPrev)}
          icon={Receipt}
          accent="teal"
          href="/factures"
          trend={billedTrend}
          sub={
            <span>
              {billedTrend ? `vs ${monthName(prev2Month)} · ` : ""}
              {monthName(month)} en cours : {formatEUR(billedMonth)}
            </span>
          }
        />
        <Kpi
          label="Encours à encaisser (TTC)"
          value={formatEUR(outstanding)}
          icon={Wallet}
          accent={late.length ? "red" : "orange"}
          href="/factures?statut=en_retard"
          sub={
            late.length ? (
              <span className="font-medium text-red-700">
                dont {formatEUR(lateAmount)} en retard ({late.length})
              </span>
            ) : (
              <span>aucun retard</span>
            )
          }
        />
        {rec.sitesWithHours === 0 && rows.length > 0 ? (
          <Kpi
            label="Heures hebdo"
            value="—"
            icon={Clock}
            accent="amber"
            href="/contrats?filtre=incomplets"
            sub={
              <span className="text-amber-700">
                ⚠ {rec.sitesMissingHours} site(s) sans heures renseignées
              </span>
            }
          />
        ) : (
          <Kpi
            label="Heures hebdo"
            value={formatHours(rec.totalHours)}
            icon={Clock}
            accent="violet"
            href="/recrutement"
            sub={
              <span>
                Recrutement : <b>{rec.level.toUpperCase()}</b>
                {rec.sitesMissingHours
                  ? ` · ⚠ ${rec.sitesMissingHours} site(s) sans heures`
                  : ""}
              </span>
            }
          />
        )}
      </div>

      <Card className="mb-6" id="alertes">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> À faire
            maintenant
          </CardTitle>
          <Link
            href="/actions"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Tout voir ({menuCountsFrom(actions)["/actions"]})
          </Link>
        </CardHeader>
        {!actions.length ? (
          <Empty>Rien à faire : tout est à jour.</Empty>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ...actions.filter((a) => a.count === undefined).slice(0, 3),
              ...actions.filter((a) => a.count !== undefined).slice(0, 9),
            ].map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className={`group flex items-center gap-3 rounded-lg border border-slate-200 border-l-[5px] bg-white p-3 text-sm shadow-sm transition-shadow hover:shadow-md ${a.tone === "red" ? "border-l-red-600" : a.tone === "orange" ? "border-l-orange-500" : "border-l-blue-500"}`}
              >
                {a.count !== undefined && (
                  <span className="text-[26px] font-bold leading-none text-slate-900">
                    {a.count}
                  </span>
                )}
                <span className="flex-1 leading-snug text-slate-600">
                  {a.label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chiffre d&apos;affaires facturé par mois (HT)</CardTitle>
            <span className="text-xs text-slate-500">
              12 mois : <b className="text-slate-900">{formatEUR(total12)}</b>
            </span>
          </CardHeader>
          <CardContent className="pt-3">
            <MonthlyBars data={series} />
            <p className="mt-2 text-xs text-slate-400">
              Mois en cours en plus clair (incomplet).{" "}
              {firstData && firstData.key !== series[0].key
                ? `Historique disponible à partir de ${firstData.label} (factures reprises d'Axonaut).`
                : ""}{" "}
              Survolez une barre pour le montant exact.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <Link
              href="/clients"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir
            </Link>
          </CardHeader>
          <CardContent className="space-y-5">
            <Donut
              center={String(activeClients.length)}
              sub="clients actifs"
              parts={[
                {
                  label: "Entreprises",
                  value: activeClients.filter((c) => c.kind === "entreprise")
                    .length,
                },
                {
                  label: "Particuliers",
                  value: activeClients.filter((c) => c.kind !== "entreprise")
                    .length,
                },
              ]}
            />
            <div className="flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Prospects :{" "}
                <b className="text-slate-900">
                  {cl.filter((c) => c.status === "prospect").length}
                </b>
              </span>
              <span>
                Inactifs :{" "}
                <b className="text-slate-900">
                  {cl.filter((c) => c.status === "inactif").length}
                </b>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meilleurs clients (12 mois, HT)</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length ? (
              <RankBars rows={topClients} />
            ) : (
              <Empty>Aucune facture émise.</Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Factures en retard ({late.length})</CardTitle>
          </CardHeader>
          {!late.length ? (
            <Empty>Aucun impayé en retard.</Empty>
          ) : (
            <Table>
              <tbody>
                {late.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <Link
                        href={`/factures/${i.id}`}
                        className="font-semibold hover:underline"
                      >
                        {i.number}
                      </Link>
                    </Td>
                    <Td>
                      <ClientName
                        name={i.clients.name}
                        reserved={i.clients.is_reserved}
                        link={false}
                      />
                    </Td>
                    <Td className="font-medium text-red-700">
                      {daysBetween(i.due_date)} j
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {i.reminder_count
                        ? `${i.reminder_count} relance(s), dernière ${formatDate(i.last_reminder_at)}`
                        : "jamais relancée"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Factures à valider ({drafts.length})</CardTitle>
          </CardHeader>
          {!drafts.length ? (
            <Empty>Aucun brouillon en attente.</Empty>
          ) : (
            <Table>
              <tbody>
                {drafts.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <ClientName
                        id={i.clients.id}
                        name={i.clients.name}
                        reserved={i.clients.is_reserved}
                        link={false}
                      />
                    </Td>
                    <Td className="whitespace-nowrap">
                      {formatEUR(i.total_ht)} HT
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Link
                        href={`/factures/${i.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Relire & valider
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Devis acceptés à facturer ({toInvoice.length})
            </CardTitle>
          </CardHeader>
          {!toInvoice.length ? (
            <Empty>Rien en attente.</Empty>
          ) : (
            <Table>
              <tbody>
                {toInvoice.map((q) => (
                  <Tr key={q.id}>
                    <Td>
                      <Link
                        href={`/devis/${q.id}`}
                        className="font-semibold hover:underline"
                      >
                        {q.number}
                      </Link>
                    </Td>
                    <Td>
                      <ClientName
                        name={q.clients.name}
                        reserved={q.clients.is_reserved}
                        link={false}
                      />
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      {formatEUR(q.total_ht)} HT
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
            {payments.count ? (
              <>
                <Badge tone="orange">{payments.count}</Badge> virement(s) à
                rapprocher —{" "}
                <Link
                  href="/paiements"
                  className="text-primary hover:underline"
                >
                  ouvrir
                </Link>
              </>
            ) : (
              "Tous les paiements sont rapprochés."
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

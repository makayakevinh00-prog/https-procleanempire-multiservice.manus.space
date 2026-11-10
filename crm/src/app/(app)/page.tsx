import Link from "next/link";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num, numOrNull } from "@/lib/data";
import { menuCountsFrom } from "@/lib/actions";
import { loadActionsCached } from "@/lib/actions-request";
import { monthlyRevenueHt, summarize, weeklyHours, weeklyRevenueHt, type SiteRow } from "@/lib/domain/recruitment";
import { parisToday } from "@/lib/domain/dates";
import { Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientName } from "@/components/crm/client-name";
import { MonthlyBars, Donut, RankBars } from "@/components/crm/charts";
import { Row, Seg, Sparkline, Stat } from "@/components/crm/home-kit";
import { Objectives } from "@/components/crm/objectifs";
import { daysBetween, formatDate, formatEUR, formatHours, round2 } from "@/lib/utils";
import type { Contract } from "@/lib/domain/types";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

export default async function Dashboard({ searchParams }: { searchParams?: { vue?: string; mois?: string } }) {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const [settings, contracts, invoices, quotes, payments, reserved, actions, clients] = await Promise.all([
    getSettings(supabase),
    supabase.from("contracts").select("*, clients(id, name, is_reserved)").eq("status", "actif"),
    supabase.from("invoices").select("id, number, status, due_date, issue_date, total_ht, total_ttc, paid_amount, reminder_count, last_reminder_at, clients(id, name, is_reserved)").neq("status", "annule"),
    supabase.from("quotes").select("id, number, status, subject, total_ht, invoice_id, clients(id, name, is_reserved), invoices:invoice_id(status)").eq("status", "accepte"),
    supabase.from("payments").select("id", { count: "exact", head: true }).in("match_status", ["non_rapproche", "propose"]),
    supabase.from("clients").select("id, name").eq("is_reserved", true),
    loadActionsCached(),
    supabase.from("clients").select("kind, status")
  ]);
  for (const r of [contracts, invoices, quotes, payments, reserved, clients]) if (r.error) throw new Error(r.error.message);

  const inv = (invoices.data ?? []) as any[];
  const drafts = inv.filter((i) => i.status === "brouillon");
  const open = inv.filter((i) => ["envoye", "en_retard"].includes(i.status));
  const late = open.filter((i) => i.status === "en_retard");
  const outstanding = round2(open.reduce((a, i) => a + num(i.total_ttc) - num(i.paid_amount), 0));
  const today = parisToday();
  const [ty, tm] = today.split("-").map(Number);
  const ym = (y: number, m: number) => { const d = new Date(Date.UTC(y, m - 1, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
  const month = ym(ty, tm), prevMonth = ym(ty, tm - 1);
  const issued = inv.filter((i) => i.status !== "brouillon" && i.issue_date);
  const sumWhere = (f: (i: any) => boolean) => round2(issued.filter(f).reduce((a, i) => a + num(i.total_ht), 0));
  const billedMonth = sumWhere((i) => i.issue_date.startsWith(month));
  // La facturation part en fin de mois : on compare le dernier mois complet au précédent (comparaison juste).
  const prev2Month = ym(ty, tm - 2);
  const billedPrev = sumWhere((i) => i.issue_date.startsWith(prevMonth));
  const billedPrev2 = sumWhere((i) => i.issue_date.startsWith(prev2Month));
  const billedTrend = billedPrev2 > 0 ? { pct: Math.round(((billedPrev - billedPrev2) / billedPrev2) * 100), hint: `${formatEUR(billedPrev)} contre ${formatEUR(billedPrev2)} HT le mois d'avant` } : null;
  const monthName = (key: string) => ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][Number(key.slice(5)) - 1];
  const series = Array.from({ length: 12 }, (_, k) => {
    const key = ym(ty, tm - 11 + k);
    return { label: MONTHS[Number(key.slice(5)) - 1], value: sumWhere((i) => i.issue_date.startsWith(key)), current: key === month, key, href: `/?mois=${key}#detail-mois`, selected: key === searchParams?.mois };
  });
  const total12 = round2(series.reduce((a, d) => a + d.value, 0));
  const firstData = series.find((d) => d.value > 0);
  const byClient = new Map<string, { label: string; value: number }>();
  for (const i of issued.filter((i) => i.issue_date >= `${series[0].key}-01`)) {
    const c = byClient.get(i.clients.id) ?? { label: i.clients.name, value: 0 };
    c.value = round2(c.value + num(i.total_ht)); byClient.set(i.clients.id, c);
  }
  const topClients = [...byClient.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  const cl = (clients.data ?? []) as any[];
  const activeClients = cl.filter((c) => c.status === "actif");
  const toInvoice = ((quotes.data ?? []) as any[]).filter((q) => !q.invoice_id || q.invoices?.status === "annule");

  const rows: SiteRow[] = ((contracts.data ?? []) as any[]).map((k) => {
    const c = { ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht),
      hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) } as Contract;
    return { contract: c, clientName: k.clients.name, weeklyHours: weeklyHours(c), weeklyRevenue: weeklyRevenueHt(c) };
  });
  const rec = summarize(rows, settings);
  const mrr = round2(rows.reduce((a, r) => a + (monthlyRevenueHt(r.contract) ?? 0), 0));
  const lateAmount = round2(late.reduce((a, i) => a + num(i.total_ttc) - num(i.paid_amount), 0));

  const picked = series.find((d) => d.key === searchParams?.mois);
  const pickedRows = picked ? (() => {
    const m = new Map<string, { label: string; value: number; n: number; href: string }>();
    for (const i of issued.filter((i) => i.issue_date.startsWith(picked.key))) {
      const c = m.get(i.clients.id) ?? { label: i.clients.name, value: 0, n: 0, href: `/clients/${i.clients.id}` };
      c.value = round2(c.value + num(i.total_ht)); c.n += 1; m.set(i.clients.id, c);
    }
    return [...m.values()].sort((a, b) => b.value - a.value);
  })() : [];
  const vue = ["afaire", "retard", "valider"].includes(searchParams?.vue ?? "") ? (searchParams!.vue as string) : "afaire";
  const actionsCount = menuCountsFrom(actions)["/actions"] ?? 0;
  const toValidate = drafts.length + toInvoice.length;
  const bits = [
    late.length ? `${late.length} facture${late.length > 1 ? "s" : ""} en retard` : "aucun impayé en retard",
    drafts.length ? `${drafts.length} facture${drafts.length > 1 ? "s" : ""} à valider` : null,
    toInvoice.length ? `${toInvoice.length} devis accepté${toInvoice.length > 1 ? "s" : ""} à facturer` : null
  ].filter(Boolean) as string[];
  const dateLabel = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const monthlySeries = series.map((d) => d.value);
  const ordered = [...actions.filter((a) => a.count === undefined), ...actions.filter((a) => a.count !== undefined)];

  return (
    <>
      <header className="mb-2">
        <h1 className="text-[clamp(28px,4vw,38px)] font-semibold leading-[1.15] tracking-[-0.025em] text-foreground">Bonjour</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
        <p className="mt-3 max-w-[62ch] text-[15px] text-secondary-foreground">
          <b className="font-medium text-foreground">{actionsCount} point{actionsCount > 1 ? "s" : ""} à traiter</b>, {bits.join(", ")}.
        </p>
      </header>

      {(reserved.data?.length ?? 0) > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-[#f6e4e1] px-4 py-3 text-sm text-[#7d261d]">
          <Lock className="h-4 w-4" /> <b className="font-medium">Contacts réservés :</b>
          {reserved.data!.map((c) => <Link key={c.id} href={`/clients/${c.id}`} className="underline">{c.name}</Link>)}
          <span>aucune action automatique.</span>
        </div>
      )}

      <section aria-label="Indicateurs" className="mt-9 grid grid-cols-2 border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-border xl:grid-cols-5">
        <Stat label="CA récurrent par mois" value={eur0(mrr)} unit="HT" href="/contrats" hint={`${rows.length} contrat${rows.length > 1 ? "s" : ""} actif${rows.length > 1 ? "s" : ""}`} />
        <Stat label={`Facturé en ${monthName(prevMonth)}`} value={eur0(billedPrev)} unit="HT" href="/factures"
          tone={billedTrend ? (billedTrend.pct >= 0 ? "ok" : "err") : undefined}
          hint={billedTrend ? `${billedTrend.pct >= 0 ? "+" : ""}${billedTrend.pct} % · ${monthName(month)} : ${eur0(billedMonth)}` : `${monthName(month)} : ${eur0(billedMonth)}`}>
          <Sparkline values={monthlySeries} label="Facturation des 12 derniers mois" />
        </Stat>
        <Stat label="À encaisser" value={eur0(outstanding)} unit="TTC" href="/factures?statut=en_retard" tone={late.length ? "err" : undefined}
          hint={late.length ? `dont ${eur0(lateAmount)} en retard (${late.length})` : "aucun retard"} />
        {rec.sitesWithHours === 0 && rows.length > 0 ? (
          <Stat label="Heures par semaine" value="—" href="/contrats?filtre=incomplets" tone="warn" hint={`${rec.sitesMissingHours} site(s) sans heures renseignées`} />
        ) : (
          <Stat label="Heures par semaine" value={formatHours(rec.totalHours)} href="/recrutement" hint={`Recrutement : ${rec.level.toUpperCase()}${rec.sitesMissingHours ? ` · ${rec.sitesMissingHours} site(s) sans heures` : ""}`} />
        )}
        <Stat label="Clients actifs" value={String(activeClients.length)} href="/clients"
          hint={`${cl.filter((c) => c.status === "prospect").length} prospect(s)`} />
      </section>

      <Objectives today={today} />

      <div className="mt-10">
        <Seg items={[
          { href: "/?vue=afaire", label: "À faire maintenant", count: actionsCount, active: vue === "afaire" },
          { href: "/?vue=retard", label: "Factures en retard", count: late.length, active: vue === "retard", alert: true },
          { href: "/?vue=valider", label: "À valider", count: toValidate, active: vue === "valider" }
        ]} />
      </div>

      <Card className="mt-4 overflow-hidden" id="alertes">
        <div className="py-1.5">
          {vue === "afaire" && (!actions.length ? <Empty>Rien à faire : tout est à jour.</Empty> : (
            <>
              {ordered.slice(0, 12).map((a) => (
                <Row key={a.key} href={a.href} lead={a.count !== undefined ? a.count : ""} dot={a.count === undefined ? (a.tone === "red" ? "err" : a.tone === "orange" ? "warn" : undefined) : undefined}
                  title={a.label} right={<ArrowRight className="h-4 w-4" />} />
              ))}
              <div className="px-6 py-3 text-[13px]"><Link href="/actions" className="font-medium text-primary hover:underline">Tout voir ({actionsCount})</Link></div>
            </>
          ))}
          {vue === "retard" && (!late.length ? <Empty>Aucun impayé en retard.</Empty> : late.map((i) => (
            <Row key={i.id} href={`/factures/${i.id}`} lead={`${daysBetween(i.due_date)} j`} dot="err"
              title={<>{i.number} · <ClientName name={i.clients.name} reserved={i.clients.is_reserved} link={false} /></>}
              sub={i.reminder_count ? `${i.reminder_count} relance(s), dernière ${formatDate(i.last_reminder_at)}` : "jamais relancée"}
              right={formatEUR(num(i.total_ttc) - num(i.paid_amount))} />
          )))}
          {vue === "valider" && (!drafts.length && !toInvoice.length && !payments.count ? <Empty>Rien en attente de validation.</Empty> : (
            <>
              {drafts.map((i) => (
                <Row key={i.id} href={`/factures/${i.id}`} lead="Facture" title={<ClientName id={i.clients.id} name={i.clients.name} reserved={i.clients.is_reserved} link={false} />}
                  sub="Brouillon à relire et valider" right={`${formatEUR(i.total_ht)} HT`} />
              ))}
              {toInvoice.map((q) => (
                <Row key={q.id} href={`/devis/${q.id}`} lead="Devis" title={<>{q.number} · <ClientName name={q.clients.name} reserved={q.clients.is_reserved} link={false} /></>}
                  sub="Accepté, à facturer" right={`${formatEUR(q.total_ht)} HT`} />
              ))}
              {!!payments.count && <Row href="/paiements" lead={payments.count} title="virement(s) à rapprocher" right={<ArrowRight className="h-4 w-4" />} />}
            </>
          ))}
        </div>
      </Card>

      <Link href="/jarvis/openspace" className="mt-6 flex items-center gap-4 rounded-2xl bg-card px-5 py-4 text-[15px] text-secondary-foreground shadow-[0_1px_2px_rgba(17,18,20,0.04),0_8px_24px_rgba(17,18,20,0.04)] transition-colors hover:bg-secondary/40">
        <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
        <span><b className="font-medium text-foreground">JARVIS</b> · vos agents et leurs alertes</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-primary">Entrer dans les locaux <ArrowRight className="h-4 w-4" /></span>
      </Link>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chiffre d&apos;affaires facturé par mois (HT)</CardTitle>
            <span className="text-xs text-muted-foreground">12 mois : <b className="num font-medium text-foreground">{formatEUR(total12)}</b></span>
          </CardHeader>
          <CardContent className="pt-3">
            <MonthlyBars data={series} />
            <p className="mt-2 text-xs text-muted-foreground">Mois en cours en plus clair (incomplet). {firstData && firstData.key !== series[0].key ? `Historique disponible à partir de ${firstData.label} (factures reprises d'Axonaut).` : ""} Survolez une barre pour le montant exact, cliquez pour voir les clients.</p>
            {picked && (
              <div id="detail-mois" className="mt-4 rounded-xl bg-secondary/50 p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">{monthName(picked.key).charAt(0).toUpperCase() + monthName(picked.key).slice(1)} : qui a fait le chiffre</span>
                  <Link href="/" scroll={false} className="text-xs font-medium text-primary hover:underline">Fermer</Link>
                </div>
                {pickedRows.length ? (
                  <>
                    <RankBars rows={pickedRows.map((r) => ({ label: `${r.label} · ${r.n} facture${r.n > 1 ? "s" : ""} · ${Math.round((r.value / (picked.value || 1)) * 100)} %`, value: r.value, href: r.href }))} />
                    <p className="mt-3 text-xs text-muted-foreground">Total {formatEUR(picked.value)} HT, {pickedRows.length} client{pickedRows.length > 1 ? "s" : ""}.</p>
                  </>
                ) : <p className="text-sm text-muted-foreground">Aucune facture émise ce mois-là.</p>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Clients</CardTitle><Link href="/clients" className="text-xs font-medium text-primary hover:underline">Voir</Link></CardHeader>
          <CardContent className="space-y-5">
            <Donut center={String(activeClients.length)} sub="clients actifs"
              parts={[{ label: "Entreprises", value: activeClients.filter((c) => c.kind === "entreprise").length }, { label: "Particuliers", value: activeClients.filter((c) => c.kind !== "entreprise").length }]} />
            <div className="flex gap-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <span>Prospects : <b className="num font-medium text-foreground">{cl.filter((c) => c.status === "prospect").length}</b></span>
              <span>Inactifs : <b className="num font-medium text-foreground">{cl.filter((c) => c.status === "inactif").length}</b></span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Meilleurs clients (12 mois, HT)</CardTitle></CardHeader>
        <CardContent>{topClients.length ? <RankBars rows={topClients} /> : <Empty>Aucune facture émise.</Empty>}</CardContent>
      </Card>
    </>
  );
}

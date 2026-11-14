import Link from "next/link";
import { CalendarClock, KeyRound, Plus, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
import {
  missionActivity,
  isActivity,
  type Activity,
} from "@/lib/domain/activity";
import { loadActivityModel } from "@/lib/activity-data";
import { PLATFORMS } from "@/lib/concierge/ical";
import {
  addDays,
  buildAlerts,
  commissionOf,
  monthLabel,
  occupancy,
  occupancyDays,
  type Alert,
  type Stay,
} from "@/lib/concierge/plan";
import {
  createCommissionDraftAction,
  deleteListingAction,
  runAllAction,
  saveListingAction,
  saveRevenueAction,
  syncListingNowAction,
  toggleAutomationAction,
} from "@/app/actions/conciergerie";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { Row, Stat } from "@/components/crm/home-kit";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { ListingForm } from "@/components/crm/concierge-forms";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
const TABS = [
  ["apercu", "Vue d'ensemble"],
  ["planning", "Planning"],
  ["calendrier", "Calendrier"],
  ["logements", "Logements"],
  ["revenus", "Revenus et commission"],
  ["automatisations", "Automatisations"],
] as const;
const CONCIERGE: Activity[] = ["nettoyage_airbnb", "gestion_locative"];
const prevMonth = (today: string) => {
  const d = new Date(
    Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1),
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const shift = (m: string, n: number) => {
  const d = new Date(
    Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1),
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const DOT: Record<Alert["tone"], "err" | "warn" | undefined> = {
  err: "err",
  warn: "warn",
  info: undefined,
};
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      })
    : "jamais";

export default async function ConciergeriePage({
  searchParams,
}: {
  searchParams: { tab?: string; m?: string };
}) {
  const tab = TABS.some(([k]) => k === searchParams.tab)
    ? searchParams.tab!
    : "apercu";
  const sb = createClient();
  const today = parisToday();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.m ?? "")
    ? searchParams.m!
    : prevMonth(today);
  const [lst, stays, mis, clients, ctr, rev, au, staff, model] =
    await Promise.all([
      sb
        .from("concierge_listings")
        .select("*, clients(name), contracts(label)")
        .order("name"),
      sb
        .from("concierge_stays")
        .select("id, listing_id, check_in, check_out, cancelled")
        .gte("check_out", addDays(today, -30))
        .lte("check_in", addDays(today, 60)),
      sb
        .from("interventions")
        .select(
          "id, title, scheduled_date, start_time, stage, staff_id, assignee, contract_id, activity, source_key, clients(name), staff(full_name)",
        )
        .gte("scheduled_date", today)
        .lte("scheduled_date", addDays(today, 30))
        .neq("stage", "annulee")
        .order("scheduled_date")
        .order("start_time"),
      sb.from("clients").select("id, name").order("name"),
      sb
        .from("contracts")
        .select(
          "id, label, client_id, activity, commission_pct, status, clients(name, is_reserved)",
        )
        .neq("status", "resilie"),
      sb
        .from("concierge_revenues")
        .select("contract_id, month, revenue_ht, invoice_id")
        .eq("month", month),
      sb.from("concierge_automations").select("key, enabled"),
      sb
        .from("staff")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name"),
      loadActivityModel(sb),
    ]);
  if (lst.error)
    return (
      <>
        <PageHeader title="Conciergerie" />
        <Card>
          <Empty icon={KeyRound}>
            La conciergerie s&apos;installe : réessayez dans une minute.
          </Empty>
        </Card>
      </>
    );
  for (const r of [stays, mis, clients, ctr, rev, au, staff])
    if (r.error) throw new Error(r.error.message);

  const listings = (lst.data ?? []) as any[];
  const contracts = (ctr.data ?? []) as any[];
  const cleanings = ((mis.data ?? []) as any[]).filter(
    (m) =>
      String(m.source_key ?? "").startsWith("conc:") ||
      CONCIERGE.includes(
        missionActivity(
          {
            activity: isActivity(m.activity) ? m.activity : null,
            contractId: m.contract_id,
            title: m.title,
            clientName: m.clients?.name ?? null,
          },
          model.byContract,
        ),
      ),
  );
  const week = addDays(today, 7),
    tomorrow = addDays(today, 1);
  const enabled = new Map(
    ((au.data ?? []) as any[]).map((a) => [
      a.key as string,
      a.enabled as boolean,
    ]),
  );
  const opt = (rows: any[], f: (r: any) => string) =>
    rows.map((r) => ({ id: r.id as string, label: f(r) }));
  const clientOpts = opt((clients.data ?? []) as any[], (c) => c.name);
  const contractOpts = opt(
    contracts.filter(
      (k) => k.commission_pct != null || CONCIERGE.includes(k.activity),
    ),
    (k) => `${k.clients?.name ?? ""} — ${k.label}`,
  );
  const staffOpts = opt((staff.data ?? []) as any[], (s) => s.full_name);

  const owners = [...new Set(listings.map((l) => l.client_id as string))];
  const { data: inter } = owners.length
    ? await sb
        .from("interactions")
        .select("client_id, occurred_at")
        .in("client_id", owners)
        .order("occurred_at", { ascending: false })
    : { data: [] };
  const lastTalk = new Map<string, string>();
  for (const i of (inter ?? []) as any[])
    if (!lastTalk.has(i.client_id)) lastTalk.set(i.client_id, i.occurred_at);
  const idleOwners = owners
    .map((id) => ({
      id,
      at: lastTalk.get(id),
      name: listings.find((l) => l.client_id === id)?.clients?.name as string,
    }))
    .filter((o) => o.at && (Date.parse(today) - Date.parse(o.at)) / 864e5 > 30)
    .map((o) => ({
      name: o.name,
      days: Math.floor((Date.parse(today) - Date.parse(o.at!)) / 864e5),
    }));
  const alerts = buildAlerts({
    today,
    cleanings: cleanings
      .filter((c) => c.scheduled_date <= week)
      .map((c) => ({
        date: c.scheduled_date,
        staff: !!(c.staff_id || c.assignee),
      })),
    departuresTomorrow: ((stays.data ?? []) as any[]).filter(
      (s) => !s.cancelled && s.check_out === tomorrow,
    ).length,
    listings: listings.map((l) => ({
      name: l.name,
      hasUrl: !!l.ical_url,
      lastSyncAt: l.last_sync_at,
      lastSyncError: l.last_sync_error,
      price: l.cleaning_price_ht == null ? null : num(l.cleaning_price_ht),
    })),
    idleOwners,
  });

  const commissionContracts = contracts.filter(
    (k) => k.commission_pct != null && !k.clients?.is_reserved,
  );
  const revOf = new Map(
    ((rev.data ?? []) as any[]).map((r) => [r.contract_id as string, r]),
  );
  const commissionTotal = commissionContracts.reduce((a, k) => {
    const r = revOf.get(k.id);
    return a + (r ? commissionOf(num(r.revenue_ht), num(k.commission_pct)) : 0);
  }, 0);
  const tabs = TABS.map(([k, label]) => ({
    href: `/conciergerie?tab=${k}`,
    label,
    active: tab === k,
    count:
      k === "apercu" && alerts.length
        ? alerts.length
        : k === "logements"
          ? listings.length
          : null,
  }));
  const byDay = new Map<string, any[]>();
  for (const c of cleanings)
    byDay.set(c.scheduled_date, [...(byDay.get(c.scheduled_date) ?? []), c]);

  return (
    <>
      <PageHeader
        title="Conciergerie"
        subtitle="Vos logements gérés, leurs réservations, les ménages à chaque départ et votre commission : tout est ici, à part du nettoyage."
      />
      <p className="-mt-2 mb-4 text-sm">
        <Link href="/conciergerie/acces" className="font-medium text-primary hover:underline">
          Espaces conciergerie : donner un accès à une conciergerie ou à un propriétaire →
        </Link>
      </p>
      <Tabs items={tabs} />

      {tab === "apercu" && (
        <>
          <section
            aria-label="Indicateurs"
            className="grid grid-cols-2 border-t border-border sm:grid-cols-4 sm:divide-x sm:divide-border"
          >
            <Stat
              label="Logements gérés"
              value={String(listings.length)}
              href="/conciergerie?tab=logements"
              hint={`${listings.filter((l) => l.ical_url).length} avec calendrier relié`}
            />
            <Stat
              label="Ménages cette semaine"
              value={String(
                cleanings.filter((c) => c.scheduled_date <= week).length,
              )}
              href="/conciergerie?tab=planning"
              hint="aujourd'hui + 7 jours"
            />
            <Stat
              label={`Commission ${monthLabel(month).split(" ")[0]}`}
              value={`${Math.round(commissionTotal).toLocaleString("fr-FR")} €`}
              unit="HT"
              href={`/conciergerie?tab=revenus&m=${month}`}
              hint="d'après les revenus saisis"
            />
            <Stat
              label="Alertes"
              href="/conciergerie?tab=apercu"
              value={String(alerts.length)}
              tone={
                alerts.some((a) => a.tone === "err")
                  ? "err"
                  : alerts.length
                    ? "warn"
                    : undefined
              }
              hint={alerts.length ? "à regarder ci-dessous" : "rien à signaler"}
            />
          </section>
          <Card className="mt-6 overflow-hidden">
            <CardHeader>
              <CardTitle>Alertes</CardTitle>
            </CardHeader>
            <div className="py-1.5">
              {!alerts.length ? (
                <Empty>Rien à signaler : tout est à jour.</Empty>
              ) : (
                alerts.map((a) => (
                  <Row
                    key={a.key}
                    href={a.href}
                    title={a.text}
                    dot={DOT[a.tone]}
                    lead=""
                  />
                ))
              )}
            </div>
          </Card>
          <Card className="mt-4 overflow-hidden">
            <CardHeader>
              <CardTitle>Prochains ménages</CardTitle>
              <Link
                href="/conciergerie?tab=planning"
                className="text-xs font-medium text-primary hover:underline"
              >
                Tout le planning
              </Link>
            </CardHeader>
            <div className="py-1.5">
              {!cleanings.length ? (
                <Empty icon={CalendarClock}>
                  Aucun ménage prévu. Reliez le calendrier d&apos;un logement
                  pour les créer automatiquement.
                </Empty>
              ) : (
                cleanings
                  .slice(0, 6)
                  .map((c) => (
                    <Row
                      key={c.id}
                      href="/missions"
                      lead={formatDate(c.scheduled_date)}
                      title={String(c.title).replace(/^Ménage — /, "")}
                      sub={`${c.clients?.name ?? ""}${c.start_time ? ` · ${String(c.start_time).slice(0, 5)}` : ""}`}
                      right={
                        c.staff?.full_name ??
                        c.assignee ?? <Badge tone="red">sans agent</Badge>
                      }
                    />
                  ))
              )}
            </div>
          </Card>
        </>
      )}

      {tab === "planning" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <form action={runAllAction}>
              <Button size="sm" variant="outline">
                <RefreshCw className="mr-1.5 h-4 w-4" /> Synchroniser maintenant
              </Button>
            </form>
            <span className="text-xs text-muted-foreground">
              Les 30 prochains jours. Les ménages sont créés à chaque départ ;
              l&apos;agent habituel du logement est affecté.
            </span>
          </div>
          {!byDay.size ? (
            <Card>
              <Empty icon={CalendarClock}>
                Aucun ménage dans les 30 prochains jours.
              </Empty>
            </Card>
          ) : (
            [...byDay].map(([d, items]) => (
              <Card key={d} className="mb-3 overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    {new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {items.length} ménage{items.length > 1 ? "s" : ""}
                  </span>
                </CardHeader>
                <div className="py-1">
                  {items.map((c) => (
                    <Row
                      key={c.id}
                      href="/missions"
                      lead={
                        c.start_time ? String(c.start_time).slice(0, 5) : "—"
                      }
                      title={String(c.title).replace(/^Ménage — /, "")}
                      sub={c.clients?.name}
                      right={
                        c.staff?.full_name ??
                        c.assignee ?? <Badge tone="red">sans agent</Badge>
                      }
                      dot={/même jour/.test(c.title) ? "warn" : undefined}
                    />
                  ))}
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {tab === "calendrier" && (() => {
        const all = ((stays.data ?? []) as Stay[]);
        const days = 30;
        return (
          <>
            <Card className="overflow-x-auto">
              <CardContent className="min-w-[760px] p-4">
                {!listings.length ? <Empty icon={KeyRound}>Aucun logement : ajoutez-en un pour voir son occupation.</Empty> : (
                  <div className="space-y-3">
                    <div className="grid items-end gap-px text-center text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `200px repeat(${days}, minmax(0, 1fr))` }}>
                      <span />
                      {Array.from({ length: days }, (_, k) => { const d = addDays(today, k); return <span key={d} className={d === today ? "font-bold text-foreground" : ""}>{Number(d.slice(8))}</span>; })}
                    </div>
                    {listings.map((l) => {
                      const mine = all.filter((x) => x.listing_id === l.id);
                      const cells = occupancyDays(mine, today, days);
                      const next30 = occupancy(mine, today, 30), last30 = occupancy(mine, addDays(today, -30), 30);
                      return (
                        <div key={l.id} className="grid items-center gap-px" style={{ gridTemplateColumns: `200px repeat(${days}, minmax(0, 1fr))` }}>
                          <div className="pr-3"><div className="truncate text-sm font-medium text-foreground">{l.name}</div>
                            <div className="text-[11px] text-muted-foreground">{l.ical_url ? `${next30.pct} % à venir · ${last30.pct} % passé` : "sans calendrier"}</div></div>
                          {cells.map((c) => (
                            <span key={c.date} title={`${formatDate(c.date)} · ${c.busy ? "occupé" : "libre"}${c.in ? " · arrivée" : ""}${c.out ? " · départ (ménage)" : ""}`}
                              className={`h-7 rounded-[3px] ${c.busy ? "bg-[#2b4c7e]" : "bg-secondary"} ${c.out ? "border-l-2 border-[#c98a2b]" : ""} ${c.date === today ? "ring-1 ring-foreground/60" : ""}`} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="mt-3 flex flex-wrap gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 rounded-sm bg-[#2b4c7e]" /> nuit occupée</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 rounded-sm bg-secondary" /> libre</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 border-l-2 border-[#c98a2b] bg-secondary" /> départ : ménage</span>
            </div>
            {listings.some((l) => l.ical_url) && (
              <Card className="mt-4 overflow-hidden">
                <CardHeader><CardTitle>Statistiques par logement</CardTitle><span className="text-xs text-muted-foreground">30 jours à venir</span></CardHeader>
                <div className="divide-y">
                  {listings.filter((l) => l.ical_url).map((l) => { const o = occupancy(all.filter((x) => x.listing_id === l.id), today, 30); return (
                    <div key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-3 text-sm">
                      <span className="min-w-0 flex-1 font-medium">{l.name}</span>
                      <span><b className="num font-semibold">{o.pct} %</b> <span className="text-muted-foreground">d&apos;occupation ({o.nights} nuits)</span></span>
                      <span><b className="num font-semibold">{o.stays}</b> <span className="text-muted-foreground">séjour{o.stays > 1 ? "s" : ""}</span></span>
                      <span className="text-muted-foreground">{o.avgNights != null ? `${o.avgNights} nuits en moyenne` : "aucun séjour"}</span>
                    </div>
                  ); })}
                </div>
              </Card>
            )}
            <p className="mt-4 text-xs text-muted-foreground">La frise vient des calendriers reliés : elle montre les dates occupées, pas les voyageurs ni les montants. Sans lien officiel avec les plateformes, elle ne remplace pas la protection contre les doubles réservations d&apos;un gestionnaire de canaux.</p>
          </>
        );
      })()}

      {tab === "logements" && (
        <>
          <Card className="mb-4 overflow-hidden">
            {!listings.length ? (
              <Empty icon={KeyRound}>
                Aucun logement. Ajoutez le premier ci-dessous avec son lien
                calendrier.
              </Empty>
            ) : (
              <div className="divide-y">
                {listings.map((l) => (
                  <details key={l.id} className="group px-5 py-3">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground">
                          {l.name}{" "}
                          <Link
                            href={`/conciergerie/reference/${l.id}`}
                            className="ml-2 text-xs font-medium text-primary hover:underline"
                          >
                            {l.ref_guide ? "Référence IA ✔" : "Ajouter la référence IA"}
                          </Link>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {l.clients?.name} ·{" "}
                          {PLATFORMS[l.platform as keyof typeof PLATFORMS]}
                          {l.cleaning_price_ht != null
                            ? ` · ménage ${formatEUR(num(l.cleaning_price_ht))} HT`
                            : ""}
                          {l.cleaning_hours
                            ? ` · ${num(l.cleaning_hours)} h`
                            : ""}
                        </div>
                      </div>
                      {!l.ical_url ? (
                        <Badge tone="gray">Sans calendrier</Badge>
                      ) : l.last_sync_error ? (
                        <Badge tone="red">Erreur de synchro</Badge>
                      ) : (
                        <Badge tone="green">
                          Synchronisé {when(l.last_sync_at)}
                        </Badge>
                      )}
                    </summary>
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {l.last_sync_error && (
                        <p className="rounded-lg bg-[#f6e4e1] px-3 py-2 text-sm text-[#7d261d]">
                          {l.last_sync_error}
                        </p>
                      )}
                      <ListingForm
                        l={l}
                        clients={clientOpts}
                        contracts={contractOpts}
                        staff={staffOpts}
                        action={saveListingAction.bind(null, l.id)}
                      />
                      <div className="flex flex-wrap gap-3">
                        {l.ical_url && (
                          <form action={syncListingNowAction.bind(null, l.id)}>
                            <Button size="sm" variant="outline">
                              <RefreshCw className="mr-1.5 h-4 w-4" />{" "}
                              Synchroniser ce logement
                            </Button>
                          </form>
                        )}
                        <ConfirmAction
                          action={deleteListingAction.bind(null, l.id)}
                          label="Supprimer"
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          title={`Supprimer « ${l.name} » ?`}
                          description="Le logement et ses réservations importées sont supprimés ; ses ménages à venir non commencés sont annulés. Définitif."
                          confirmLabel="Oui, supprimer"
                        />
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </Card>
          <details
            className="rounded-xl border bg-card"
            open={!listings.length}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-[14px] font-semibold text-primary">
              <Plus className="h-4 w-4" /> Ajouter un logement
            </summary>
            <CardContent className="border-t pt-4">
              <ListingForm
                clients={clientOpts}
                contracts={contractOpts}
                staff={staffOpts}
                action={saveListingAction.bind(null, null)}
              />
            </CardContent>
          </details>
          <p className="mt-4 text-xs text-muted-foreground">
            Le lien calendrier ne contient que les dates des séjours : ni nom de
            voyageur, ni téléphone, ni montant. Les liens acceptés viennent
            d&apos;Airbnb, Booking, Abritel/Vrbo, Google Agenda ou d&apos;un
            logiciel de gestion courant, en https.
          </p>
        </>
      )}

      {tab === "revenus" && (
        <>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <Link
              href={`/conciergerie?tab=revenus&m=${shift(month, -1)}`}
              className="text-primary hover:underline"
            >
              ← {monthLabel(shift(month, -1))}
            </Link>
            <b className="font-semibold text-foreground">{monthLabel(month)}</b>
            <Link
              href={`/conciergerie?tab=revenus&m=${shift(month, 1)}`}
              className="text-primary hover:underline"
            >
              {monthLabel(shift(month, 1))} →
            </Link>
          </div>
          <Card className="overflow-hidden">
            {!commissionContracts.length ? (
              <Empty icon={KeyRound}>
                Aucune commission à suivre. Dans l&apos;onglet{" "}
                <Link href="/conciergerie?tab=logements" className="text-primary underline">Logements</Link>,
                ajoutez un logement en indiquant votre commission en % : le contrat est créé pour vous.
              </Empty>
            ) : (
              <div className="divide-y">
                {commissionContracts.map((k) => {
                  const r = revOf.get(k.id),
                    pct = num(k.commission_pct),
                    com = r ? commissionOf(num(r.revenue_ht), pct) : null;
                  return (
                    <div
                      key={k.id}
                      className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground">
                          {k.clients?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {k.label} · commission {pct} % ·{" "}
                          <Link href={`/conciergerie/releve?client=${k.client_id}&m=${month}`} className="text-primary hover:underline">Relevé propriétaire</Link>
                        </div>
                      </div>
                      <form
                        action={saveRevenueAction.bind(null, k.id, month)}
                        className="flex items-center gap-2"
                      >
                        <label
                          className="text-xs text-muted-foreground"
                          htmlFor={`r-${k.id}`}
                        >
                          Revenus locatifs (€ HT)
                        </label>
                        <Input
                          id={`r-${k.id}`}
                          name="revenue_ht"
                          inputMode="decimal"
                          defaultValue={r?.revenue_ht ?? ""}
                          disabled={!!r?.invoice_id}
                          className="h-9 w-32 py-1"
                        />
                        {!r?.invoice_id && (
                          <Button size="sm" variant="outline">
                            OK
                          </Button>
                        )}
                      </form>
                      <div className="w-36 text-right text-sm">
                        {com == null ? (
                          <span className="text-muted-foreground">
                            à saisir
                          </span>
                        ) : (
                          <>
                            <b className="font-semibold text-foreground">
                              {formatEUR(com)}
                            </b>{" "}
                            <span className="text-xs text-muted-foreground">
                              HT
                            </span>
                          </>
                        )}
                      </div>
                      <div className="w-44 text-right">
                        {r?.invoice_id ? (
                          <Link
                            href={`/factures/${r.invoice_id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            Voir la facture
                          </Link>
                        ) : com != null && com > 0 ? (
                          <form
                            action={createCommissionDraftAction.bind(
                              null,
                              k.id,
                              month,
                            )}
                          >
                            <Button size="sm">Créer le brouillon</Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          <p className="mt-4 text-xs text-muted-foreground">
            Les calendriers des plateformes ne donnent pas les montants :
            saisissez les revenus du mois depuis le relevé de la plateforme. La
            facture de commission est toujours un brouillon que vous validez.
          </p>
        </>
      )}

      {tab === "automatisations" && (
        <>
          <div className="space-y-3">
            {(
              [
                [
                  "menages",
                  "Ménages à chaque départ",
                  "Le CRM relit chaque jour (18 h) le calendrier de chaque logement, ajoute les nouvelles réservations, déplace le ménage si les dates changent et l'annule si le séjour disparaît. Le ménage est créé à l'heure de départ, avec l'agent habituel, et signalé quand un voyageur arrive le même jour. Un ménage déjà commencé n'est jamais modifié.",
                ],
                [
                  "facturation",
                  "Facturation et commission",
                  "Les ménages et leur prix alimentent la facturation mensuelle automatique que vous avez déjà. En début de mois (jours 1 à 10), si vous avez saisi les revenus locatifs, le brouillon de la facture de commission est préparé. Rien n'est envoyé : vous validez toujours.",
                ],
                [
                  "messages",
                  "Messages aux propriétaires",
                  "Après chaque ménage terminé, un compte rendu est rédigé ; en début de mois, un récapitulatif. Ils arrivent dans les propositions à valider : rien ne part sans votre accord. Les voyageurs ne sont pas contactés : les plateformes ne donnent pas leurs coordonnées.",
                ],
              ] as const
            ).map(([key, title, text]) => (
              <Card key={key}>
                <CardContent className="flex flex-wrap items-start gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-semibold text-foreground">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm text-secondary-foreground">
                      {text}
                    </p>
                  </div>
                  <form
                    action={toggleAutomationAction.bind(
                      null,
                      key,
                      !enabled.get(key),
                    )}
                    className="flex items-center gap-3"
                  >
                    <Badge tone={enabled.get(key) ? "green" : "gray"}>
                      {enabled.get(key) ? "Activée" : "Désactivée"}
                    </Badge>
                    <Button size="sm" variant="outline">
                      {enabled.get(key) ? "Désactiver" : "Activer"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={runAllAction}>
              <Button size="sm">
                <RefreshCw className="mr-1.5 h-4 w-4" /> Tout exécuter
                maintenant
              </Button>
            </form>
            <span className="text-xs text-muted-foreground">
              Lance la synchronisation et les automatisations activées, sans
              attendre 18 h.
            </span>
          </div>
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "bg-[#e6f1ea] text-[#1f5a3d]" : "bg-[#f7ecdb] text-[#6b4510]"}`}>
            {process.env.SUPABASE_SERVICE_ROLE_KEY ? (
              <><b className="font-medium">Exécution quotidienne automatique : active.</b> Chaque jour à 18 h, le CRM synchronise les calendriers et lance les automatisations activées.</>
            ) : (
              <><b className="font-medium">Exécution quotidienne automatique : pas encore active.</b> Il manque la clé de service Supabase sur Vercel (variable <code>SUPABASE_SERVICE_ROLE_KEY</code>, valeur dans Supabase › Project Settings › API › service_role). En attendant, cliquez sur « Tout exécuter maintenant » : tout fonctionne à la demande.</>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Les plateformes mettent leur calendrier à jour toutes les quelques
            heures : une réservation très récente peut apparaître avec un léger
            retard.
          </p>
        </>
      )}
    </>
  );
}

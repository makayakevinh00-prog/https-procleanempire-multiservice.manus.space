import { MONTH_NAMES } from "@/lib/prix";

export type Listing = {
  id: string;
  name: string;
  client_id: string;
  contract_id: string | null;
  site_id: string | null;
  checkout_time: string;
  cleaning_hours: number | null;
  cleaning_price_ht: number | null;
  staff_id: string | null;
  auto_cleaning: boolean;
};
export type Stay = {
  id: string;
  listing_id: string;
  check_in: string;
  check_out: string;
  cancelled: boolean;
  intervention_id: string | null;
};
export type Desired = {
  sourceKey: string;
  stayId: string;
  date: string;
  time: string;
  urgent: boolean;
  title: string;
};

export const addDays = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5)
    .toISOString()
    .slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Une autre arrivée le jour même du départ : le ménage doit être fait vite. */
export const sameDayArrival = (stay: Stay, all: Stay[]) =>
  all.some(
    (s) =>
      s.id !== stay.id &&
      s.listing_id === stay.listing_id &&
      !s.cancelled &&
      s.check_in === stay.check_out,
  );

/** Un ménage à chaque départ des 60 prochains jours (par défaut), à l'heure de départ du logement. */
export function desiredCleanings(
  listing: Listing,
  stays: Stay[],
  today: string,
  horizonDays = 60,
): Desired[] {
  const mine = stays.filter((s) => s.listing_id === listing.id);
  const limit = addDays(today, horizonDays);
  return mine
    .filter((s) => !s.cancelled && s.check_out >= today && s.check_out <= limit)
    .sort((a, b) => a.check_out.localeCompare(b.check_out))
    .map((s) => {
      const urgent = sameDayArrival(s, mine);
      return {
        sourceKey: `conc:${s.id}`,
        stayId: s.id,
        date: s.check_out,
        time: listing.checkout_time.slice(0, 5),
        urgent,
        title: `Ménage — ${listing.name}${urgent ? " (arrivée le même jour)" : ""}`,
      };
    });
}

export const commissionOf = (revenueHt: number, pct: number) =>
  round2((revenueHt * pct) / 100);
export const monthLabel = (m: string) =>
  `${MONTH_NAMES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const frDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** Messages au propriétaire : rédigés d'avance, jamais envoyés sans votre validation. */
export function cleaningMessage(listingName: string, dateIso: string) {
  return {
    subject: `Ménage effectué — ${listingName}`,
    body: `Bonjour,\n\nNous vous confirmons que le ménage de « ${listingName} » a été effectué le ${frDate(dateIso)}. Le logement est prêt pour les prochains voyageurs.\n\nSi vous souhaitez un point particulier ou une prestation en plus (linge, remise en état), dites-le-nous.\n\nCordialement,\nProClean Empire`,
  };
}
export function recapMessage(
  month: string,
  cleanings: number,
  listingNames: string[],
  commission: number | null,
) {
  const names =
    listingNames.length > 1
      ? `vos ${listingNames.length} logements (${listingNames.join(", ")})`
      : `« ${listingNames[0]} »`;
  return {
    subject: `Récapitulatif de ${monthLabel(month)}`,
    body: `Bonjour,\n\nVoici le récapitulatif de ${monthLabel(month)} pour ${names} : ${cleanings} ménage${cleanings > 1 ? "s" : ""} réalisé${cleanings > 1 ? "s" : ""}.${commission != null ? ` La commission de gestion du mois s'élève à ${commission.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT.` : ""}\n\nNous restons à votre disposition.\n\nCordialement,\nProClean Empire`,
  };
}

export type Alert = {
  key: string;
  tone: "err" | "warn" | "info";
  text: string;
  href?: string;
};

/** Alertes de la conciergerie, calculées en direct avec les vrais chiffres. */
export function buildAlerts(i: {
  today: string;
  cleanings: { date: string; staff: boolean }[]; // ménages des 7 prochains jours
  departuresTomorrow: number;
  listings: {
    name: string;
    hasUrl: boolean;
    lastSyncAt: string | null;
    lastSyncError: string | null;
    price: number | null;
  }[];
  idleOwners: { name: string; days: number }[];
}): Alert[] {
  const out: Alert[] = [];
  const noStaff = i.cleanings.filter((c) => !c.staff).length;
  if (noStaff)
    out.push({
      key: "sans-agent",
      tone: "err",
      text: `${noStaff} ménage${noStaff > 1 ? "s" : ""} des 7 prochains jours sans agent`,
      href: "/conciergerie?tab=planning",
    });
  if (i.departuresTomorrow)
    out.push({
      key: "demain",
      tone: "warn",
      text: `${i.departuresTomorrow} départ${i.departuresTomorrow > 1 ? "s" : ""} demain : ménage à confirmer`,
      href: "/conciergerie?tab=planning",
    });
  for (const l of i.listings) {
    if (!l.hasUrl)
      out.push({
        key: `lien-${l.name}`,
        tone: "info",
        text: `« ${l.name} » n'a pas de lien calendrier : aucune réservation importée`,
        href: "/conciergerie?tab=logements",
      });
    else if (l.lastSyncError)
      out.push({
        key: `err-${l.name}`,
        tone: "err",
        text: `« ${l.name} » : synchronisation en erreur (${l.lastSyncError})`,
        href: "/conciergerie?tab=logements",
      });
    else if (
      !l.lastSyncAt ||
      Date.parse(`${i.today}T12:00:00Z`) - Date.parse(l.lastSyncAt) >
        36 * 3600e3
    )
      out.push({
        key: `old-${l.name}`,
        tone: "warn",
        text: `« ${l.name} » n'a pas été synchronisé depuis plus d'un jour`,
        href: "/conciergerie?tab=logements",
      });
    if (l.price == null)
      out.push({
        key: `prix-${l.name}`,
        tone: "warn",
        text: `« ${l.name} » : prix du ménage non renseigné, ses ménages ne seront pas facturables`,
        href: "/conciergerie?tab=logements",
      });
  }
  const linge = i.cleanings.length;
  if (linge)
    out.push({
      key: "linge",
      tone: "info",
      text: `${linge} ménage${linge > 1 ? "s" : ""} cette semaine : prévoyez le linge et les consommables`,
      href: "/conciergerie?tab=planning",
    });
  for (const o of i.idleOwners)
    out.push({
      key: `idle-${o.name}`,
      tone: "info",
      text: `${o.name} : aucune nouvelle depuis ${o.days} jours`,
      href: "/clients",
    });
  const rank = { err: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export type ExistingCleaning = { id: string; source_key: string; scheduled_date: string; start_time: string | null; stage: string | null; title: string };
export const PLANNED_STAGES = ["brouillon", "planifiee", "affectee"];

/**
 * Compare les ménages voulus (un par départ) aux ménages déjà au planning :
 * à créer, à déplacer (seulement tant qu'ils ne sont pas commencés), à annuler (séjour supprimé de la plateforme).
 */
export function diffCleanings(existing: ExistingCleaning[], desired: Desired[], cancelledKeys: string[]) {
  const byKey = new Map(existing.map((e) => [e.source_key, e]));
  const insert: Desired[] = [];
  const update: { id: string; patch: { scheduled_date: string; start_time: string; title: string } }[] = [];
  for (const d of desired) {
    const e = byKey.get(d.sourceKey);
    if (!e) { insert.push(d); continue; }
    const planned = PLANNED_STAGES.includes(e.stage ?? "planifiee");
    if (planned && (e.scheduled_date !== d.date || (e.start_time ?? "").slice(0, 5) !== d.time || e.title !== d.title)) update.push({ id: e.id, patch: { scheduled_date: d.date, start_time: d.time, title: d.title } });
  }
  const cancel = cancelledKeys.map((k) => byKey.get(k)).filter((e): e is ExistingCleaning => !!e && PLANNED_STAGES.includes(e.stage ?? "planifiee")).map((e) => e.id);
  return { insert, update, cancel };
}

const nightsBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);

/** Nuits occupées d'un séjour dans la période [from, to[ : l'arrivée compte, le départ non. */
export function nightsIn(stay: { check_in: string; check_out: string }, from: string, to: string): number {
  const a = stay.check_in > from ? stay.check_in : from, b = stay.check_out < to ? stay.check_out : to;
  return Math.max(nightsBetween(a, b), 0);
}

/** Occupation d'un logement sur `days` jours à partir de `from` : nuits occupées, taux, nombre de séjours et durée moyenne. */
export function occupancy(stays: Stay[], from: string, days: number) {
  const to = addDays(from, days), live = stays.filter((s) => !s.cancelled);
  const nights = live.reduce((t, s) => t + nightsIn(s, from, to), 0);
  const inRange = live.filter((s) => nightsIn(s, from, to) > 0);
  const avg = inRange.length ? Math.round((inRange.reduce((t, s) => t + nightsBetween(s.check_in, s.check_out), 0) / inRange.length) * 10) / 10 : null;
  return { nights, days, pct: Math.round((nights / days) * 1000) / 10, stays: inRange.length, avgNights: avg };
}

/** Une case par jour pour la frise : logement occupé cette nuit-là, départ ou arrivée ce jour-là. */
export function occupancyDays(stays: Stay[], from: string, days: number) {
  const live = stays.filter((s) => !s.cancelled);
  return Array.from({ length: days }, (_, k) => {
    const d = addDays(from, k);
    return { date: d, busy: live.some((s) => s.check_in <= d && d < s.check_out), out: live.some((s) => s.check_out === d && s.check_out > s.check_in), in: live.some((s) => s.check_in === d && s.check_out > s.check_in) };
  });
}

/** Relevé propriétaire : revenus, commission, ménages réalisés ; le reste à verser suppose les ménages à la charge du propriétaire. */
export function statement(revenues: { revenue: number; pct: number }[], cleanings: { count: number; amount: number }) {
  const revenue = round2(revenues.reduce((t, r) => t + r.revenue, 0));
  const commission = round2(revenues.reduce((t, r) => t + commissionOf(r.revenue, r.pct), 0));
  return { revenue, commission, cleanings: cleanings.count, cleaningsAmount: round2(cleanings.amount), net: round2(revenue - commission - cleanings.amount) };
}

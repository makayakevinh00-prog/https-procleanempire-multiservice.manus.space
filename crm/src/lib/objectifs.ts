export type GoalKind =
  | "ca_facture"
  | "encaisse"
  | "nouveaux_clients"
  | "devis_envoyes";
export type Status = "atteint" | "rythme" | "surveiller" | "retard";

export const GOAL_ORDER: GoalKind[] = [
  "ca_facture",
  "encaisse",
  "nouveaux_clients",
  "devis_envoyes",
];
export const GOALS: Record<
  GoalKind,
  { label: string; money: boolean; hint: string }
> = {
  ca_facture: {
    label: "CA facturé (HT)",
    money: true,
    hint: "Factures émises dans le mois. La prévision ajoute les brouillons, les devis acceptés à facturer et les contrats pas encore facturés.",
  },
  encaisse: {
    label: "Encaissé (TTC)",
    money: true,
    hint: "Virements reçus sur le compte dans le mois.",
  },
  nouveaux_clients: {
    label: "Nouveaux clients",
    money: false,
    hint: "Fiches clients créées dans le mois.",
  },
  devis_envoyes: {
    label: "Devis envoyés",
    money: false,
    hint: "Devis envoyés aux clients dans le mois.",
  },
};
export const STATUS_LABEL: Record<Status, string> = {
  atteint: "Atteint",
  rythme: "Dans le rythme",
  surveiller: "À surveiller",
  retard: "En retard",
};

export const isMonth = (m: unknown): m is string =>
  typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

/** Où en est le mois à la date donnée (AAAA-MM-JJ) : jour, nombre de jours, part écoulée. */
export function pace(todayIso: string) {
  const [y, m, d] = todayIso.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { month: todayIso.slice(0, 7), day: d, days, elapsed: d / days };
}

export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * Statut d'un objectif au rythme linéaire : atteint, ou comparé à ce qu'on devrait avoir aujourd'hui.
 * Les trois premiers jours du mois ne donnent jamais d'alerte (trop tôt pour juger).
 */
export function paceStatus(
  value: number,
  target: number,
  elapsed: number,
): Status {
  if (value >= target) return "atteint";
  const expected = target * elapsed;
  if (elapsed < 0.1 || expected <= 0) return "rythme";
  const r = value / expected;
  return r >= 0.9 ? "rythme" : r >= 0.6 ? "surveiller" : "retard";
}

/**
 * CA facturé : la facturation part en fin de mois, un rythme linéaire serait trompeur.
 * On juge donc la prévision de fin de mois (facturé + brouillons + devis acceptés + contrats à facturer).
 */
export function forecastStatus(
  billed: number,
  forecast: number,
  target: number,
): Status {
  if (billed >= target) return "atteint";
  if (forecast >= target) return "rythme";
  return forecast / target >= 0.8 ? "surveiller" : "retard";
}

export type Lever = {
  key: string;
  label: string;
  count: number;
  amount: number | null;
  href: string;
  note: string;
};
type Bucket = { n: number; amount: number };

/** Leviers concrets pour atteindre le mois, calculés avec les vrais chiffres ; ceux qui valent le plus d'abord, les vides sont écartés. */
export function buildLevers(i: {
  drafts: Bucket;
  acceptedToInvoice: Bucket;
  unbilledContracts: Bucket;
  sentQuotes: Bucket;
  late: Bucket;
  unmatched: number;
  prospects: number;
  requests: number;
}): Lever[] {
  const all: Lever[] = [
    {
      key: "brouillons",
      label: "Factures brouillon à valider",
      count: i.drafts.n,
      amount: i.drafts.amount,
      href: "/factures?statut=brouillon",
      note: "HT, à relire puis envoyer",
    },
    {
      key: "devis_acceptes",
      label: "Devis acceptés à facturer",
      count: i.acceptedToInvoice.n,
      amount: i.acceptedToInvoice.amount,
      href: "/devis",
      note: "HT, déjà gagnés",
    },
    {
      key: "contrats",
      label: "Contrats actifs pas encore facturés ce mois",
      count: i.unbilledContracts.n,
      amount: i.unbilledContracts.amount,
      href: "/facturation-auto",
      note: "HT, facturation de fin de mois",
    },
    {
      key: "devis_envoyes",
      label: "Devis envoyés en attente de réponse",
      count: i.sentQuotes.n,
      amount: i.sentQuotes.amount,
      href: "/devis",
      note: "HT, à relancer",
    },
    {
      key: "retard",
      label: "Factures en retard à relancer",
      count: i.late.n,
      amount: i.late.amount,
      href: "/factures?statut=en_retard",
      note: "TTC, de la trésorerie immédiate",
    },
    {
      key: "paiements",
      label: "Virements à rapprocher",
      count: i.unmatched,
      amount: null,
      href: "/paiements",
      note: "pour que l'encaissé soit juste",
    },
    {
      key: "demandes",
      label: "Demandes du site à traiter",
      count: i.requests,
      amount: null,
      href: "/demandes",
      note: "de nouveaux clients possibles",
    },
    {
      key: "prospects",
      label: "Prospects à relancer",
      count: i.prospects,
      amount: null,
      href: "/clients",
      note: "à convertir en clients",
    },
  ];
  return all
    .filter((l) => l.count > 0)
    .sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1) || b.count - a.count);
}

export type PlanStep = { key: string; title: string; why: string; names: string[]; amount: number | null; href: string; cta: string; gain: number };

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
const list = (names: string[], total: number) => (names.length ? names.slice(0, 3).join(", ") + (total > 3 ? ` et ${total - 3} autre${total - 3 > 1 ? "s" : ""}` : "") : "");

/**
 * Plan d'action calculé tout de suite avec les vrais chiffres (aucune attente) : des étapes claires, les plus rentables d'abord,
 * avec les clients concernés et ce que chaque étape apporte au chiffre du mois. `gain` = montant HT qui s'ajoute au CA facturé si l'étape aboutit (0 si elle ne change pas le CA).
 */
export function buildPlan(i: {
  drafts: Bucket & { names: string[] };
  accepted: Bucket & { names: string[] };
  unbilled: Bucket & { names: string[] };
  pending: Bucket & { names: string[] };
  late: Bucket & { names: string[] };
  unmatched: number;
  requests: number;
  prospects: number;
}): PlanStep[] {
  const steps: PlanStep[] = [];
  const add = (s: PlanStep | null) => s && steps.push(s);
  if (i.drafts.n) add({ key: "brouillons", title: `Validez et envoyez ${i.drafts.n} facture${plural(i.drafts.n, "", "s")} brouillon`, why: "Elles sont prêtes mais pas encore facturées : c'est du chiffre immédiat.", names: i.drafts.names, amount: i.drafts.amount, href: "/factures?statut=brouillon", cta: "Voir les brouillons", gain: i.drafts.amount });
  if (i.accepted.n) add({ key: "devis_acceptes", title: `Facturez ${i.accepted.n} devis accepté${plural(i.accepted.n, "", "s")}`, why: "Le client a dit oui, il reste à émettre la facture.", names: i.accepted.names, amount: i.accepted.amount, href: "/devis", cta: "Voir les devis", gain: i.accepted.amount });
  if (i.unbilled.n) add({ key: "contrats", title: `Lancez la facturation de ${i.unbilled.n} contrat${plural(i.unbilled.n, "", "s")} actif${plural(i.unbilled.n, "", "s")} pas encore facturé${plural(i.unbilled.n, "", "s")} ce mois`, why: "Contrats récurrents : la facture du mois n'est pas partie.", names: i.unbilled.names, amount: i.unbilled.amount, href: "/facturation-auto", cta: "Ouvrir la facturation", gain: i.unbilled.amount });
  if (i.late.n) add({ key: "retard", title: `Relancez ${i.late.n} facture${plural(i.late.n, "", "s")} en retard`, why: "Argent déjà facturé, à récupérer : il compte dans l'encaissé.", names: i.late.names, amount: i.late.amount, href: "/factures?statut=en_retard", cta: "Voir les retards", gain: 0 });
  if (i.pending.n) add({ key: "devis_envoyes", title: `Relancez ${i.pending.n} devis envoyé${plural(i.pending.n, "", "s")} sans réponse`, why: "Un appel ou un message transforme souvent un devis en vente.", names: i.pending.names, amount: i.pending.amount, href: "/devis", cta: "Voir les devis", gain: 0 });
  if (i.unmatched) add({ key: "paiements", title: `Rapprochez ${i.unmatched} virement${plural(i.unmatched, "", "s")} reçu${plural(i.unmatched, "", "s")}`, why: "Tant qu'ils ne sont pas reliés à une facture, l'encaissé du mois est faux.", names: [], amount: null, href: "/paiements", cta: "Rapprocher", gain: 0 });
  if (i.requests) add({ key: "demandes", title: `Répondez à ${i.requests} demande${plural(i.requests, "", "s")} reçue${plural(i.requests, "", "s")} sur le site`, why: "De nouveaux clients possibles : plus on répond vite, plus on signe.", names: [], amount: null, href: "/demandes", cta: "Voir les demandes", gain: 0 });
  if (i.prospects) add({ key: "prospects", title: `Rappelez ${i.prospects} prospect${plural(i.prospects, "", "s")}`, why: "Ils ont montré de l'intérêt mais ne sont pas encore clients.", names: [], amount: null, href: "/clients?statut=prospect", cta: "Voir les prospects", gain: 0 });
  return steps.sort((a, b) => b.gain - a.gain || (b.amount ?? -1) - (a.amount ?? -1)).slice(0, 5).map((s) => ({ ...s, why: s.why, names: s.names }));
}
export const stepNames = list;

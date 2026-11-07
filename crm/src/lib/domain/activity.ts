/**
 * Familles d'activité de ProClean Empire. Elles servent à TRIER (contrats, missions, factures) et à mesurer ce qui rapporte.
 * Une famille enregistrée par le dirigeant l'emporte toujours ; sinon elle est déduite (lecture seule, jamais enregistrée sans clic).
 */
export const ACTIVITIES = [
  { key: "nettoyage_airbnb", label: "Nettoyage Airbnb", short: "Airbnb", hint: "Ménage et rotations de logements en courte durée", tone: "bg-[#e8edf5] text-[#2b4c7e]" },
  { key: "nettoyage_pro", label: "Bureaux & commerces", short: "Bureaux", hint: "Entretien régulier de locaux professionnels et de commerces", tone: "bg-[#e6f1ea] text-[#2f7a55]" },
  { key: "gestion_locative", label: "Gestion locative", short: "Gestion", hint: "Gestion de séjours Airbnb, Abritel, Booking", tone: "bg-[#efe7f3] text-[#6b3f86]" },
  { key: "ponctuel", label: "Prestations ponctuelles", short: "Ponctuel", hint: "Interventions uniques, sans contrat récurrent", tone: "bg-[#f7ecdb] text-[#8f5a12]" }
] as const;
export type Activity = (typeof ACTIVITIES)[number]["key"];
export const ACTIVITY_KEYS: Activity[] = ACTIVITIES.map((a) => a.key);
export const ACTIVITY = Object.fromEntries(ACTIVITIES.map((a) => [a.key, a])) as Record<Activity, (typeof ACTIVITIES)[number]>;
export const isActivity = (v: unknown): v is Activity => typeof v === "string" && (ACTIVITY_KEYS as string[]).includes(v);

const GESTION = /gestion (locative|de s[ée]jours?|s[ée]jours?)|abritel|booking|bookoo|gestion airbnb|gestion de locations?/i;
const AIRBNB = /airbnb|rotation|logement|meubl|linge|location (courte|saisonni)|sortie de clients?|d[ée]part (des )?voyageurs?|check.?out|conciergerie/i;

/** Famille probable d'après les mots du titre, du contrat et du client. `hasContract` : une prestation sans contrat récurrent est « ponctuelle ». */
export function guessActivity(x: { title?: string | null; label?: string | null; terms?: string | null; clientName?: string | null; hasContract: boolean }): Activity {
  const t = `${x.title ?? ""} ${x.label ?? ""} ${x.terms ?? ""}`;
  if (GESTION.test(t)) return "gestion_locative";
  if (AIRBNB.test(`${t} ${x.clientName ?? ""}`)) return "nettoyage_airbnb";
  return x.hasContract ? "nettoyage_pro" : "ponctuel";
}

export interface ActivityContract { clientId: string; activity: Activity | null; label: string | null; terms: string | null; clientName: string | null; monthly: number }
/** Famille d'un contrat : celle enregistrée, sinon déduite. */
export const contractActivity = (c: ActivityContract): Activity => c.activity ?? guessActivity({ label: c.label, terms: c.terms, clientName: c.clientName, hasContract: true });

/** Famille dominante des contrats d'un client (au montant mensuel le plus élevé) : sert aux factures et devis qui n'ont pas de famille propre. */
export function clientActivityMap(contracts: ActivityContract[]): Map<string, Activity> {
  const per = new Map<string, Map<Activity, number>>();
  for (const c of contracts) {
    const m = per.get(c.clientId) ?? new Map<Activity, number>();
    const a = contractActivity(c); m.set(a, (m.get(a) ?? 0) + Math.max(c.monthly, 1)); per.set(c.clientId, m);
  }
  return new Map([...per].map(([id, m]) => [id, [...m].sort((a, b) => b[1] - a[1])[0][0]]));
}

/** Famille d'une facture : enregistrée, sinon celle des contrats du client, sinon « ponctuelle ». */
export const invoiceActivity = (inv: { activity: Activity | null; clientId: string }, byClient: Map<string, Activity>): Activity => inv.activity ?? byClient.get(inv.clientId) ?? "ponctuel";

/** Famille d'une mission : enregistrée, sinon celle de son contrat, sinon déduite des mots (une mission sans contrat est « ponctuelle »). */
export function missionActivity(m: { activity: Activity | null; contractId: string | null; title: string | null; clientName: string | null }, byContract: Map<string, Activity>): Activity {
  if (m.activity) return m.activity;
  if (m.contractId && byContract.has(m.contractId)) return byContract.get(m.contractId)!;
  return guessActivity({ title: m.title, clientName: m.clientName, hasContract: false });
}

/** Chiffre d'affaires par heure et marge estimée : la marge n'est qu'une ESTIMATION (heures prévues × coût horaire des Paramètres). */
export function profitability(revenueMonthly: number, weeklyHours: number, hourlyCost: number) {
  const monthlyHours = (weeklyHours * 52) / 12;
  if (!(monthlyHours > 0)) return { monthlyHours: 0, revenuePerHour: null as number | null, marginMonthly: null as number | null, marginPct: null as number | null };
  const cost = monthlyHours * hourlyCost;
  const margin = revenueMonthly - cost;
  return { monthlyHours, revenuePerHour: revenueMonthly / monthlyHours, marginMonthly: margin, marginPct: revenueMonthly > 0 ? (margin / revenueMonthly) * 100 : null };
}

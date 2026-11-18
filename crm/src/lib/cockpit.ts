import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITIES } from "@/lib/domain/activity";
import { addDays, isoWeekday } from "@/lib/domain/dates";
import { loadActivityModel } from "@/lib/activity-data";
import { pace } from "@/lib/objectifs";
import type { CockpitActivity, CockpitDay, CockpitGoal } from "@/components/crm/cockpit";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Données de l'accueil-cockpit : objectif du mois, activités signées, programme de la semaine.
 * Chaque bloc est indépendant : une table absente ou une lecture refusée laisse le bloc vide, jamais la page en erreur.
 */
export async function loadCockpit(sb: SupabaseClient, today: string, figures: { billedMonth: number; billedPrev: number; recurring: number }) {
  const p = pace(today);
  const monday = addDays(today, -(isoWeekday(today) - 1));
  const sunday = addDays(monday, 6);

  const [goalRes, model, weekRes] = await Promise.all([
    sb.from("monthly_goals").select("target").eq("month", p.month).eq("kind", "ca_facture").maybeSingle(),
    loadActivityModel(sb).catch(() => null),
    sb.from("interventions").select("id, title, scheduled_date, start_time, status, clients(name)").gte("scheduled_date", monday).lte("scheduled_date", sunday).neq("status", "annule").order("scheduled_date").order("start_time", { nullsFirst: false })
  ]);

  // Objectif : celui enregistré, sinon la même suggestion que la carte Objectifs (meilleure base connue + 5 %).
  const saved = !goalRes.error && goalRes.data?.target != null ? Number(goalRes.data.target) : null;
  const base = Math.max(figures.billedPrev, figures.recurring);
  const target = saved ?? (base > 0 ? Math.ceil((base * 1.05) / 100) * 100 : null);
  const goal: CockpitGoal = { billed: figures.billedMonth, target, suggested: saved == null, recurring: figures.recurring, monthLabel: MONTHS[Number(p.month.slice(5)) - 1], day: p.day, days: p.days };

  // Activités : contrats actifs regroupés par famille, puis par client.
  const activities: CockpitActivity[] = ACTIVITIES.map((a) => {
    const per = new Map<string, { id: string; name: string; monthly: number; contracts: number }>();
    for (const c of model?.contracts ?? []) {
      if (c.k.status !== "actif" || c.family !== a.key) continue;
      const row = per.get(c.k.client_id) ?? { id: c.k.client_id as string, name: String(c.k.clients?.name ?? "Client"), monthly: 0, contracts: 0 };
      row.monthly = round2(row.monthly + c.ac.monthly);
      row.contracts += 1;
      per.set(c.k.client_id, row);
    }
    const clients = [...per.values()].sort((x, y) => y.monthly - x.monthly);
    return { key: a.key, label: a.label, short: a.short, monthly: round2(clients.reduce((s, c) => s + c.monthly, 0)), clients };
  });

  // Semaine : du lundi au dimanche, interventions non annulées.
  const rows = weekRes.error ? [] : ((weekRes.data ?? []) as any[]);
  const week: CockpitDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return {
      date,
      weekday: WEEKDAYS[i],
      day: String(Number(date.slice(8, 10))),
      today: date === today,
      past: date < today,
      items: rows.filter((r) => r.scheduled_date === date).map((r) => ({
        id: String(r.id),
        time: r.start_time ? String(r.start_time).slice(0, 5).replace(":", "h") : null,
        title: String(r.title ?? ""),
        client: String(r.clients?.name ?? ""),
        done: r.status === "realise"
      }))
    };
  });

  return { goal, activities, week };
}

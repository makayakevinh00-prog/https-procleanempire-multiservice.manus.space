import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parisToday } from "@/lib/domain/dates";
import { loadActionsCached } from "@/lib/actions-request";
import { menuCountsFrom } from "@/lib/actions";

export const dynamic = "force-dynamic";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} euros`;
type Item = { id: string; label: string; value: string; say: string; href: string; tone: "ok" | "warn" | "err" | "info" };

/** Briefing de Jarvis : l'essentiel du jour, lisible à l'écran et à voix haute. Lecture seule, droits du patron. */
export async function GET() {
  const sb = createClient(), today = parisToday();
  const [{ data: missions }, { data: open }, { count: unread }] = await Promise.all([
    sb.from("interventions").select("id, title, start_time, stage, staff_id, clients(name)").eq("scheduled_date", today).neq("stage", "annulee").order("start_time"),
    sb.from("invoices").select("id, status, total_ttc, due_date").in("status", ["envoye", "en_retard"]),
    sb.from("team_messages").select("id", { count: "exact", head: true }).eq("from_owner", false).is("read_at", null)
  ]);
  let actions = 0;
  try { actions = menuCountsFrom(await loadActionsCached())["/actions"] ?? 0; } catch { /* sans pastille */ }
  const m = (missions ?? []) as any[], inv = (open ?? []) as any[];
  const late = inv.filter((i) => i.status === "en_retard" || (i.due_date && i.due_date < today));
  const owed = inv.reduce((t, i) => t + Number(i.total_ttc ?? 0), 0), lateSum = late.reduce((t, i) => t + Number(i.total_ttc ?? 0), 0);
  const unassigned = m.filter((x) => !x.staff_id).length;
  const items: Item[] = [
    { id: "missions", label: "Missions aujourd'hui", value: String(m.length), href: `/missions?vue=jour&date=${today}`, tone: unassigned ? "warn" : "ok",
      say: m.length ? `Vous avez ${m.length} mission${m.length > 1 ? "s" : ""} aujourd'hui${m[0]?.start_time ? `, la première à ${String(m[0].start_time).slice(0, 2)} heures ${String(m[0].start_time).slice(3, 5)}` : ""}${m[0]?.clients?.name ? ` chez ${m[0].clients.name}` : ""}.${unassigned ? ` ${unassigned} sans intervenant.` : ""}` : "Aucune mission aujourd'hui." },
    { id: "factures", label: "Factures à encaisser", value: eur(owed).replace(" euros", " €"), href: "/factures", tone: late.length ? "err" : "info",
      say: inv.length ? `${inv.length} facture${inv.length > 1 ? "s" : ""} en attente, soit ${eur(owed)}.${late.length ? ` Dont ${late.length} en retard pour ${eur(lateSum)}.` : ""}` : "Aucune facture en attente de paiement." },
    { id: "actions", label: "Actions à faire", value: String(actions), href: "/actions", tone: actions ? "warn" : "ok", say: actions ? `${actions} action${actions > 1 ? "s" : ""} vous attendent.` : "Rien d'urgent dans vos actions." },
    { id: "messages", label: "Messages non lus", value: String(unread ?? 0), href: "/messages", tone: unread ? "warn" : "ok", say: unread ? `${unread} message${(unread ?? 0) > 1 ? "s" : ""} non lu${(unread ?? 0) > 1 ? "s" : ""} de vos agents.` : "Aucun nouveau message." }
  ];
  const h = Number(new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }));
  const greeting = h < 6 ? "Bonsoir" : h < 18 ? "Bonjour" : "Bonsoir";
  return NextResponse.json({ greeting, items, say: `${greeting}. ${items.map((i) => i.say).join(" ")}` }, { headers: { "cache-control": "no-store" } });
}

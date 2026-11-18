import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parisToday, addDays } from "@/lib/domain/dates";
import { canAutoRun, parseLevel } from "@/lib/jarvis/autonomy";

export const dynamic = "force-dynamic";

type Ev = { id: string; say: string; href: string; severity: "info" | "warn" | "err" };

/** Veille de Jarvis : ce qui vient de se passer et mérite d'être dit, et les propositions en attente de validation. Au niveau « Équilibré » et plus, il crée aussi seul les tâches utiles (jamais rien qui touche à l'argent). */
export async function GET(req: Request) {
  const level = parseLevel(new URL(req.url).searchParams.get("niveau"));
  const sb = createClient(), today = parisToday(), tomorrow = addDays(today, 1);
  const [{ data: inv }, { data: miss }, { data: msgs }, { data: props }] = await Promise.all([
    sb.from("invoices").select("id, number, total_ttc, due_date, status, clients(name)").in("status", ["envoye", "en_retard"]).lt("due_date", today).order("due_date").limit(3),
    sb.from("interventions").select("id, title, scheduled_date, start_time, clients(name)").in("scheduled_date", [today, tomorrow]).is("staff_id", null).is("assignee", null).neq("stage", "annulee").order("scheduled_date").limit(3),
    sb.from("team_messages").select("id, body, staff:staff_id(full_name)").eq("from_owner", false).is("read_at", null).order("created_at", { ascending: false }).limit(3),
    sb.from("jarvis_actions").select("id, kind, title, summary, level").eq("status", "proposed").order("created_at", { ascending: false }).limit(5)
  ]);
  const events: Ev[] = [];
  for (const i of (inv ?? []) as any[]) {
    const days = Math.max(1, Math.round((Date.parse(today) - Date.parse(i.due_date)) / 864e5));
    events.push({ id: `late:${i.id}`, severity: "err", href: `/factures/${i.id}`, say: `La facture ${i.number ?? ""} de ${i.clients?.name ?? "un client"} est en retard de ${days} jour${days > 1 ? "s" : ""}, ${Math.round(Number(i.total_ttc))} euros.` });
  }
  for (const m of (miss ?? []) as any[]) events.push({ id: `unassigned:${m.id}`, severity: "warn", href: `/missions/${m.id}`, say: `${m.scheduled_date === today ? "Aujourd'hui" : "Demain"}, la mission chez ${m.clients?.name ?? "un client"} n'a pas d'intervenant.` });
  for (const m of (msgs ?? []) as any[]) events.push({ id: `msg:${m.id}`, severity: "info", href: "/messages", say: `${m.staff?.full_name?.split(" ")[0] ?? "Un agent"} vous a écrit : ${String(m.body).slice(0, 120)}` });

  // Actions autonomes (jamais d'argent) : une tâche par mission sans intervenant.
  let did = 0;
  if (canAutoRun(level, "create_task")) {
    for (const m of (miss ?? []) as any[]) {
      const r = await sb.from("jarvis_tasks").insert({ agent_key: "core", priority: "haute", dedupe_key: `jarvis-unassigned:${m.id}`, title: `Affecter la mission du ${m.scheduled_date} chez ${m.clients?.name ?? "un client"}`, detail: `Mission « ${m.title} » sans intervenant. Créée automatiquement par Jarvis.` });
      if (!r.error) did++;
    }
  }
  return NextResponse.json({ events, proposals: props ?? [], autoCreated: did }, { headers: { "cache-control": "no-store" } });
}

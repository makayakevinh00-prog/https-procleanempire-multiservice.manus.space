import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { buildOpenSpaceState, type OpenSpaceState, type Rows } from "./openspace";

type Supa = ReturnType<typeof createClient>;
const missing = (e: { message: string } | null) => !!e && /jarvis_|does not exist|schema cache|Could not find/i.test(e.message);

/** Lecture seule des tables JARVIS (session du patron, la RLS décide). Si le socle n'est pas installé : état vide, signalé. */
export async function loadOpenSpaceState(sb: Supa, now: Date = new Date()): Promise<OpenSpaceState> {
  const [ag, al, ac, tk, ev, rn, ins] = await Promise.all([
    sb.from("jarvis_agents").select("key, status, enabled, last_run_at"),
    sb.from("jarvis_alerts").select("id, agent_key, severity, title, status, first_seen_at").neq("status", "resolved").limit(100),
    sb.from("jarvis_actions").select("id, agent_key, kind, level, status, title, created_at, decided_at").order("created_at", { ascending: false }).limit(60),
    sb.from("jarvis_tasks").select("id, agent_key, title, status, created_at, done_at").order("created_at", { ascending: false }).limit(60),
    sb.from("jarvis_events").select("id, type, source_agent, target_agent, status, payload, created_at, handled_at").order("created_at", { ascending: false }).limit(40),
    sb.from("jarvis_runs").select("id, agent_key, started_at, finished_at, ok, summary, trigger").order("started_at", { ascending: false }).limit(40),
    sb.from("jarvis_instructions").select("id, agent_key, kind, command, body, status, result, created_at").order("created_at", { ascending: false }).limit(40)
  ]);
  const all = [ag, al, ac, tk, ev, rn, ins];
  if (all.some((r) => missing(r.error))) return buildOpenSpaceState({ agents: [], alerts: [], actions: [], tasks: [], events: [], runs: [], instructions: [] }, now, false);
  const failed = all.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  const rows: Rows = { agents: ag.data as any, alerts: al.data as any, actions: ac.data as any, tasks: tk.data as any, events: ev.data as any, runs: rn.data as any, instructions: ins.data as any };
  return buildOpenSpaceState(rows, now, true);
}

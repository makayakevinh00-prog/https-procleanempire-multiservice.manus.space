import { AGENTS, AGENT_BY_KEY } from "./registry";
import type { AgentKey } from "./types";

/**
 * État de l'open space : pure transformation des lignes de la base en ce que l'écran affiche.
 * Sémantique honnête : « travaille » = a terminé un passage il y a moins de 2 minutes ; « repos » = construit mais inactif ;
 * « absent » = prévu, pas encore construit. Aucun agent n'est montré en activité sans trace en base.
 */
export type Activity = "absent" | "repos" | "travaille" | "attend_validation" | "alerte";
export type FeedKind = "passage" | "alerte" | "proposition" | "decision" | "tache" | "demande" | "instruction";

export interface DeskInstruction { id: string; body: string | null; kind: "commande" | "libre"; command: string | null; status: "en_attente" | "executee" | "refusee"; result: string | null; created_at: string }
export interface Desk {
  key: AgentKey; name: string; status: "actif" | "prevu"; activity: Activity; label: string;
  alerts: number; urgent: number; pending: number; blocked: number; tasks: number;
  lastRunAt: string | null; lastSummary: string | null;
  topAlerts: { title: string; severity: string }[]; openTasks: { title: string }[]; instructions: DeskInstruction[];
}
export interface Link { id: string; from: AgentKey; to: AgentKey; type: string; label: string; status: "pending" | "handled"; at: string }
export interface FeedItem { id: string; at: string; agent: AgentKey; kind: FeedKind; text: string; tone: "info" | "ok" | "warn" | "alert" }
export interface OpenSpaceState {
  mode: "reel" | "demo"; generatedAt: string; installed: boolean;
  desks: Desk[]; links: Link[]; feed: FeedItem[];
  totals: { alerts: number; pending: number; tasks: number; links: number };
}

export interface Rows {
  agents: { key: string; status: string; enabled: boolean; last_run_at: string | null }[];
  alerts: { id: string; agent_key: string; severity: string; title: string; status: string; first_seen_at: string }[];
  actions: { id: string; agent_key: string; kind: string; level: string; status: string; title: string; created_at: string; decided_at: string | null }[];
  tasks: { id: string; agent_key: string; title: string; status: string; created_at: string; done_at: string | null }[];
  events: { id: string; type: string; source_agent: string; target_agent: string; status: string; payload: any; created_at: string; handled_at: string | null }[];
  runs: { id: string; agent_key: string; started_at: string; finished_at: string | null; ok: boolean; summary: string | null; trigger: string }[];
  instructions: DeskInstruction[] & { agent_key: string }[] | any[];
}

export const EVENT_LABEL: Record<string, string> = {
  "contract.incomplete": "contrat actif incomplet à compléter",
  "invoice.cancelled_after_sent": "facture annulée après envoi, à encadrer"
};
const ago = (iso: string, now: number) => Math.max(0, now - Date.parse(iso));
const known = (k: string): k is AgentKey => k in AGENT_BY_KEY;
export const RECENT_MS = 2 * 60_000;

export function buildOpenSpaceState(rows: Rows, now: Date, installed = true): OpenSpaceState {
  const t = now.getTime();
  const dbAgent = new Map(rows.agents.map((a) => [a.key, a]));
  const live = (xs: { status: string }[]) => xs;
  void live;
  const desks: Desk[] = AGENTS.map((a) => {
    const db = dbAgent.get(a.key);
    const alerts = rows.alerts.filter((x) => x.agent_key === a.key && x.status !== "resolved");
    const pending = rows.actions.filter((x) => x.agent_key === a.key && x.status === "proposed");
    const blocked = rows.actions.filter((x) => x.agent_key === a.key && x.status === "blocked");
    const tasks = rows.tasks.filter((x) => x.agent_key === a.key && x.status === "todo");
    const runs = rows.runs.filter((x) => x.agent_key === a.key).sort((x, y) => y.started_at.localeCompare(x.started_at));
    const last = runs[0];
    const recent = !!last && ago(last.finished_at ?? last.started_at, t) < RECENT_MS;
    let activity: Activity; let label: string;
    if (a.status === "prevu") { activity = "absent"; label = "Pas encore construit"; }
    else if (db && db.enabled === false) { activity = "repos"; label = "Désactivé par vous"; }
    else if (recent) { activity = "travaille"; label = "Vient de travailler"; }
    else if (pending.length) { activity = "attend_validation"; label = `${pending.length} proposition(s) à valider`; }
    else if (alerts.some((x) => x.severity === "urgent")) { activity = "alerte"; label = "Alerte urgente ouverte"; }
    else { activity = "repos"; label = last ? "Au repos" : "Aucun passage encore"; }
    return {
      key: a.key, name: a.name, status: a.status, activity, label,
      alerts: alerts.length, urgent: alerts.filter((x) => x.severity === "urgent").length, pending: pending.length, blocked: blocked.length, tasks: tasks.length,
      lastRunAt: db?.last_run_at ?? last?.started_at ?? null, lastSummary: last?.summary ?? null,
      topAlerts: alerts.sort((x, y) => ["urgent", "attention", "info"].indexOf(x.severity) - ["urgent", "attention", "info"].indexOf(y.severity)).slice(0, 3).map((x) => ({ title: x.title, severity: x.severity })),
      openTasks: tasks.slice(0, 3).map((x) => ({ title: x.title })),
      instructions: (rows.instructions as any[]).filter((x) => x.agent_key === a.key).sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, 4)
    };
  });

  const links: Link[] = rows.events
    .filter((e) => known(e.source_agent) && known(e.target_agent) && (e.status === "pending" || (e.handled_at && ago(e.handled_at, t) < 30 * 60_000)))
    .map((e) => ({ id: e.id, from: e.source_agent as AgentKey, to: e.target_agent as AgentKey, type: e.type, label: EVENT_LABEL[e.type] ?? e.type, status: e.status as "pending" | "handled", at: e.handled_at ?? e.created_at }));

  const nom = (k: string) => (known(k) ? AGENT_BY_KEY[k].name : k);
  const feed: FeedItem[] = [];
  for (const r of rows.runs) feed.push({ id: `run:${r.id}`, at: r.finished_at ?? r.started_at, agent: r.agent_key as AgentKey, kind: "passage", tone: r.ok ? "ok" : "alert", text: `${nom(r.agent_key)} a terminé un passage (${r.trigger}).` });
  for (const a of rows.alerts) feed.push({ id: `al:${a.id}`, at: a.first_seen_at, agent: a.agent_key as AgentKey, kind: "alerte", tone: a.severity === "urgent" ? "alert" : "warn", text: a.title });
  for (const a of rows.actions) {
    feed.push({ id: `ac:${a.id}`, at: a.created_at, agent: a.agent_key as AgentKey, kind: "proposition", tone: a.level === "L3" ? "alert" : "warn", text: `${a.level === "L3" ? "Action réservée (L3)" : "Proposition à valider"} : ${a.title}` });
    if (a.decided_at && ["executed", "rejected"].includes(a.status)) feed.push({ id: `dc:${a.id}`, at: a.decided_at, agent: a.agent_key as AgentKey, kind: "decision", tone: "ok", text: `Vous avez ${a.status === "executed" ? "validé" : "refusé"} : ${a.title}` });
  }
  for (const k of rows.tasks) feed.push({ id: `tk:${k.id}`, at: k.done_at ?? k.created_at, agent: k.agent_key as AgentKey, kind: "tache", tone: k.status === "done" ? "ok" : "info", text: `${k.status === "done" ? "Tâche terminée" : "Tâche créée pour vous"} : ${k.title}` });
  for (const e of rows.events) feed.push({ id: `ev:${e.id}`, at: e.created_at, agent: e.source_agent as AgentKey, kind: "demande", tone: "info", text: `${nom(e.source_agent)} → ${nom(e.target_agent)} : ${EVENT_LABEL[e.type] ?? e.type}${e.payload?.label ? ` (${e.payload.label})` : ""}` });
  for (const i of rows.instructions as any[]) feed.push({ id: `in:${i.id}`, at: i.created_at, agent: i.agent_key as AgentKey, kind: "instruction", tone: i.status === "refusee" ? "warn" : "info", text: `Instruction à ${nom(i.agent_key)} : ${i.kind === "commande" ? "lancer un passage" : `« ${String(i.body).slice(0, 80)} »`} — ${i.status === "en_attente" ? "en attente" : i.status === "executee" ? "exécutée" : "refusée"}` });
  feed.sort((x, y) => y.at.localeCompare(x.at));

  return {
    mode: "reel", generatedAt: now.toISOString(), installed, desks, links, feed: feed.slice(0, 40),
    totals: { alerts: desks.reduce((a, d) => a + d.alerts, 0), pending: desks.reduce((a, d) => a + d.pending, 0), tasks: desks.reduce((a, d) => a + d.tasks, 0), links: links.filter((l) => l.status === "pending").length }
  };
}

/** « il y a 12 s », « il y a 3 min »... calculé côté écran. */
export function relTime(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

/**
 * Mode DÉMONSTRATION : un scénario fictif, déterministe, pour visualiser l'open space avant que les agents existent.
 * Il est TOUJOURS étiqueté « démonstration » à l'écran et n'écrit rien nulle part.
 */
const SCRIPT: { agent: AgentKey; to?: AgentKey; kind: FeedKind; tone: FeedItem["tone"]; text: string; activity?: Partial<Record<AgentKey, Activity>> }[] = [
  { agent: "core", kind: "passage", tone: "ok", text: "JARVIS Core ouvre la journée : passages planifiés.", activity: { core: "travaille" } },
  { agent: "finance", kind: "passage", tone: "ok", text: "Finance analyse 40 factures et 9 contrats.", activity: { finance: "travaille" } },
  { agent: "finance", kind: "alerte", tone: "alert", text: "Facture annulée après envoi sans avoir (exemple).", activity: { finance: "alerte" } },
  { agent: "finance", to: "juridique", kind: "demande", tone: "info", text: "Finance → Juridique : facture à encadrer (exemple).", activity: { juridique: "travaille" } },
  { agent: "finance", to: "operations", kind: "demande", tone: "info", text: "Finance → Opérations : contrat incomplet (exemple).", activity: { operations: "travaille" } },
  { agent: "operations", kind: "tache", tone: "warn", text: "Opérations : mission non affectée à J-2 (exemple).", activity: { operations: "attend_validation" } },
  { agent: "commercial", kind: "passage", tone: "ok", text: "Commercial relance 2 devis sans réponse (exemple).", activity: { commercial: "travaille" } },
  { agent: "relation", kind: "proposition", tone: "warn", text: "Relation client prépare une réponse : à valider (exemple).", activity: { relation: "attend_validation" } },
  { agent: "studio", kind: "passage", tone: "ok", text: "Studio propose une maquette de proposition commerciale (exemple).", activity: { studio: "travaille" } },
  { agent: "marketing", kind: "passage", tone: "ok", text: "Marketing prépare le calendrier de la semaine (exemple).", activity: { marketing: "travaille" } },
  { agent: "rh", kind: "alerte", tone: "warn", text: "RH : un document d'intervenant expire dans 30 jours (exemple).", activity: { rh: "alerte" } },
  { agent: "core", kind: "decision", tone: "ok", text: "JARVIS Core clôt la journée : rapport du soir envoyé (exemple).", activity: { core: "repos" } }
];

export function demoState(tick: number, now: Date): OpenSpaceState {
  const step = tick % (SCRIPT.length + 3);
  const visible = SCRIPT.slice(0, Math.min(step + 1, SCRIPT.length));
  const act: Partial<Record<AgentKey, Activity>> = {};
  for (const s of visible) Object.assign(act, s.activity);
  const last = visible[visible.length - 1];
  const desks: Desk[] = AGENTS.map((a) => {
    const base: Activity = act[a.key] ?? "repos";
    const activity: Activity = last && last.activity && a.key in last.activity ? (last.activity[a.key] as Activity) : base === "travaille" ? "repos" : base;
    return {
      key: a.key, name: a.name, status: "actif", activity,
      label: activity === "travaille" ? "En train de travailler…" : activity === "attend_validation" ? "Attend votre validation" : activity === "alerte" ? "Alerte ouverte" : "Au repos",
      alerts: activity === "alerte" ? 1 : 0, urgent: activity === "alerte" ? 1 : 0, pending: activity === "attend_validation" ? 1 : 0, blocked: 0, tasks: 0,
      lastRunAt: null, lastSummary: "Démonstration : aucune donnée réelle.", topAlerts: [], openTasks: [], instructions: []
    };
  });
  const links: Link[] = visible.filter((s) => s.to).map((s, i) => ({ id: `d${i}`, from: s.agent, to: s.to!, type: "demo", label: s.text.includes(" : ") ? s.text.split(" : ").slice(1).join(" : ") : s.text, status: s === last ? "pending" : "handled", at: now.toISOString() }));
  const feed: FeedItem[] = visible.map((s, i) => ({ id: `df${tick - (visible.length - 1 - i)}-${i}`, at: new Date(now.getTime() - (visible.length - 1 - i) * 4000).toISOString(), agent: s.agent, kind: s.kind, tone: s.tone, text: s.text })).reverse();
  return { mode: "demo", generatedAt: now.toISOString(), installed: true, desks, links, feed, totals: { alerts: desks.reduce((a, d) => a + d.alerts, 0), pending: desks.reduce((a, d) => a + d.pending, 0), tasks: 0, links: links.filter((l) => l.status === "pending").length } };
}

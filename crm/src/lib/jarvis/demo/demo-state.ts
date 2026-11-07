import { AGENTS } from "../registry";
import type { AgentKey } from "../types";
import type { Activity, Desk, FeedItem, Link, OpenSpaceState, FeedKind } from "../openspace";

/**
 * DONNÉES FICTIVES : ce dossier est le SEUL endroit où elles existent.
 * Un test automatique interdit à tout autre fichier de l'importer (hors page de démonstration).
 */
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

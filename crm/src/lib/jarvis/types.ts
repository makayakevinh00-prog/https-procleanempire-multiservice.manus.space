/** Niveaux d'autonomie : L1 automatique · L2 validation du patron · L3 autorisation explicite hors JARVIS. */
export type Level = "L1" | "L2" | "L3";
export type AgentKey = "core" | "finance" | "commercial" | "operations" | "relation" | "marketing" | "studio" | "rh" | "juridique";
export type Severity = "info" | "attention" | "urgent";

export interface AlertOut { dedupe_key: string; severity: Severity; title: string; detail?: string; entity_type?: string; entity_id?: string; href?: string }
export interface ActionOut { dedupe_key: string; kind: string; title: string; summary?: string; payload?: Record<string, unknown>; entity_type?: string; entity_id?: string; href?: string }
export interface TaskOut { dedupe_key: string; title: string; detail?: string; priority?: "basse" | "normale" | "haute"; entity_type?: string; entity_id?: string; href?: string }
export interface EventOut { type: string; target_agent: AgentKey; dedupe_key: string; payload?: Record<string, unknown> }
export interface MemoryOut { key: string; subject_type: string; subject_id: string; value: Record<string, unknown> }

/** Ce qu'un agent renvoie à JARVIS Core à la fin d'un passage. Il ne décide jamais lui-même du niveau d'une action. */
export interface AgentResult {
  summary: string;
  stats: Record<string, number | string>;
  alerts: AlertOut[];
  actions: ActionOut[];
  tasks: TaskOut[];
  events: EventOut[];
  memory: MemoryOut[];
}

export interface AgentSpec {
  key: AgentKey;
  name: string;
  department: string;
  /** « actif » = réellement construit ET testé. « prevu » = conçu, pas encore construit. */
  status: "actif" | "prevu";
  mission: string;
  responsibilities: string[];
  limits: string[];
  data: { read: string[]; write: string[] };
  tools: { name: string; state: "disponible" | "a_connecter" | "a_decider" }[];
  memory: { own: string[]; shared: string[] };
  automations: { label: string; state: "construit" | "prevu" }[];
  collaborates: { agent: AgentKey; why: string }[];
  autonomy: { L1: string[]; L2: string[]; L3: string[] };
  /** Types d'événements que cet agent sait recevoir des autres. */
  listens: string[];
}

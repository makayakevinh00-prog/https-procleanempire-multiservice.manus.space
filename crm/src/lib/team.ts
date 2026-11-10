/**
 * Équipe et accès : sections du CRM, niveaux (aucun / lecture / modification) et rôles de départ.
 * Module pur (sans accès base) : il sert au menu, au middleware et aux tests. La base de données reste la référence
 * (fonctions team_level / team_can et politiques RLS de la migration 0040) ; ce module ne fait qu'aligner l'affichage.
 */
export type Level = "read" | "write";
export type Perms = Partial<Record<SectionKey, Level>>;

export const SECTIONS = [
  { key: "clients", label: "Clients et demandes", hint: "Fiches clients, demandes du site, sites d'intervention", routes: ["/clients", "/demandes", "/api/entreprises"] },
  { key: "devis", label: "Devis", hint: "Création et suivi des devis (le patron valide et envoie)", routes: ["/devis", "/api/devis"] },
  { key: "contrats", label: "Contrats", hint: "Contrats récurrents", routes: ["/contrats", "/api/contrats"] },
  { key: "missions", label: "Missions et planning", hint: "Interventions, planning, sites", routes: ["/missions", "/planning", "/sites", "/sur-place", "/api/missions"] },
  { key: "rh", label: "Équipe et RH", hint: "Agents, prestataires, recrutement", routes: ["/equipe", "/recrutement"] },
  { key: "conciergerie", label: "Conciergerie", hint: "Logements gérés, réservations, ménages", routes: ["/conciergerie"] },
  { key: "veille", label: "Veille concurrentielle", hint: "Concurrents, certifications, formations", routes: ["/veille"] },
  { key: "catalogue", label: "Catalogue", hint: "Prestations, coûts et marges (attention : visibles)", routes: ["/catalogue"] },
  { key: "finances", label: "Finances", hint: "Factures, paiements, fournisseurs, comptabilité, analyses", routes: ["/factures", "/facturation-auto", "/paiements", "/fournisseurs", "/comptabilite", "/analyses", "/croissance", "/api/factures"] }
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];
export const SECTION_KEYS = SECTIONS.map((s) => s.key) as SectionKey[];

export const LEVEL_LABEL: Record<"none" | Level, string> = { none: "Aucun accès", read: "Lecture seule", write: "Lecture et modification" };

/** Rôles de départ : un modèle de droits que le patron peut ensuite ajuster section par section. */
export const ROLES = {
  rh: { label: "RH", perms: { rh: "write", missions: "read" } },
  commercial: { label: "Commercial", perms: { clients: "write", devis: "write", contrats: "read", veille: "write" } },
  alternant: { label: "Alternant", perms: { missions: "write", clients: "read", conciergerie: "read" } },
  stagiaire: { label: "Stagiaire", perms: { missions: "read", clients: "read" } },
  autre: { label: "Autre (sur mesure)", perms: {} }
} as const satisfies Record<string, { label: string; perms: Perms }>;
export type RoleKey = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];
export const isRole = (v: unknown): v is RoleKey => typeof v === "string" && (ROLE_KEYS as string[]).includes(v);

/** N'accepte que des sections connues et des niveaux valides ; tout le reste est ignoré (jamais d'accès par défaut). */
export function sanitizePerms(raw: unknown): Perms {
  const out: Perms = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of SECTION_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (v === "read" || v === "write") out[k] = v;
  }
  return out;
}

/** Lit les droits depuis un formulaire : un champ `perm_<section>` valant none, read ou write. */
export function permsFromForm(get: (name: string) => unknown): Perms {
  const o: Record<string, unknown> = {};
  for (const k of SECTION_KEYS) o[k] = get(`perm_${k}`);
  return sanitizePerms(o);
}

export const levelOf = (p: Perms | null | undefined, s: SectionKey): "none" | Level => p?.[s] ?? "none";
export const can = (p: Perms | null | undefined, s: SectionKey, need: Level): boolean => {
  const l = levelOf(p, s);
  return need === "read" ? l !== "none" : l === "write";
};

/** Chemins toujours permis à une personne de l'équipe connectée. */
const ALWAYS = ["/bienvenue", "/recherche"];
const inPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

/**
 * Section d'un chemin : une clé, `"always"` (accueil de l'équipe) ou `null` (réservé au patron, par défaut pour tout chemin inconnu).
 */
export function sectionOf(pathname: string): SectionKey | "always" | null {
  if (ALWAYS.some((p) => inPrefix(pathname, p))) return "always";
  for (const s of SECTIONS) if (s.routes.some((r) => inPrefix(pathname, r))) return s.key;
  return null;
}

/** Le chemin est-il permis (au moins en lecture) à ces droits ? */
export const pathAllowed = (p: Perms | null | undefined, pathname: string): boolean => {
  const s = sectionOf(pathname);
  return s === "always" || (s !== null && can(p, s, "read"));
};

/** Première page utile pour une personne de l'équipe. */
export function homeFor(p: Perms | null | undefined): string {
  const first = SECTIONS.find((s) => can(p, s.key, "read"));
  return first ? first.routes[0] : "/bienvenue";
}

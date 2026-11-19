import { Home, Users, ClipboardList, Receipt, TrendingUp, MessageCircle, Clapperboard, type LucideIcon } from "lucide-react";

/** Les 7 entrées du menu. Chaque page existante devient un onglet de sa rubrique : aucune adresse (URL) ne change. */
/** « also » : autres adresses rangées sous le même onglet (ex. les sites d'intervention, sous Territoire). */
export type Tab = { href: string; label: string; also?: string[] };
export type Section = { key: string; label: string; icon: LucideIcon; tabs: Tab[] };

export const SECTIONS_NAV: Section[] = [
  { key: "accueil", label: "Accueil", icon: Home, tabs: [{ href: "/", label: "Accueil" }, { href: "/calendrier", label: "Calendrier" }, { href: "/actions", label: "Actions à faire" }] },
  { key: "clients", label: "Clients & contrats", icon: Users, tabs: [
    { href: "/clients", label: "Clients" }, { href: "/demandes", label: "Demandes du site" }, { href: "/devis", label: "Devis" }, { href: "/contrats", label: "Contrats" },
    { href: "/activites", label: "Activités" }, { href: "/catalogue", label: "Catalogue" }, { href: "/conciergerie", label: "Conciergerie" }
  ] },
  { key: "terrain", label: "Terrain & équipe", icon: ClipboardList, tabs: [
    { href: "/planning", label: "Planning" }, { href: "/missions", label: "Missions" }, { href: "/sur-place", label: "Sur place" },
    { href: "/equipe", label: "Équipe" }, { href: "/nettoyeurs", label: "Nettoyeurs" }, { href: "/recrutement", label: "Recrutement" }
  ] },
  { key: "argent", label: "Argent", icon: Receipt, tabs: [
    { href: "/factures", label: "Factures" }, { href: "/paiements", label: "Paiements" }, { href: "/facturation-auto", label: "Facturation automatique" },
    { href: "/comptabilite", label: "Comptabilité" }, { href: "/fournisseurs", label: "Fournisseurs" }, { href: "/analyses", label: "Analyses" }
  ] },
  { key: "croissance", label: "Croissance", icon: TrendingUp, tabs: [
    { href: "/croissance", label: "Croissance" }, { href: "/veille/territoire", label: "Territoire", also: ["/sites"] }, { href: "/veille", label: "Veille concurrentielle" }, { href: "/croissance/aides", label: "Aides publiques" }
  ] },
  { key: "media", label: "Média", icon: Clapperboard, tabs: [{ href: "/media", label: "Média" }] },
  { key: "messages", label: "Messages", icon: MessageCircle, tabs: [{ href: "/messages", label: "Messages" }] }
];

/** Menu du profil : réglages et supervision, hors du menu principal. */
export const PROFILE_LINKS: Tab[] = [
  { href: "/parametres", label: "Paramètres" }, { href: "/journal", label: "Journal" }, { href: "/compte", label: "Mon compte" },
  { href: "/jarvis", label: "Supervision JARVIS" }, { href: "/jarvis/alertes", label: "Alertes JARVIS" }
];

/** Pages à part, trouvables par la recherche Commande K mais sans onglet. */
export const EXTRA_PAGES: Tab[] = [{ href: "/sites", label: "Sites d'intervention (Territoire)" }, { href: "/devis/ia", label: "Devis avec l'IA (photos)" }, { href: "/veille/territoire/avance", label: "Territoire : objectifs et réglages" }, { href: "/recherche", label: "Recherche" }];

const inPath = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

/** Onglet actif d'un chemin dans une liste : le plus précis l'emporte (« /veille/territoire » avant « /veille »). */
export function activeTab(path: string, tabs: Tab[]): Tab | null {
  let best: Tab | null = null;
  for (const t of tabs) if ((inPath(path, t.href) || (t.also ?? []).some((h) => inPath(path, h))) && (!best || t.href.length > best.href.length)) best = t;
  return best;
}

/** Rubrique d'un chemin (null pour les pages hors rubriques : paramètres, recherche…). */
export function sectionOfPath(path: string, sections: Section[] = SECTIONS_NAV): Section | null {
  let best: { s: Section; len: number } | null = null;
  for (const s of sections) { const t = activeTab(path, s.tabs); if (t && (!best || t.href.length > best.len)) best = { s, len: t.href.length }; }
  return best?.s ?? null;
}

/** Toutes les pages connues du CRM (pour la recherche rapide). */
export function allPages(): Tab[] {
  const seen = new Set<string>(), out: Tab[] = [];
  for (const t of [...SECTIONS_NAV.flatMap((s) => s.tabs), ...PROFILE_LINKS, ...EXTRA_PAGES]) if (!seen.has(t.href)) { seen.add(t.href); out.push(t); }
  return out;
}

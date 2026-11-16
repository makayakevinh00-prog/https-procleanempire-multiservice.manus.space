/** Statut de la personne qui nettoie : salariée de l'entreprise, ou indépendante (la facturation et les obligations ne sont pas les mêmes). */
export type Employment = "salarie" | "auto_entrepreneur" | "entreprise" | "etudiant";
export const EMPLOYMENT: Record<Employment, { label: string; short: string; independent: boolean }> = {
  salarie: { label: "Salarié(e) ProClean", short: "Salarié(e)", independent: false },
  auto_entrepreneur: { label: "Indépendant(e) — auto-entrepreneur", short: "Indépendant", independent: true },
  entreprise: { label: "Entrepreneur — société partenaire", short: "Entrepreneur", independent: true },
  etudiant: { label: "Étudiant(e) indépendant(e)", short: "Indépendant (étudiant)", independent: true }
};
export const isEmployment = (v: unknown): v is Employment => typeof v === "string" && v in EMPLOYMENT;
export const employmentShort = (v: unknown) => (isEmployment(v) ? EMPLOYMENT[v].short : null);

/** Annuaire nom → statut, pour afficher le statut à côté d'un nom d'intervenant (équipe + nettoyeurs de la plateforme). */
export function statusByName(staff: { full_name: string; employment?: string | null }[], cleaners: { full_name: string; statut_pro?: string | null }[] = []): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of cleaners) { const l = employmentShort(c.statut_pro); if (l) m.set(c.full_name, l); }
  for (const s of staff) { const l = employmentShort(s.employment ?? "salarie"); if (l) m.set(s.full_name, l); }
  return m;
}

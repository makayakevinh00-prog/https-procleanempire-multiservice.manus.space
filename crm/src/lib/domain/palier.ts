/**
 * Paliers de croissance : on vise un montant de chiffre récurrent signé par mois (contrats actifs, HT).
 * Dès qu'un palier est atteint, le suivant devient la cible : rien à régler à la main.
 */
export interface Palier { seuil: number; action: string }

export const PALIERS: Palier[] = [
  { seuil: 5000, action: "Confier les ménages à un premier nettoyeur régulier, payé à la mission." },
  { seuil: 10000, action: "Faire tourner une équipe de 2 ou 3 personnes et sortir du terrain." },
  { seuil: 50000, action: "Déléguer le commercial et viser les gros contrats (syndics, bureaux en volume)." }
];

export interface PalierState {
  /** Palier visé : le premier pas encore atteint, ou le dernier quand tout est atteint. */
  cible: Palier;
  /** Rang du palier visé (1 = premier). */
  rang: number;
  /** Tous les paliers sont atteints. */
  termine: boolean;
  /** Avancement vers le palier visé, de 0 à 100. */
  pct: number;
  /** Récurrent mensuel qu'il reste à signer pour l'atteindre. */
  reste: number;
  /** Paliers déjà atteints, dans l'ordre. */
  atteints: Palier[];
}

export function palierState(recurrent: number, paliers: Palier[] = PALIERS): PalierState {
  const mrr = Number.isFinite(recurrent) && recurrent > 0 ? recurrent : 0;
  const atteints = paliers.filter((p) => mrr >= p.seuil);
  const termine = atteints.length === paliers.length;
  const cible = termine ? paliers[paliers.length - 1] : paliers[atteints.length];
  return {
    cible, rang: termine ? paliers.length : atteints.length + 1, termine,
    pct: termine ? 100 : Math.min(99, Math.floor((100 * mrr) / cible.seuil)),
    reste: termine ? 0 : Math.max(0, Math.ceil(cible.seuil - mrr)),
    atteints
  };
}

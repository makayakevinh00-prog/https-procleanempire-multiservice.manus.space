import type { Kpi, KpiSet } from "../kpis";

/** CHIFFRES FICTIFS pour la démonstration. N'existent nulle part ailleurs. Toujours affichés avec l'étiquette « exemple ». */
const k = (id: string, dept: Kpi["dept"], label: string, unit: Kpi["unit"], value: number | null, detail: string | null = null, reason: string | null = null): Kpi =>
  ({ id, dept, label, unit, value, detail, reason, source: "Exemple de démonstration", lastChangeAt: null });

export function demoKpiSet(now: Date = new Date()): KpiSet {
  return {
    computedAt: now.toISOString(), today: now.toISOString().slice(0, 10), errors: {},
    kpis: [
      k("fin.ca_mois", "finance", "CA du mois (HT)", "eur", 4280, "9 factures émises ce mois"),
      k("fin.ca_annee", "finance", "CA de l'année (HT)", "eur", 38900, "71 factures émises"),
      k("fin.encaisse_mois", "finance", "Encaissé ce mois (TTC)", "eur", 3120, "7 règlements"),
      k("fin.en_attente", "finance", "En attente de paiement (TTC)", "eur", 2460, "5 factures ouvertes"),
      k("fin.impayes", "finance", "Impayés en retard (TTC)", "eur", 240, "1 facture dépasse l'échéance"),
      k("fin.rentabilite", "finance", "Rentabilité", "eur", null, null, "Exemple de donnée non disponible."),
      k("com.prospects", "commercial", "Prospects", "int", 12, "dont 3 nouveaux sur 30 jours"),
      k("com.demandes", "commercial", "Demandes de devis à traiter", "int", 2),
      k("com.devis_attente", "commercial", "Devis en attente de réponse", "int", 4, "3 100,00 € HT en jeu"),
      k("com.conversion", "commercial", "Taux de conversion (90 jours)", "pct", 46, "6 acceptés sur 13 émis"),
      k("com.contrats", "commercial", "Contrats actifs", "int", 11),
      k("ops.a_venir", "operations", "Interventions planifiées à venir", "int", 38, "12 dans les 7 prochains jours"),
      k("ops.realisees_mois", "operations", "Interventions réalisées ce mois", "int", 27),
      k("ops.retard", "operations", "Interventions en retard", "int", 2, "À clôturer ou à replanifier"),
      k("ops.non_affectees", "operations", "En attente d'affectation", "int", 3, "Aucun intervenant désigné"),
      k("ops.affectations_7j", "operations", "Intervenants mobilisés (7 jours)", "int", 4, "12 interventions affectées")
    ]
  };
}

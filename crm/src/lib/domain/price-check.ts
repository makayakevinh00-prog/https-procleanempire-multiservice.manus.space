/**
 * Contrôle des prix avant l'émission d'une facture.
 * But : ne jamais envoyer à un client une facture dont le montant ne correspond pas à ce qui a été convenu.
 * Fonction pure : elle compare la facture à ce que l'on sait (contrats actifs, missions rattachées, factures précédentes)
 * et rend une liste d'écarts. « bloquant » = la facture ne peut pas partir ; « a_confirmer » = elle ne part qu'après
 * une confirmation explicite ; aucun écart = prix conforme.
 */
export type PriceLine = { description: string; quantity: number; unitPriceHt: number };
export type PriceContract = { id: string; label: string; billingMode: "mensuel" | "passage" | "autre"; monthlyHt: number | null; perVisitHt: number | null };
export type PriceMission = { title: string; unitPriceHt: number | null; quantity: number };
export type PriceInput = {
  totalHt: number;
  lines: PriceLine[];
  /** Contrats ACTIFS du client. */
  contracts: PriceContract[];
  /** Missions rattachées à cette facture (vide si la facture ne vient pas des missions). */
  missions: PriceMission[];
  /** Total HT des dernières factures émises pour ce client (de la plus récente à la plus ancienne, annulées exclues). */
  previousTotalsHt: number[];
  /** Autres factures non annulées du même client sur le même mois, avec le même total HT. */
  sameMonthSameTotal: number;
};
export type PriceFinding = { level: "bloquant" | "a_confirmer"; code: string; title: string; detail: string };
export type PriceCheck = { verdict: "conforme" | "a_confirmer" | "bloquant"; findings: PriceFinding[]; expectedHt: number | null; basis: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const eur = (n: number) => `${round2(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
/** Tolérance d'arrondi : en dessous d'un euro, deux montants sont considérés égaux. */
const TOLERANCE = 1;
/** Écart jugé inhabituel par rapport aux factures précédentes. */
const UNUSUAL_RATIO = 0.25;

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b), mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

export function checkInvoicePrice(input: PriceInput): PriceCheck {
  const findings: PriceFinding[] = [];
  const total = round2(input.totalHt);
  const linesTotal = round2(input.lines.reduce((s, l) => s + l.quantity * l.unitPriceHt, 0));
  let expectedHt: number | null = null;
  let basis = "Aucun contrat ni mission pour comparer : contrôle limité aux factures précédentes.";

  // 1. Facture vide ou incohérente : ne part jamais.
  if (!input.lines.length || total <= 0) {
    findings.push({ level: "bloquant", code: "vide", title: "Facture vide ou à zéro", detail: "Ajoutez au moins une prestation avec un prix avant de l'envoyer." });
  } else if (Math.abs(linesTotal - total) > TOLERANCE) {
    findings.push({ level: "bloquant", code: "total_incoherent", title: "Le total ne correspond pas aux lignes", detail: `Les lignes font ${eur(linesTotal)} HT, la facture affiche ${eur(total)} HT. Rouvrez et réenregistrez le brouillon.` });
  }
  if (input.lines.some((l) => l.unitPriceHt === 0)) {
    findings.push({ level: "a_confirmer", code: "ligne_gratuite", title: "Une ligne est à 0 €", detail: "Vérifiez qu'il s'agit bien d'un geste commercial voulu." });
  }

  // 2. Comparaison au prix convenu : d'abord les missions rattachées, sinon les contrats.
  const priced = input.missions.filter((m) => m.unitPriceHt != null);
  const monthly = input.contracts.filter((c) => c.billingMode === "mensuel" && c.monthlyHt != null);
  const perVisit = input.contracts.filter((c) => c.billingMode === "passage" && c.perVisitHt != null);
  if (input.missions.length) {
    if (priced.length < input.missions.length) {
      findings.push({ level: "a_confirmer", code: "mission_sans_prix", title: "Mission sans prix", detail: `${input.missions.length - priced.length} mission(s) rattachée(s) n'ont pas de prix enregistré : le contrôle est partiel.` });
    }
    expectedHt = round2(priced.reduce((s, m) => s + (m.unitPriceHt ?? 0) * m.quantity, 0));
    basis = `Prix des ${input.missions.length} mission(s) rattachée(s) à cette facture.`;
    if (priced.length && Math.abs(expectedHt - total) > TOLERANCE) {
      findings.push({ level: "a_confirmer", code: "ecart_missions", title: "Écart avec les missions réalisées", detail: `Les missions rattachées font ${eur(expectedHt)} HT, la facture ${eur(total)} HT : écart de ${eur(total - expectedHt)}.` });
    }
  } else if (monthly.length) {
    expectedHt = round2(monthly.reduce((s, c) => s + (c.monthlyHt ?? 0), 0));
    basis = monthly.length === 1 ? `Contrat mensuel « ${monthly[0]!.label} ».` : `${monthly.length} contrats mensuels actifs.`;
    // Une facture peut ne couvrir qu'un seul des contrats mensuels : elle est conforme si elle égale le total ou l'un d'eux.
    const matchesOne = monthly.some((c) => Math.abs((c.monthlyHt ?? 0) - total) <= TOLERANCE);
    if (Math.abs(expectedHt - total) > TOLERANCE && !matchesOne) {
      findings.push({ level: "a_confirmer", code: "ecart_contrat", title: "Écart avec le contrat", detail: `Le contrat prévoit ${eur(expectedHt)} HT par mois, la facture fait ${eur(total)} HT : écart de ${eur(total - expectedHt)}.` });
    }
  } else if (perVisit.length) {
    const prices = perVisit.map((c) => round2(c.perVisitHt ?? 0));
    basis = `Prix au passage convenu : ${[...new Set(prices)].map(eur).join(", ")} HT.`;
    const off = input.lines.filter((l) => l.unitPriceHt > 0 && !prices.some((p) => Math.abs(p - l.unitPriceHt) <= TOLERANCE));
    if (off.length) {
      findings.push({ level: "a_confirmer", code: "ecart_passage", title: "Prix au passage différent du contrat", detail: `${off.length} ligne(s) à un prix non prévu (${[...new Set(off.map((l) => eur(l.unitPriceHt)))].join(", ")}), alors que le contrat prévoit ${[...new Set(prices)].map(eur).join(", ")} HT par passage.` });
    }
  }

  // 3. Montant inhabituel par rapport aux factures précédentes.
  if (input.previousTotalsHt.length >= 2 && total > 0) {
    const usual = median(input.previousTotalsHt.slice(0, 3));
    if (usual > 0 && Math.abs(total - usual) / usual > UNUSUAL_RATIO) {
      findings.push({ level: "a_confirmer", code: "inhabituel", title: "Montant inhabituel pour ce client", detail: `Ses dernières factures tournent autour de ${eur(usual)} HT ; celle-ci fait ${eur(total)} HT (${total > usual ? "+" : "−"}${Math.round((Math.abs(total - usual) / usual) * 100)} %).` });
    }
  }

  // 4. Possible doublon.
  if (input.sameMonthSameTotal > 0) {
    findings.push({ level: "a_confirmer", code: "doublon", title: "Possible doublon", detail: `Une autre facture de ${eur(total)} HT existe déjà pour ce client ce mois-ci.` });
  }

  const verdict = findings.some((f) => f.level === "bloquant") ? "bloquant" : findings.length ? "a_confirmer" : "conforme";
  return { verdict, findings, expectedHt, basis };
}

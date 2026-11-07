import { contractIssues } from "@/lib/domain/contract-check";
import { formatEUR } from "@/lib/utils";
import type { ActionOut, AgentResult, AlertOut, EventOut, MemoryOut, Severity, TaskOut } from "../types";

/** Photo des données dont l'agent Finance a besoin : lecture seule, déjà convertie (nombres, dates YYYY-MM-DD). */
export interface FinanceInvoice {
  id: string; number: string | null; client_id: string; client_name: string; client_reserved: boolean;
  status: "brouillon" | "envoye" | "paye" | "en_retard" | "annule";
  issue_date: string | null; due_date: string | null; total_ttc: number; paid_amount: number; paid_at: string | null;
  sent_at: string | null; reminder_count: number; created_at: string;
  /** Motif saisi lors de l'annulation, s'il existe. */
  cancel_reason?: string | null;
  /** Taux de TVA des lignes (absent = non chargé : aucune alerte TVA n'est alors émise). */
  vat_rates?: number[];
  /** Informations de facturation du client (absent = non chargé : aucune alerte correspondante). */
  client_billing?: { address: string | null; postal_code: string | null; city: string | null; kind: string | null; siret: string | null };
}
export interface FinanceContract {
  id: string; client_id: string; client_name: string; label: string; status: string;
  billing_mode: "mensuel" | "passage" | "autre"; monthly_amount_ht: number | null; per_visit_amount_ht: number | null; terms: string | null;
  weekdays: number[] | null; visits_per_week: number | null; hours_per_visit: number | null; site_address: string | null; assignee: string | null; start_date: string | null;
}
export interface FinanceSnapshot {
  /** Date du jour à Paris, YYYY-MM-DD. */
  today: string;
  settings: { payment_terms_days: number; reminder_max_count: number; reminder_manual_days: number; quote_terms: string | null; company_vat_number?: string | null };
  invoices: FinanceInvoice[];
  contracts: FinanceContract[];
  paymentsCount: number;
}

const OPEN = ["envoye", "en_retard"];
const SEV_ORDER: Record<Severity, number> = { urgent: 0, attention: 1, info: 2 };

/** Écart en jours entiers entre deux dates YYYY-MM-DD (sans dérive de fuseau). */
export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to.slice(0, 10)}T12:00:00Z`) - Date.parse(`${from.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
}
const fr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const name = (i: FinanceInvoice) => i.number ?? `brouillon de ${i.client_name}`;
const rest = (i: FinanceInvoice) => Math.max(0, i.total_ttc - i.paid_amount);

/**
 * Passage de l'agent Finance : fonction pure (mêmes données → même résultat), donc testable sans base.
 * L'agent OBSERVE et PROPOSE. Il ne modifie, n'envoie et n'émet rien : le niveau d'autonomie est appliqué par JARVIS Core.
 */
export function analyseFinance(s: FinanceSnapshot): AgentResult {
  const alerts: AlertOut[] = [];
  const actions: ActionOut[] = [];
  const tasks: TaskOut[] = [];
  const events: EventOut[] = [];
  const memory: MemoryOut[] = [];
  const { today, settings } = s;
  const maxRem = settings.reminder_max_count;

  for (const i of s.invoices) {
    const href = `/factures/${i.id}`;

    // A. Factures en retard
    if (OPEN.includes(i.status) && i.due_date && i.due_date < today) {
      const days = diffDays(i.due_date, today);
      const reserved = i.client_reserved ? " Contact réservé : aucune action automatique, décision du patron uniquement." : "";
      alerts.push({
        dedupe_key: `late:${i.id}`, severity: days >= 15 ? "urgent" : "attention",
        title: `${name(i)} — ${i.client_name} : en retard de ${days} j (${formatEUR(rest(i))} TTC)`,
        detail: `Échue le ${fr(i.due_date)}. ${i.reminder_count} relance(s) envoyée(s) sur ${maxRem} prévues.${reserved}`,
        entity_type: "invoice", entity_id: i.id, href
      });
      if (!i.client_reserved && i.reminder_count >= maxRem && days >= 7) {
        actions.push({
          dedupe_key: `contact:${i.id}`, kind: "contact_client",
          title: `Écrire à ${i.client_name} au sujet de ${name(i)}`,
          summary: `Facture en retard de ${days} jours malgré ${i.reminder_count} relance(s) automatique(s). Le message ci-dessous est un brouillon : rien n'est envoyé.`,
          payload: {
            brouillon: `Bonjour,\n\nSauf erreur de notre part, la facture ${name(i)} (${formatEUR(rest(i))} TTC, échue le ${fr(i.due_date)}) reste impayée malgré nos relances. Pourriez-vous nous indiquer sous quel délai le règlement sera effectué ?\n\nNous restons à votre disposition.\n\nCordialement,\nProClean Empire`
          },
          entity_type: "invoice", entity_id: i.id, href
        });
      }
      if (!i.client_reserved && i.reminder_count >= maxRem && days >= settings.reminder_manual_days) {
        actions.push({
          dedupe_key: `legal:${i.id}`, kind: "legal_notice",
          title: `Mise en demeure à envisager pour ${name(i)}`,
          summary: `Retard de ${days} jours après ${i.reminder_count} relances. Acte juridique : JARVIS ne le prépare ni ne l'envoie. Autorisation explicite du patron requise, idéalement après avis de l'expert-comptable ou d'un conseil.`,
          entity_type: "invoice", entity_id: i.id, href
        });
      }
    }


    // C. Facture annulée après envoi (aucun avoir n'existe dans le CRM)
    if (i.status === "annule" && i.sent_at) {
      alerts.push({
        dedupe_key: `cancelled:${i.id}`, severity: "urgent",
        title: `${name(i)} — ${i.client_name} : annulée après envoi, sans avoir`,
        detail: `${i.cancel_reason ? `Motif saisi : « ${i.cancel_reason} ». ` : "Aucun motif saisi. "}Une facture envoyée avec TVA est en principe régularisée par un avoir plutôt qu'annulée : à confirmer avec l'expert-comptable.`,
        entity_type: "invoice", entity_id: i.id, href
      });
      actions.push({
        dedupe_key: `credit:${i.id}`, kind: "issue_credit_note",
        title: `Émettre un avoir pour ${name(i)}`,
        summary: "Document comptable légal : JARVIS ne l'émet jamais. Autorisation explicite du patron et validation de l'expert-comptable requises.",
        entity_type: "invoice", entity_id: i.id, href
      });
      events.push({ type: "invoice.cancelled_after_sent", target_agent: "juridique", dedupe_key: i.id, payload: { invoice_id: i.id, number: i.number, client: i.client_name } });
    }

    // E. Brouillons oubliés
    if (i.status === "brouillon" && diffDays(i.created_at, today) > 7) {
      tasks.push({
        dedupe_key: `draft:${i.id}`, title: `Valider ou supprimer le brouillon de ${i.client_name} (${formatEUR(i.total_ttc)} TTC)`,
        detail: `Créé il y a ${diffDays(i.created_at, today)} jours, jamais validé : une facture non émise n'est ni envoyée ni relancée.`,
        priority: "normale", entity_type: "invoice", entity_id: i.id, href
      });
    }
  }

  // B. Délais de paiement hors règle : UNE alerte regroupée (les factures émises avant la règle ne sont pas des erreurs individuelles)
  const horsRegle = s.invoices
    .filter((i) => OPEN.includes(i.status) && i.issue_date && i.due_date && diffDays(i.issue_date, i.due_date) > settings.payment_terms_days)
    .map((i) => ({ i, jours: diffDays(i.issue_date!, i.due_date!) }))
    .sort((a, b) => b.jours - a.jours);
  if (horsRegle.length) {
    alerts.push({
      dedupe_key: "terms", severity: "info",
      title: `${horsRegle.length} facture(s) ouverte(s) avec une échéance au-delà de ${settings.payment_terms_days} jours`,
      detail: `${horsRegle.slice(0, 6).map(({ i, jours }) => `${name(i)} (${i.client_name}) : ${jours} j`).join(" · ")}${horsRegle.length > 6 ? ` · et ${horsRegle.length - 6} autre(s)` : ""}. Une facture émise ne se modifie pas : peut-être émises avant le passage à ${settings.payment_terms_days} jours ; la plus longue est à signaler au client.`,
      href: "/factures"
    });
  }

  // B2. Qualité des données : règlement antérieur à l'émission, ou « envoyée » sans aucune trace d'envoi
  const avantEmission = s.invoices.filter((i) => i.status === "paye" && i.paid_at && i.issue_date && i.paid_at.slice(0, 10) < i.issue_date);
  if (avantEmission.length) {
    alerts.push({
      dedupe_key: "paid_before_issue", severity: "attention",
      title: `${avantEmission.length} facture(s) marquée(s) payée(s) AVANT leur date d'émission`,
      detail: `${avantEmission.slice(0, 6).map((i) => `${name(i)} (payée le ${fr(i.paid_at!)}, émise le ${fr(i.issue_date!)})`).join(" · ")}. Une des deux dates est fausse : l'expert-comptable ne pourra pas s'y fier.`,
      href: "/factures"
    });
  }
  const sansTrace = s.invoices.filter((i) => OPEN.includes(i.status) && !i.sent_at);
  if (sansTrace.length) {
    alerts.push({
      dedupe_key: "never_sent", severity: "info",
      title: `${sansTrace.length} facture(s) « envoyée(s) » sans aucune trace d'envoi dans le CRM`,
      detail: `${sansTrace.slice(0, 6).map((i) => `${name(i)} (${i.client_name})`).join(" · ")}. Peut-être envoyées autrement (ex. ancien outil) : à vérifier avant de les relancer.`,
      href: "/factures"
    });
  }

  // B3. Trois alertes INFORMATIVES (jamais de correction automatique : le CRM ne sait pas ce que le cabinet sait)
  const emisesInfo = s.invoices.filter((i) => !["brouillon", "annule"].includes(i.status));
  const tvaZero = emisesInfo.filter((i) => i.vat_rates?.some((t) => t === 0));
  if (tvaZero.length) {
    alerts.push({
      dedupe_key: "vat_zero", severity: "info",
      title: `TVA à 0 % à vérifier : ${tvaZero.length} facture(s) émise(s) avec au moins une ligne à 0 %`,
      detail: `${tvaZero.slice(0, 6).map((i) => `${name(i)} (${i.client_name})`).join(" · ")}${tvaZero.length > 6 ? ` · et ${tvaZero.length - 6} autre(s)` : ""}. Le CRM ne peut pas savoir si ces lignes sont légitimes (exonération, franchise) ni si la mention exigée figure sur le document : à confirmer avec l'expert-comptable. Aucune facture n'est modifiée.`,
      href: "/factures"
    });
  }
  if (s.settings.company_vat_number !== undefined && !(s.settings.company_vat_number ?? "").trim() && emisesInfo.length) {
    const a20 = emisesInfo.filter((i) => i.vat_rates?.some((t) => t > 0)).length;
    alerts.push({
      dedupe_key: "vat_number_missing", severity: "info",
      title: "Numéro de TVA de l'entreprise absent des réglages",
      detail: `${emisesInfo.length} facture(s) émise(s)${a20 ? `, dont ${a20} avec de la TVA` : ""}. Une entreprise assujettie doit faire figurer son numéro de TVA sur ses factures ; une entreprise en franchise doit porter la mention correspondante. À confirmer avec l'expert-comptable, puis à saisir dans Paramètres si nécessaire.`,
      href: "/parametres"
    });
  }
  const incomplets = new Map<string, { nom: string; manque: string[] }>();
  for (const i of emisesInfo) {
    const c = i.client_billing;
    if (!c) continue;
    const manque: string[] = [];
    if (!(c.address ?? "").trim()) manque.push("adresse");
    if (!(c.postal_code ?? "").trim()) manque.push("code postal");
    if (!(c.city ?? "").trim()) manque.push("ville");
    if (c.kind === "entreprise" && !(c.siret ?? "").trim()) manque.push("SIRET");
    if (manque.length) incomplets.set(i.client_id, { nom: i.client_name, manque });
  }
  if (incomplets.size) {
    const l = [...incomplets.values()];
    alerts.push({
      dedupe_key: "billing_info_missing", severity: "info",
      title: `Informations de facturation manquantes : ${l.length} client(s) facturé(s)`,
      detail: `${l.slice(0, 6).map((x) => `${x.nom} (${x.manque.join(", ")})`).join(" · ")}${l.length > 6 ? ` · et ${l.length - 6} autre(s)` : ""}. L'adresse du client est une mention de la facture ; à compléter sur la fiche client (les factures déjà émises ne se modifient pas).`,
      href: "/clients"
    });
  }

  // D. Contrats actifs qui ne se factureront pas seuls
  for (const k of s.contracts.filter((c) => c.status === "actif")) {
    const manque = [...contractIssues({ ...k, weekdays: k.weekdays }).blocking];
    if (k.billing_mode === "passage" && !(k.weekdays?.length) && !manque.includes("fréquence ou jours de passage")) manque.push("jours de passage");
    if (!manque.length) continue;
    const href = `/contrats/${k.id}`;
    alerts.push({
      dedupe_key: `contract:${k.id}`, severity: "attention",
      title: `Contrat « ${k.label} » (${k.client_name}) incomplet : il manque ${manque.join(", ")}`,
      detail: "Sans ces informations, ni planning ni facturation automatique ne peuvent se faire : le travail réalisé risque de ne jamais être facturé.",
      entity_type: "contract", entity_id: k.id, href
    });
    tasks.push({ dedupe_key: `contract:${k.id}`, title: `Compléter le contrat « ${k.label} » (${manque.join(", ")})`, priority: "haute", entity_type: "contract", entity_id: k.id, href });
    events.push({ type: "contract.incomplete", target_agent: "operations", dedupe_key: k.id, payload: { contract_id: k.id, label: k.label, client: k.client_name, manque } });
  }

  // F. Rapprochement bancaire inactif
  if (s.paymentsCount === 0 && s.invoices.some((i) => ["envoye", "en_retard", "paye"].includes(i.status))) {
    alerts.push({
      dedupe_key: "qonto_empty", severity: "attention",
      title: "Rapprochement bancaire inactif : aucun paiement Qonto importé",
      detail: "Les factures marquées payées ne sont reliées à aucun virement : impossible de vérifier les encaissements. L'activation de la synchronisation Qonto reste une décision du patron.",
      href: "/paiements"
    });
  }

  // G. Conditions des devis incohérentes avec le délai de paiement
  const m = settings.quote_terms?.match(/(\d+)\s*jours?/i);
  if (m && Number(m[1]) !== settings.payment_terms_days) {
    alerts.push({
      dedupe_key: "quote_terms", severity: "info",
      title: `Conditions des devis incohérentes : « ${m[1]} jours » dans le texte, ${settings.payment_terms_days} jours dans les réglages`,
      detail: "Le client lit un délai sur le devis et un autre sur la facture. À corriger dans Paramètres.",
      href: "/parametres"
    });
  }

  // H. Mémoire commune : retard moyen de paiement par client (au moins 2 factures payées)
  // Garde-fou : des dates de règlement saisies en bloc (mêmes dates pour la majorité des factures, sans virement rapproché) ne disent rien
  // du comportement réel d'un client. Mieux vaut ne rien écrire en mémoire commune que d'y mettre un chiffre faux.
  const payees = s.invoices.filter((i) => i.status === "paye" && i.paid_at && i.due_date && i.issue_date && i.paid_at.slice(0, 10) >= i.issue_date);
  const parDate = new Map<string, number>();
  for (const i of payees) parDate.set(i.paid_at!.slice(0, 10), (parDate.get(i.paid_at!.slice(0, 10)) ?? 0) + 1);
  const top3 = [...parDate.values()].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
  const saisieEnBloc = s.paymentsCount === 0 && payees.length >= 5 && top3 / payees.length > 0.6;
  if (saisieEnBloc) {
    alerts.push({
      dedupe_key: "memory_unreliable", severity: "info",
      title: "Retard moyen de paiement non calculé : les dates de règlement semblent saisies en bloc",
      detail: `${top3} règlements sur ${payees.length} portent seulement ${Math.min(3, parDate.size)} dates différentes et aucun virement n'est rapproché. Le calcul reprendra quand les paiements Qonto seront rapprochés.`,
      href: "/paiements"
    });
  }
  const byClient = new Map<string, number[]>();
  for (const i of saisieEnBloc ? [] : payees) (byClient.get(i.client_id) ?? byClient.set(i.client_id, []).get(i.client_id)!).push(diffDays(i.due_date!, i.paid_at!));
  for (const [clientId, delays] of byClient) {
    if (delays.length < 2) continue;
    const moyenne = Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10;
    memory.push({ key: "client.delai_paiement_moyen_jours", subject_type: "client", subject_id: clientId, value: { moyenne, n: delays.length, calcule_le: today } });
  }

  alerts.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.dedupe_key.localeCompare(b.dedupe_key));

  // Briefing chiffré
  const month = today.slice(0, 7);
  const emises = s.invoices.filter((i) => !["brouillon", "annule"].includes(i.status));
  const factureMois = emises.filter((i) => i.issue_date?.startsWith(month));
  const encaisseMois = s.invoices.filter((i) => i.status === "paye" && i.paid_at?.startsWith(month));
  const ouvertes = s.invoices.filter((i) => OPEN.includes(i.status));
  const enRetard = ouvertes.filter((i) => i.due_date && i.due_date < today);
  const sum = (l: FinanceInvoice[], f: (i: FinanceInvoice) => number) => l.reduce((a, i) => a + f(i), 0);
  const nb = (sev: Severity) => alerts.filter((a) => a.severity === sev).length;
  const stats = {
    facture_mois_ttc: Math.round(sum(factureMois, (i) => i.total_ttc) * 100) / 100, factures_mois: factureMois.length,
    encaisse_mois_ttc: Math.round(sum(encaisseMois, (i) => i.paid_amount) * 100) / 100,
    a_encaisser_ttc: Math.round(sum(ouvertes, rest) * 100) / 100, factures_ouvertes: ouvertes.length,
    en_retard_ttc: Math.round(sum(enRetard, rest) * 100) / 100, factures_en_retard: enRetard.length,
    alertes_urgentes: nb("urgent"), alertes_attention: nb("attention"), alertes_info: nb("info"),
    propositions: actions.length, taches: tasks.length
  };
  const top = alerts.slice(0, 3).map((a) => `• ${a.title}`);
  const summary = [
    `Briefing financier du ${fr(today)}`,
    `Facturé ce mois : ${formatEUR(stats.facture_mois_ttc)} TTC (${stats.factures_mois} facture(s)).`,
    `Encaissé ce mois : ${formatEUR(stats.encaisse_mois_ttc)} TTC (d'après les dates de règlement saisies${s.paymentsCount === 0 ? " ; aucun virement bancaire n'est rapproché" : ""}).`,
    `À encaisser : ${formatEUR(stats.a_encaisser_ttc)} TTC sur ${stats.factures_ouvertes} facture(s), dont ${formatEUR(stats.en_retard_ttc)} en retard (${stats.factures_en_retard}).`,
    `Alertes : ${stats.alertes_urgentes} urgente(s), ${stats.alertes_attention} à surveiller, ${stats.alertes_info} d'information.`,
    ...(top.length ? ["À regarder en premier :", ...top] : ["Rien d'anormal détecté."])
  ].join("\n");

  return { summary, stats, alerts, actions, tasks, events, memory };
}

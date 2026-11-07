import { contractIssues, type ContractLike } from "@/lib/domain/contract-check";
import {
  ASSIGN_LABEL,
  classifyAssignment,
  type AssignInput,
} from "./assignment";
import type { AgentKey } from "./types";

/**
 * Supervision de « À faire maintenant » : fonction PURE (aucune écriture, aucune donnée fictive).
 * Chaque situation du CRM devient UNE alerte par élément concerné, avec : l'agent responsable, la priorité,
 * la raison, l'action proposée et le lien direct. L'identité d'une alerte est `dedupe_key` : elle ne peut pas
 * être comptée deux fois, ni d'un passage à l'autre, ni entre le tableau « À faire » et les analyses des agents.
 * JARVIS propose ; il ne modifie jamais une affectation, une facture, un contrat ou une donnée.
 */
export type Severity = "urgent" | "attention" | "info";
export interface SupervisedAlert {
  /** Identité stable : même clé = même situation, jamais comptée deux fois. */
  dedupe_key: string;
  /** Famille de l'alerte (équivalent d'une ligne de « À faire maintenant »). */
  code: string;
  agent: AgentKey;
  severity: Severity;
  /** Ce qui se passe. */
  title: string;
  /** Pourquoi c'est une alerte. */
  reason: string;
  entity_type:
    | "invoice"
    | "quote"
    | "client"
    | "contract"
    | "intervention"
    | "payment"
    | "request"
    | "issue"
    | "mail";
  entity_id: string;
  entity_label: string;
  /** Correction proposée (texte). Rien n'est exécuté sans votre accord. */
  proposal: string;
  /** Accès direct à l'élément concerné. */
  href: string;
  /** Nombre d'éléments regroupés (affectation à confirmer par contrat) ; 1 sinon. */
  count: number;
}

export const FAMILY: Record<string, { label: string; agent: AgentKey }> = {
  mail_fail: { label: "E-mail en échec", agent: "finance" },
  not_arrived: { label: "Intervenant pas encore arrivé", agent: "operations" },
  claim: { label: "Réclamation client ouverte", agent: "relation" },
  request_late: {
    label: "Demande de devis sans traitement depuis plus de 24 h",
    agent: "relation",
  },
  request_new: { label: "Nouvelle demande de devis", agent: "relation" },
  prospect_to_contact: { label: "Prospect à contacter", agent: "commercial" },
  quote_accepted: {
    label: "Devis accepté à facturer ou à mettre en contrat",
    agent: "finance",
  },
  quote_noanswer: { label: "Devis sans réponse", agent: "commercial" },
  invoice_draft: {
    label: "Facture brouillon à relire et valider",
    agent: "finance",
  },
  invoice_unsent: {
    label: "Facture émise en attente d'envoi",
    agent: "finance",
  },
  invoice_late: { label: "Facture en retard de paiement", agent: "finance" },
  payment_unmatched: {
    label: "Paiement bancaire à rapprocher",
    agent: "finance",
  },
  issue_anomaly: {
    label: "Anomalie signalée sur une mission",
    agent: "operations",
  },
  mission_to_check: { label: "Mission « à vérifier »", agent: "operations" },
  mission_to_validate: {
    label: "Mission terminée à valider pour facturation",
    agent: "finance",
  },
  mission_to_confirm: {
    label: "Passage passé à confirmer",
    agent: "operations",
  },
  mission_unassigned: {
    label: "Mission sans intervenant",
    agent: "operations",
  },
  mission_assign_confirm: {
    label: "Affectation à confirmer",
    agent: "operations",
  },
  mission_unbilled: {
    label: "Prestation réalisée jamais facturée",
    agent: "finance",
  },
  contract_incomplete: { label: "Contrat actif incomplet", agent: "finance" },
  client_no_email: {
    label: "Client actif sans adresse e-mail",
    agent: "commercial",
  },
};

export interface AlertsSettings {
  unpaid_alert_days: number;
  reminder_manual_days: number;
  quote_followup_days: number;
  large_amount_threshold_ht: number;
}
export interface AlertsSnapshot {
  today: string;
  /** Minutes écoulées depuis minuit (heure de Paris), pour « pas encore arrivé ». */
  nowMinutes: number;
  settings: AlertsSettings;
  mailFailures: {
    id: string;
    to_email: string;
    subject: string | null;
    error: string | null;
    sent_at: string;
  }[];
  notArrived: {
    id: string;
    title: string;
    client_name: string | null;
    start_time: string;
    staff_name: string | null;
  }[];
  claims: {
    id: string;
    severity: string;
    description: string;
    client_name: string;
  }[];
  anomalies: {
    id: string;
    severity: string;
    description: string;
    client_name: string;
  }[];
  requests: { id: string; name: string; received_at: string }[];
  prospects: { id: string; name: string }[];
  quotesAccepted: {
    id: string;
    number: string;
    total_ht: number;
    client_name: string;
    reserved: boolean;
    invoice_id: string | null;
    invoice_status: string | null;
  }[];
  quotesSent: {
    id: string;
    number: string;
    client_name: string;
    sent_at: string | null;
  }[];
  invoices: {
    id: string;
    number: string | null;
    status: string;
    due_date: string | null;
    total_ht: number;
    total_ttc: number;
    client_name: string;
    reserved: boolean;
    billing_month: string | null;
    sent_at: string | null;
  }[];
  payments: {
    id: string;
    amount: number;
    counterparty: string | null;
    label: string | null;
  }[];
  missionsToCheck: {
    id: string;
    title: string;
    client_name: string | null;
    scheduled_date: string;
  }[];
  missionsToValidate: {
    id: string;
    title: string;
    client_name: string | null;
    scheduled_date: string;
  }[];
  missionsToConfirm: {
    id: string;
    title: string;
    client_name: string | null;
    scheduled_date: string;
  }[];
  /** Interventions planifiées des 7 prochains jours (toutes, avec ou sans intervenant). */
  upcoming: (AssignInput & { id: string; contract_id: string | null })[];
  missionsUnbilled: {
    id: string;
    title: string;
    client_name: string | null;
    scheduled_date: string;
  }[];
  contracts: (ContractLike & {
    id: string;
    label: string;
    client_name: string;
  })[];
  clientsNoEmail: { id: string; name: string }[];
}

const dayDiff = (a: string, b: string) =>
  Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000,
  );
const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const fr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const sevOf = (s: string): Severity =>
  s === "haute" ? "urgent" : s === "faible" ? "info" : "attention";

export function superviseAlerts(s: AlertsSnapshot): SupervisedAlert[] {
  const out: SupervisedAlert[] = [];
  const push = (
    a: Omit<SupervisedAlert, "agent" | "count"> & { count?: number },
  ) => out.push({ agent: FAMILY[a.code].agent, count: 1, ...a });

  for (const m of s.mailFailures)
    push({
      dedupe_key: `mail:${m.id}`,
      code: "mail_fail",
      severity: "urgent",
      title: `E-mail non remis à ${m.to_email}`,
      reason: `Envoi du ${m.sent_at.slice(0, 10)} en échec${m.error ? ` : ${m.error.slice(0, 120)}` : ""}${m.subject ? ` (objet « ${m.subject.slice(0, 60)} »)` : ""}`,
      entity_type: "mail",
      entity_id: m.id,
      entity_label: m.to_email,
      proposal:
        "Vérifier l'adresse du destinataire, puis renvoyer le document ou joindre le client.",
      href: "/journal",
    });
  for (const r of s.notArrived) {
    const [h, mi] = r.start_time.split(":").map(Number),
      late = s.nowMinutes - (h * 60 + mi);
    push({
      dedupe_key: `arrive:${r.id}`,
      code: "not_arrived",
      severity: "urgent",
      title: `${r.staff_name ?? "Intervenant"} pas encore arrivé : ${r.client_name ?? r.title}`,
      reason: `Prévu à ${r.start_time.slice(0, 5)}, aucune arrivée enregistrée ${late} min plus tard.`,
      entity_type: "intervention",
      entity_id: r.id,
      entity_label: `${r.client_name ?? ""} ${r.title}`.trim(),
      proposal:
        "Appeler l'intervenant, puis prévenir le client si le retard se confirme.",
      href: "/sur-place",
    });
  }
  for (const c of s.claims)
    push({
      dedupe_key: `claim:${c.id}`,
      code: "claim",
      severity: "urgent",
      title: `Réclamation de ${c.client_name}`,
      reason: c.description.slice(0, 160),
      entity_type: "issue",
      entity_id: c.id,
      entity_label: c.client_name,
      proposal:
        "Contacter le client, comprendre le problème, proposer une solution (reprise, geste commercial à valider).",
      href: "/missions/problemes",
    });
  for (const a of s.anomalies)
    push({
      dedupe_key: `anomaly:${a.id}`,
      code: "issue_anomaly",
      severity: sevOf(a.severity),
      title: `Anomalie sur une mission : ${a.client_name}`,
      reason: a.description.slice(0, 160),
      entity_type: "issue",
      entity_id: a.id,
      entity_label: a.client_name,
      proposal:
        "Examiner l'anomalie, corriger ou la clôturer avec une résolution.",
      href: "/missions/problemes",
    });
  return finalise(out, s);
}

/** Les familles qui demandent des calculs de dates sont traitées ici (séparé pour garder la lecture simple). */
function finalise(
  out: SupervisedAlert[],
  s: AlertsSnapshot,
): SupervisedAlert[] {
  const push = (
    a: Omit<SupervisedAlert, "agent" | "count"> & { count?: number },
  ) => out.push({ agent: FAMILY[a.code].agent, count: 1, ...a });
  const nowMs = Date.parse(`${s.today}T12:00:00Z`);

  for (const r of s.requests) {
    const ageH = Math.max(
        0,
        Math.round((nowMs - Date.parse(r.received_at)) / 3_600_000),
      ),
      late = ageH >= 24;
    push({
      dedupe_key: `request:${r.id}`,
      code: late ? "request_late" : "request_new",
      severity: late ? "urgent" : "attention",
      title: `Demande de devis de ${r.name}`,
      reason: late
        ? "Reçue il y a plus de 24 h et toujours non traitée."
        : "Nouvelle demande reçue depuis le site, à qualifier.",
      entity_type: "request",
      entity_id: r.id,
      entity_label: r.name,
      proposal:
        "Qualifier la demande, préparer un devis (brouillon) ou répondre au prospect.",
      href: "/demandes",
    });
  }
  for (const p of s.prospects)
    push({
      dedupe_key: `prospect:${p.id}`,
      code: "prospect_to_contact",
      severity: "attention",
      title: `Prospect à contacter : ${p.name}`,
      reason: "Étape « à contacter » du suivi commercial.",
      entity_type: "client",
      entity_id: p.id,
      entity_label: p.name,
      proposal: "Préparer un message de premier contact (brouillon à valider).",
      href: "/clients?etape=a_contacter",
    });
  for (const q of s.quotesAccepted.filter(
    (x) => !x.invoice_id || x.invoice_status === "annule",
  )) {
    const big = q.total_ht > s.settings.large_amount_threshold_ht;
    push({
      dedupe_key: `quote-accepted:${q.id}`,
      code: "quote_accepted",
      severity: q.reserved ? "urgent" : big ? "attention" : "attention",
      title: `${q.number} (${q.client_name}) accepté, à facturer ou à mettre en contrat`,
      reason:
        `${q.reserved ? "Contact réservé : traitement patron uniquement. " : ""}${big ? `Montant de ${eur(q.total_ht)} HT au-dessus du seuil de ${eur(s.settings.large_amount_threshold_ht)}. ` : ""}Aucune facture active n'est rattachée à ce devis.`.trim(),
      entity_type: "quote",
      entity_id: q.id,
      entity_label: `${q.number} ${q.client_name}`,
      proposal:
        "Préparer la facture ou le contrat correspondant en brouillon, pour votre validation.",
      href: `/devis/${q.id}`,
    });
  }
  for (const q of s.quotesSent) {
    const days = q.sent_at
      ? Math.floor((nowMs - Date.parse(q.sent_at)) / 86_400_000)
      : null;
    push({
      dedupe_key: `quote-noanswer:${q.id}`,
      code: "quote_noanswer",
      severity: "attention",
      title: `${q.number} (${q.client_name}) sans réponse`,
      reason: `Envoyé il y a ${days ?? "?"} jours, au-delà du délai de relance de ${s.settings.quote_followup_days} jours.`,
      entity_type: "quote",
      entity_id: q.id,
      entity_label: `${q.number} ${q.client_name}`,
      proposal: "Préparer une relance courte (brouillon à valider).",
      href: "/devis?statut=envoye",
    });
  }
  for (const i of s.invoices) {
    const label = `${i.number ?? "Brouillon"} ${i.client_name}`;
    if (i.status === "brouillon")
      push({
        dedupe_key: `draft:${i.id}`,
        code: "invoice_draft",
        severity: i.reserved ? "urgent" : "attention",
        title: `Brouillon de ${eur(i.total_ht)} HT (${i.client_name}) à relire et valider`,
        reason:
          `${i.reserved ? "Contact réservé. " : ""}${i.total_ht > s.settings.large_amount_threshold_ht ? `Montant au-dessus du seuil de ${eur(s.settings.large_amount_threshold_ht)} HT. ` : ""}Validation manuelle requise avant émission.`.trim(),
        entity_type: "invoice",
        entity_id: i.id,
        entity_label: label,
        proposal:
          "Relire les lignes, la TVA et la date, puis valider ou supprimer le brouillon.",
        href: `/factures/${i.id}`,
      });
    if (i.status === "en_retard" && i.due_date) {
      const days = Math.max(0, dayDiff(i.due_date, s.today)),
        manual = days >= s.settings.reminder_manual_days;
      push({
        dedupe_key: `late:${i.id}`,
        code: "invoice_late",
        severity:
          i.reserved || manual || days >= 15
            ? "urgent"
            : days >= s.settings.unpaid_alert_days
              ? "attention"
              : "info",
        title: `${label} impayée depuis ${days} jours`,
        reason: `Échéance dépassée du ${fr(i.due_date)}, solde de ${eur(i.total_ttc)} TTC.${manual ? " Au-delà du délai, une action manuelle (appel, courrier) est nécessaire." : ""}${i.reserved ? " Contact réservé : aucune relance automatique." : ""}`,
        entity_type: "invoice",
        entity_id: i.id,
        entity_label: label,
        proposal: manual
          ? "Appeler le client, puis décider d'un courrier de relance (à valider)."
          : "Préparer la relance de niveau suivant (brouillon à valider).",
        href: `/factures/${i.id}`,
      });
    }
    if (
      ["envoye", "en_retard"].includes(i.status) &&
      i.billing_month &&
      !i.sent_at
    )
      push({
        dedupe_key: `unsent:${i.id}`,
        code: "invoice_unsent",
        severity: "attention",
        title: `${label} émise automatiquement, pas encore envoyée`,
        reason: `Facture de ${i.billing_month} émise sans date d'envoi.`,
        entity_type: "invoice",
        entity_id: i.id,
        entity_label: label,
        proposal:
          "Vérifier les destinataires puis envoyer la facture (à valider).",
        href: "/factures?statut=a_envoyer",
      });
  }
  for (const p of s.payments)
    push({
      dedupe_key: `payment:${p.id}`,
      code: "payment_unmatched",
      severity: "attention",
      title: `Paiement de ${eur(p.amount)} à rapprocher${p.counterparty ? ` (${p.counterparty})` : ""}`,
      reason: `${p.label ?? "Virement"} non rattaché à une facture.`,
      entity_type: "payment",
      entity_id: p.id,
      entity_label: p.counterparty ?? eur(p.amount),
      proposal:
        "Rapprocher le paiement de la facture correspondante (à valider).",
      href: "/paiements",
    });
  const mission = (
    code: string,
    rows: {
      id: string;
      title: string;
      client_name: string | null;
      scheduled_date: string;
    }[],
    key: string,
    severity: Severity,
    title: (r: { title: string; client_name: string | null }) => string,
    reason: string,
    proposal: string,
    href: string,
  ) => {
    for (const r of rows)
      push({
        dedupe_key: `${key}:${r.id}`,
        code,
        severity,
        title: title(r),
        reason: `${reason} (prestation du ${fr(r.scheduled_date)})`,
        entity_type: "intervention",
        entity_id: r.id,
        entity_label: `${r.client_name ?? ""} ${r.title}`.trim(),
        proposal,
        href,
      });
  };
  mission(
    "mission_to_validate",
    s.missionsToValidate,
    "validate",
    "attention",
    (r) =>
      `Mission terminée à valider pour facturation : ${r.client_name ?? r.title}`,
    "Terminée mais non validée, donc non facturable",
    "Contrôler la mission, puis la valider pour qu'elle alimente la facture.",
    "/missions?vue=statut&etape=terminee",
  );
  mission(
    "mission_to_check",
    s.missionsToCheck,
    "check",
    "attention",
    (r) => `Mission « à vérifier » : ${r.client_name ?? r.title}`,
    "Une anomalie ouverte ou un contrôle est attendu avant validation",
    "Examiner la mission et lever le point de vérification.",
    "/missions?vue=statut&etape=a_verifier",
  );
  mission(
    "mission_to_confirm",
    s.missionsToConfirm,
    "confirm",
    "attention",
    (r) => `Passage passé à confirmer : ${r.client_name ?? r.title}`,
    "Date passée, statut encore « planifié » : le passage alimente la facture du mois",
    "Confirmer que le passage a eu lieu, ou l'annuler.",
    "/planning?filtre=a_confirmer",
  );
  mission(
    "mission_unbilled",
    s.missionsUnbilled,
    "unbilled",
    "attention",
    (r) => `Prestation réalisée jamais facturée : ${r.client_name ?? r.title}`,
    "Réalisée sur un mois passé et facturable, sans facture",
    "Préparer la facture correspondante en brouillon.",
    "/planning?filtre=non_facturees",
  );

  // Affectations : règles du dirigeant. Les interventions assurées par lui ou attribuées par règle ne sont PAS des oublis.
  const groups = new Map<
    string,
    {
      label: string;
      n: number;
      first: string;
      ids: string[];
      contract: string | null;
    }
  >();
  for (const i of s.upcoming) {
    const a = classifyAssignment(i, s.today);
    if (a.cls === "sans_intervenant")
      push({
        dedupe_key: `unassigned:${i.id}`,
        code: "mission_unassigned",
        severity: "urgent",
        title: `Mission sans intervenant : ${i.client_name ?? i.title}`,
        reason: `${a.reason} (prestation du ${fr(i.scheduled_date)}).`,
        entity_type: "intervention",
        entity_id: i.id,
        entity_label: `${i.client_name ?? ""} ${i.title}`.trim(),
        proposal:
          "Choisir un intervenant disponible (affectation à valider par vous).",
        href: "/missions?vue=semaine&agent=aucun",
      });
    if (a.cls === "a_confirmer") {
      const k = i.contract_id ?? i.title,
        g = groups.get(k) ?? {
          label: i.contract_label ?? i.title,
          n: 0,
          first: i.scheduled_date,
          ids: [],
          contract: i.contract_id,
        };
      g.n++;
      g.ids.push(i.id);
      if (i.scheduled_date < g.first) g.first = i.scheduled_date;
      groups.set(k, g);
    }
  }
  for (const [k, g] of groups)
    push({
      dedupe_key: `assign-confirm:${k}`,
      code: "mission_assign_confirm",
      severity: "info",
      title: `Affectation à confirmer : ${g.label} (${g.n} passage${g.n > 1 ? "s" : ""} sous 7 jours)`,
      reason: `${ASSIGN_LABEL.a_confirmer} : aucun intervenant enregistré et aucune règle ne s'applique. Premier passage le ${fr(g.first)}.`,
      entity_type: g.contract ? "contract" : "intervention",
      entity_id: g.contract ?? g.ids[0],
      entity_label: g.label,
      proposal:
        "Confirmer qui assure ce contrat à partir du 11/11. L'affectation de tous les passages pourra être proposée en un clic (à valider).",
      href: "/missions?vue=semaine&agent=aucun",
      count: g.n,
    });

  for (const k of s.contracts) {
    const iss = contractIssues({ ...k }),
      miss = [...iss.blocking, ...iss.warnings];
    if (miss.length)
      push({
        dedupe_key: `contract:${k.id}`,
        code: "contract_incomplete",
        severity: iss.blocking.length ? "urgent" : "attention",
        title: `Contrat incomplet : ${k.label}`,
        reason: `Manque : ${miss.join(", ")}. ${iss.blocking.length ? "Éléments bloquants pour la facturation ou le planning." : "Planning et suivi peu fiables."}`,
        entity_type: "contract",
        entity_id: k.id,
        entity_label: `${k.label} (${k.client_name})`,
        proposal:
          "Compléter le contrat (jours, durée, intervenant…). Les informations manquantes sont listées ; rien n'est modifié sans vous.",
        href: `/contrats?filtre=incomplets`,
      });
  }
  for (const c of s.clientsNoEmail)
    push({
      dedupe_key: `no-email:${c.id}`,
      code: "client_no_email",
      severity: "info",
      title: `Client actif sans e-mail : ${c.name}`,
      reason: "Ses factures ne peuvent pas lui être envoyées automatiquement.",
      entity_type: "client",
      entity_id: c.id,
      entity_label: c.name,
      proposal:
        "Demander l'adresse e-mail au client et la saisir sur sa fiche.",
      href: "/clients?filtre=sans_email",
    });
  
  const order = { urgent: 0, attention: 1, info: 2 } as const;
  return out.sort(
    (a, b) =>
      order[a.severity] - order[b.severity] ||
      a.code.localeCompare(b.code) ||
      a.dedupe_key.localeCompare(b.dedupe_key),
  );
}

export type TrackedStatus = "open" | "acknowledged" | "resolved";
export interface Tracked {
  status: TrackedStatus;
  first_seen_at: string;
  resolved_at: string | null;
  resolved_reason: string | null;
}
export interface AlertSummary {
  open: number;
  priority: number;
  inProgress: number;
  resolved: number;
  /** Faux tant que le suivi n'est pas installé : « en cours » et « résolues » ne peuvent alors pas être connues. */
  tracking: boolean;
  byAgent: Record<
    string,
    { open: number; priority: number; inProgress: number; resolved: number }
  >;
}

/** Tableau de bord global. `tracked` = lignes jarvis_alerts (clé agent:dedupe_key) ; absent = suivi non installé. */
export function summarizeAlerts(
  live: SupervisedAlert[],
  tracked: Map<string, Tracked> | null,
): AlertSummary {
  const by: AlertSummary["byAgent"] = {};
  const row = (k: string) =>
    (by[k] ??= { open: 0, priority: 0, inProgress: 0, resolved: 0 });
  let open = 0,
    priority = 0,
    inProgress = 0,
    resolved = 0;
  const seen = new Set<string>();
  for (const a of live) {
    const key = `${a.agent}:${a.dedupe_key}`;
    if (seen.has(key)) continue; // jamais deux fois la même situation
    seen.add(key);
    const t = tracked?.get(key);
    const r = row(a.agent);
    if (t?.status === "acknowledged") {
      inProgress++;
      r.inProgress++;
    } else {
      open++;
      r.open++;
    }
    if (a.severity === "urgent") {
      priority++;
      r.priority++;
    }
  }
  if (tracked)
    for (const [key, t] of tracked)
      if (t.status === "resolved") {
        resolved++;
        row(key.split(":")[0]).resolved++;
      }
  return {
    open,
    priority,
    inProgress,
    resolved,
    tracking: tracked !== null,
    byAgent: by,
  };
}

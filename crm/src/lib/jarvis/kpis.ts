import { addDays, monthOf } from "@/lib/domain/dates";

/**
 * Moteur d'indicateurs : fonction PURE (aucune écriture, aucune donnée d'exemple).
 * Règles :
 *  - un chiffre n'existe que s'il est calculé depuis des lignes réelles du CRM ;
 *  - si la source n'a pas pu être lue, ou si le calcul est impossible, la valeur est `null` avec une raison lisible ;
 *  - jamais de zéro inventé : 0 signifie « il y a des données et le résultat est 0 ».
 */
export type Dept = "finance" | "commercial" | "operations";
export type Unit = "eur" | "int" | "pct";
export type Source =
  | "invoices"
  | "quotes"
  | "quote_requests"
  | "clients"
  | "contracts"
  | "interventions"
  | "staff"
  | "supplier_payments";

export interface Kpi {
  id: string;
  dept: Dept;
  label: string;
  value: number | null;
  unit: Unit;
  /** Précision affichée sous le chiffre (périmètre, effectif). */
  detail: string | null;
  /** Pourquoi la valeur est absente (jamais vide quand `value` est null). */
  reason: string | null;
  /** Origine dans le CRM, affichée au survol. */
  source: string;
  /** Date de la dernière modification d'une ligne qui compose le chiffre (ISO), ou null si aucune ligne. */
  lastChangeAt: string | null;
  lines?: { label: string; value: string }[];
}

export interface InvoiceRow {
  number: string | null;
  client_name: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  total_ht: number;
  total_ttc: number;
  paid_amount: number;
  paid_at: string | null;
  updated_at: string;
}
export interface QuoteRow {
  status: string;
  issue_date: string;
  sent_at: string | null;
  accepted_at: string | null;
  total_ht: number;
  updated_at: string;
}
export interface RequestRow {
  status: string;
  received_at: string;
}
export interface ClientRow {
  status: string;
  created_at: string;
  updated_at: string;
}
export interface ContractRow {
  status: string;
  updated_at: string;
}
export interface IntervRow {
  status: string;
  scheduled_date: string;
  staff_id: string | null;
  assignee: string | null;
  client_name: string | null;
  title: string;
  updated_at: string;
}
export interface StaffRow {
  id: string;
  full_name: string;
  active: boolean;
  updated_at: string;
}
export interface SupplierPaymentRow {
  paid_on: string;
  amount: number;
  created_at: string;
}

export interface KpiSnapshot {
  today: string;
  computedAt: string;
  invoices: InvoiceRow[] | null;
  quotes: QuoteRow[] | null;
  requests: RequestRow[] | null;
  clients: ClientRow[] | null;
  contracts: ContractRow[] | null;
  interventions: IntervRow[] | null;
  staff: StaffRow[] | null;
  supplierPayments: SupplierPaymentRow[] | null;
  /** Message d'erreur par source illisible (jamais avalé en silence). */
  errors: Partial<Record<Source, string>>;
}
export interface KpiSet {
  computedAt: string;
  today: string;
  kpis: Kpi[];
  errors: Partial<Record<Source, string>>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0));
const latest = (xs: (string | null | undefined)[]) =>
  xs
    .filter((x): x is string => !!x)
    .sort()
    .pop() ?? null;
const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const plural = (n: number, s: string, p = `${s}s`) => `${n} ${n > 1 ? p : s}`;
const EMITTED = (s: string) => s !== "brouillon" && s !== "annule";
const OPEN = (s: string) => s === "envoye" || s === "en_retard";
const parisDay = (iso: string) =>
  new Date(Date.parse(iso)).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Paris",
  });
const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function absent(
  id: string,
  dept: Dept,
  label: string,
  unit: Unit,
  source: Source | string,
  reason: string,
): Kpi {
  return {
    id,
    dept,
    label,
    value: null,
    unit,
    detail: null,
    reason,
    source,
    lastChangeAt: null,
  };
}

export function computeKpis(s: KpiSnapshot): KpiSet {
  const out: Kpi[] = [];
  const month = monthOf(s.today),
    year = s.today.slice(0, 4),
    in7 = addDays(s.today, 7),
    ago30 = addDays(s.today, -30),
    ago90 = addDays(s.today, -90);
  const err = (k: Source) =>
    `Lecture impossible (${k}) : ${s.errors[k] ?? "source indisponible"}`;

  /* ───────── Finance ───────── */
  const F = (
    id: string,
    label: string,
    unit: Unit,
    source: string,
    f: (
      inv: InvoiceRow[],
    ) => Omit<Kpi, "id" | "dept" | "label" | "unit" | "source" | "reason">,
  ) => {
    if (!s.invoices) {
      out.push(absent(id, "finance", label, unit, source, err("invoices")));
      return;
    }
    out.push({
      id,
      dept: "finance",
      label,
      unit,
      source,
      reason: null,
      ...f(s.invoices),
    });
  };
  F(
    "fin.ca_mois",
    "CA du mois (HT)",
    "eur",
    "Factures émises du mois (hors brouillons et annulées)",
    (inv) => {
      const x = inv.filter(
        (i) => EMITTED(i.status) && monthOf(i.issue_date) === month,
      );
      return {
        value: sum(x.map((i) => i.total_ht)),
        detail: `${plural(x.length, "facture émise", "factures émises")} ce mois`,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  F(
    "fin.ca_annee",
    "CA de l'année (HT)",
    "eur",
    "Factures émises de l'année (hors brouillons et annulées)",
    (inv) => {
      const x = inv.filter(
        (i) => EMITTED(i.status) && i.issue_date.startsWith(year),
      );
      return {
        value: sum(x.map((i) => i.total_ht)),
        detail: `${plural(x.length, "facture émise", "factures émises")} en ${year}`,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  F(
    "fin.emises_mois",
    "Factures émises ce mois",
    "int",
    "Factures émises du mois",
    (inv) => {
      const x = inv.filter(
        (i) => EMITTED(i.status) && monthOf(i.issue_date) === month,
      );
      return {
        value: x.length,
        detail: null,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  F(
    "fin.encaisse_mois",
    "Encaissé ce mois (TTC)",
    "eur",
    "Factures payées dont la date de règlement tombe ce mois",
    (inv) => {
      const x = inv.filter(
        (i) =>
          i.status === "paye" &&
          i.paid_at &&
          monthOf(parisDay(i.paid_at)) === month,
      );
      return {
        value: sum(x.map((i) => i.paid_amount)),
        detail: `${plural(x.length, "règlement")}`,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  F(
    "fin.encaisse_total",
    "Encaissé au total (TTC)",
    "eur",
    "Toutes les factures payées",
    (inv) => {
      const x = inv.filter((i) => i.status === "paye");
      return {
        value: sum(x.map((i) => i.paid_amount)),
        detail: `${plural(x.length, "facture payée", "factures payées")}`,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  F(
    "fin.en_attente",
    "En attente de paiement (TTC)",
    "eur",
    "Factures envoyées non soldées",
    (inv) => {
      const x = inv.filter((i) => OPEN(i.status));
      return {
        value: sum(x.map((i) => i.total_ttc - i.paid_amount)),
        detail: `${plural(x.length, "facture ouverte", "factures ouvertes")}`,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  F(
    "fin.impayes",
    "Impayés en retard (TTC)",
    "eur",
    "Factures ouvertes dont l'échéance est dépassée",
    (inv) => {
      const x = inv
        .filter(
          (i) => OPEN(i.status) && i.due_date !== null && i.due_date < s.today,
        )
        .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
      return {
        value: sum(x.map((i) => i.total_ttc - i.paid_amount)),
        detail: x.length
          ? `${plural(x.length, "facture dépasse", "factures dépassent")} l'échéance`
          : "Aucune facture en retard",
        lastChangeAt: latest(x.map((i) => i.updated_at)),
        lines: x
          .slice(0, 6)
          .map((i) => ({
            label: `${i.number ?? "—"} · ${i.client_name}`,
            value: `${dayDiff(i.due_date!, s.today)} j · ${eur(i.total_ttc - i.paid_amount)}`,
          })),
      };
    },
  );
  if (!s.supplierPayments)
    out.push(
      absent(
        "fin.depenses_mois",
        "finance",
        "Dépenses fournisseurs du mois",
        "eur",
        "Paiements fournisseurs",
        err("supplier_payments"),
      ),
    );
  else {
    const x = s.supplierPayments.filter((p) => monthOf(p.paid_on) === month);
    out.push({
      id: "fin.depenses_mois",
      dept: "finance",
      label: "Dépenses fournisseurs du mois",
      unit: "eur",
      source: "Paiements fournisseurs saisis ou rapprochés",
      reason: null,
      value: sum(x.map((p) => p.amount)),
      detail: `${plural(x.length, "paiement")}`,
      lastChangeAt: latest(x.map((p) => p.created_at)),
    });
  }
  out.push(
    absent(
      "fin.rentabilite",
      "finance",
      "Rentabilité",
      "eur",
      "Factures moins coûts de revient",
      "Non calculable : les coûts de revient par prestation ne sont pas saisis.",
    ),
  );

  /* ───────── Commercial ───────── */
  if (!s.clients) {
    out.push(
      absent(
        "com.prospects",
        "commercial",
        "Prospects",
        "int",
        "Clients au statut prospect",
        err("clients"),
      ),
      absent(
        "com.prospects_30j",
        "commercial",
        "Nouveaux prospects (30 jours)",
        "int",
        "Prospects créés ces 30 derniers jours",
        err("clients"),
      ),
    );
  } else {
    const p = s.clients.filter((c) => c.status === "prospect"),
      n = p.filter((c) => parisDay(c.created_at) >= ago30);
    out.push({
      id: "com.prospects",
      dept: "commercial",
      label: "Prospects",
      unit: "int",
      source: "Clients au statut prospect",
      reason: null,
      value: p.length,
      detail: `dont ${n.length} nouveau${n.length > 1 ? "x" : ""} sur 30 jours`,
      lastChangeAt: latest(p.map((c) => c.updated_at)),
    });
    out.push({
      id: "com.prospects_30j",
      dept: "commercial",
      label: "Nouveaux prospects (30 jours)",
      unit: "int",
      source: "Prospects créés ces 30 derniers jours",
      reason: null,
      value: n.length,
      detail: null,
      lastChangeAt: latest(n.map((c) => c.created_at)),
    });
  }
  if (!s.requests)
    out.push(
      absent(
        "com.demandes",
        "commercial",
        "Demandes de devis à traiter",
        "int",
        "Demandes reçues depuis le site",
        err("quote_requests"),
      ),
    );
  else {
    const x = s.requests.filter((r) => r.status === "nouvelle");
    out.push({
      id: "com.demandes",
      dept: "commercial",
      label: "Demandes de devis à traiter",
      unit: "int",
      source: "Demandes reçues depuis le site, statut nouvelle",
      reason: null,
      value: x.length,
      detail: null,
      lastChangeAt: latest(x.map((r) => r.received_at)),
    });
  }
  if (!s.quotes) {
    for (const [id, label] of [
      ["com.devis_attente", "Devis en attente de réponse"],
      ["com.devis_envoyes_mois", "Devis envoyés ce mois"],
      ["com.devis_acceptes_mois", "Devis acceptés ce mois"],
      ["com.devis_refuses_mois", "Devis refusés ce mois"],
      ["com.conversion", "Taux de conversion (90 jours)"],
    ] as const)
      out.push(
        absent(
          id,
          "commercial",
          label,
          id === "com.conversion" ? "pct" : "int",
          "Devis",
          err("quotes"),
        ),
      );
  } else {
    const q = s.quotes,
      wait = q.filter((x) => x.status === "envoye");
    out.push({
      id: "com.devis_attente",
      dept: "commercial",
      label: "Devis en attente de réponse",
      unit: "int",
      source: "Devis envoyés, ni acceptés ni refusés",
      reason: null,
      value: wait.length,
      detail: wait.length
        ? `${eur(sum(wait.map((x) => x.total_ht)))} HT en jeu`
        : null,
      lastChangeAt: latest(wait.map((x) => x.updated_at)),
    });
    const sent = q.filter(
      (x) => x.sent_at && monthOf(parisDay(x.sent_at)) === month,
    );
    out.push({
      id: "com.devis_envoyes_mois",
      dept: "commercial",
      label: "Devis envoyés ce mois",
      unit: "int",
      source: "Devis dont la date d'envoi tombe ce mois",
      reason: null,
      value: sent.length,
      detail: null,
      lastChangeAt: latest(sent.map((x) => x.updated_at)),
    });
    const acc = q.filter(
      (x) => x.accepted_at && monthOf(parisDay(x.accepted_at)) === month,
    );
    out.push({
      id: "com.devis_acceptes_mois",
      dept: "commercial",
      label: "Devis acceptés ce mois",
      unit: "int",
      source: "Devis dont la date d'acceptation tombe ce mois",
      reason: null,
      value: acc.length,
      detail: acc.length ? `${eur(sum(acc.map((x) => x.total_ht)))} HT` : null,
      lastChangeAt: latest(acc.map((x) => x.updated_at)),
    });
    const ref = q.filter(
      (x) => x.status === "refuse" && monthOf(parisDay(x.updated_at)) === month,
    );
    out.push({
      id: "com.devis_refuses_mois",
      dept: "commercial",
      label: "Devis refusés ce mois",
      unit: "int",
      source:
        "Devis refusés (la date de refus n'est pas enregistrée : date de dernière modification)",
      reason: null,
      value: ref.length,
      detail: null,
      lastChangeAt: latest(ref.map((x) => x.updated_at)),
    });
    const emitted = q.filter(
        (x) => x.status !== "brouillon" && x.issue_date >= ago90,
      ),
      won = emitted.filter((x) => x.status === "accepte");
    out.push(
      emitted.length
        ? {
            id: "com.conversion",
            dept: "commercial",
            label: "Taux de conversion (90 jours)",
            unit: "pct",
            source: "Devis acceptés / devis émis sur 90 jours",
            reason: null,
            value: Math.round((won.length / emitted.length) * 100),
            detail: `${won.length} accepté${won.length > 1 ? "s" : ""} sur ${emitted.length} émis`,
            lastChangeAt: latest(emitted.map((x) => x.updated_at)),
          }
        : absent(
            "com.conversion",
            "commercial",
            "Taux de conversion (90 jours)",
            "pct",
            "Devis acceptés / devis émis sur 90 jours",
            "Aucun devis émis sur les 90 derniers jours.",
          ),
    );
  }
  if (!s.contracts)
    out.push(
      absent(
        "com.contrats",
        "commercial",
        "Contrats actifs",
        "int",
        "Contrats au statut actif",
        err("contracts"),
      ),
    );
  else {
    const a = s.contracts.filter((c) => c.status === "actif"),
      e = s.contracts.filter((c) => c.status === "en_cours");
    out.push({
      id: "com.contrats",
      dept: "commercial",
      label: "Contrats actifs",
      unit: "int",
      source: "Contrats au statut actif",
      reason: null,
      value: a.length,
      detail: e.length ? `${e.length} en cours de mise en place` : null,
      lastChangeAt: latest(a.map((c) => c.updated_at)),
    });
  }

  /* ───────── Opérations ───────── */
  const O = (
    id: string,
    label: string,
    source: string,
    f: (
      iv: IntervRow[],
    ) => Omit<Kpi, "id" | "dept" | "label" | "unit" | "source" | "reason">,
    unit: Unit = "int",
  ) => {
    if (!s.interventions) {
      out.push(
        absent(id, "operations", label, unit, source, err("interventions")),
      );
      return;
    }
    out.push({
      id,
      dept: "operations",
      label,
      unit,
      source,
      reason: null,
      ...f(s.interventions),
    });
  };
  const planned = (iv: IntervRow[]) =>
    iv.filter((i) => i.status === "planifie");
  O(
    "ops.a_venir",
    "Interventions planifiées à venir",
    "Interventions planifiées dont la date n'est pas passée",
    (iv) => {
      const x = planned(iv).filter((i) => i.scheduled_date >= s.today);
      return {
        value: x.length,
        detail: `${x.filter((i) => i.scheduled_date <= in7).length} dans les 7 prochains jours`,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  O(
    "ops.realisees_mois",
    "Interventions réalisées ce mois",
    "Interventions au statut réalisé, date ce mois",
    (iv) => {
      const x = iv.filter(
        (i) => i.status === "realise" && monthOf(i.scheduled_date) === month,
      );
      return {
        value: x.length,
        detail: null,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  O(
    "ops.retard",
    "Interventions en retard",
    "Interventions planifiées dont la date est passée et non clôturées",
    (iv) => {
      const x = planned(iv)
        .filter((i) => i.scheduled_date < s.today)
        .sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1));
      return {
        value: x.length,
        detail: x.length
          ? "À clôturer ou à replanifier"
          : "Aucune intervention en retard",
        lastChangeAt: latest(x.map((i) => i.updated_at)),
        lines: x
          .slice(0, 6)
          .map((i) => ({
            label: `${i.client_name ?? "Client"} · ${i.title}`,
            value: `${dayDiff(i.scheduled_date, s.today)} j`,
          })),
      };
    },
  );
  O(
    "ops.non_affectees",
    "En attente d'affectation",
    "Interventions à venir sans intervenant",
    (iv) => {
      const x = planned(iv)
        .filter(
          (i) =>
            i.scheduled_date >= s.today &&
            !i.staff_id &&
            !(i.assignee ?? "").trim(),
        )
        .sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1));
      return {
        value: x.length,
        detail: x.length
          ? "Aucun intervenant désigné"
          : "Toutes les interventions ont un intervenant",
        lastChangeAt: latest(x.map((i) => i.updated_at)),
        lines: x
          .slice(0, 6)
          .map((i) => ({
            label: `${i.client_name ?? "Client"} · ${i.title}`,
            value:
              i.scheduled_date.slice(8, 10) +
              "/" +
              i.scheduled_date.slice(5, 7),
          })),
      };
    },
  );
  O(
    "ops.annulees_mois",
    "Interventions annulées ce mois",
    "Interventions annulées, date ce mois",
    (iv) => {
      const x = iv.filter(
        (i) => i.status === "annule" && monthOf(i.scheduled_date) === month,
      );
      return {
        value: x.length,
        detail: null,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
      };
    },
  );
  const names = new Map((s.staff ?? []).map((p) => [p.id, p.full_name]));
  O(
    "ops.affectations_7j",
    "Intervenants mobilisés (7 jours)",
    "Interventions planifiées sur 7 jours, regroupées par intervenant",
    (iv) => {
      const x = planned(iv).filter(
        (i) =>
          i.scheduled_date >= s.today &&
          i.scheduled_date <= in7 &&
          (i.staff_id || (i.assignee ?? "").trim()),
      );
      const by = new Map<string, number>();
      for (const i of x) {
        const k =
          (i.staff_id && names.get(i.staff_id)) || (i.assignee ?? "").trim();
        by.set(k, (by.get(k) ?? 0) + 1);
      }
      return {
        value: by.size,
        detail: `${plural(x.length, "intervention affectée", "interventions affectées")}`,
        lastChangeAt: latest(x.map((i) => i.updated_at)),
        lines: [...by.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([k, n]) => ({ label: k, value: plural(n, "intervention") })),
      };
    },
  );
  if (!s.staff)
    out.push(
      absent(
        "ops.intervenants",
        "operations",
        "Intervenants actifs",
        "int",
        "Fiches équipe actives",
        err("staff"),
      ),
    );
  else {
    const a = s.staff.filter((p) => p.active);
    out.push({
      id: "ops.intervenants",
      dept: "operations",
      label: "Intervenants actifs",
      unit: "int",
      source: "Fiches équipe actives",
      reason: null,
      value: a.length,
      detail: null,
      lastChangeAt: latest(a.map((p) => p.updated_at)),
    });
  }

  return {
    computedAt: s.computedAt,
    today: s.today,
    kpis: out,
    errors: s.errors,
  };
}

/** Fraîcheur d'un chiffre : lu à l'instant (le CRM est interrogé en direct) ; l'âge de la dernière modification est affiché à côté. */
export type Freshness = "ok" | "warn" | "old" | "none";
export function freshnessOf(
  computedAt: string,
  nowMs: number,
): { level: Freshness; label: string } {
  const sec = Math.max(0, Math.round((nowMs - Date.parse(computedAt)) / 1000));
  if (sec < 90)
    return {
      level: "ok",
      label: sec < 5 ? "lu à l'instant" : `lu il y a ${sec} s`,
    };
  if (sec < 900)
    return { level: "warn", label: `lu il y a ${Math.floor(sec / 60)} min` };
  return {
    level: "old",
    label: `lu il y a ${Math.floor(sec / 60)} min : actualisation en panne ?`,
  };
}

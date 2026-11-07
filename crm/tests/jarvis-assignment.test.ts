import { describe, it, expect } from "vitest";
import { classifyAssignment, isAirbnb, tallyAssignments, ASSIGNMENT_RULES, type AssignInput } from "@/lib/jarvis/assignment";
import { computeKpis, type IntervRow, type KpiSnapshot } from "@/lib/jarvis/kpis";

const TODAY = "2026-11-07";
const I = (o: Partial<AssignInput> = {}): AssignInput => ({ scheduled_date: "2026-11-20", staff_id: null, assignee: null, title: "Entretien SEA", client_name: "SEA", contract_label: "Entretien SEA", ...o });
const cls = (o: Partial<AssignInput>, today = TODAY) => classifyAssignment(I(o), today).cls;

describe("règles d'affectation — organisation du dirigeant", () => {
  it("un intervenant enregistré (fiche ou texte) = affectée, quelle que soit la date", () => {
    expect(cls({ staff_id: "s1" })).toBe("affectee");
    expect(cls({ assignee: "Kevinh", scheduled_date: "2026-11-08" })).toBe("affectee");
    expect(cls({ assignee: "  " })).toBe("a_confirmer");
  });
  it("jusqu'au 10/11 inclus : assurée par le dirigeant, jamais un oubli", () => {
    expect(cls({ scheduled_date: "2026-11-10" })).toBe("organisation_dirigeant");
    expect(cls({ scheduled_date: "2026-11-09" })).toBe("organisation_dirigeant");
    expect(cls({ scheduled_date: "2026-11-11" })).not.toBe("organisation_dirigeant");
  });
  it("Airbnb à partir du 11/11 : attribuée à Esma par règle (sans rien modifier)", () => {
    const a = classifyAssignment(I({ scheduled_date: "2026-11-11", title: "Nettoyage Airbnb, sortie de clients" }), TODAY);
    expect(a).toMatchObject({ cls: "regle_airbnb", expected: "Esma Nouali" });
    expect(classifyAssignment(I({ scheduled_date: "2026-11-10", title: "Nettoyage Airbnb" }), TODAY).cls).toBe("organisation_dirigeant");
  });
  it("entretien d'entreprise après le 11/11 : aucune règle, donc à confirmer (pas un oubli) tant que le passage n'est pas imminent", () => {
    expect(cls({ scheduled_date: "2026-11-14" })).toBe("a_confirmer");
    expect(cls({ scheduled_date: "2026-12-30" })).toBe("a_confirmer");
  });
  it("sans règle et dans moins de 48 h : vraie anomalie « sans intervenant »", () => {
    expect(cls({ scheduled_date: "2026-11-13" }, "2026-11-12")).toBe("sans_intervenant");
    expect(cls({ scheduled_date: "2026-11-14" }, "2026-11-12")).toBe("sans_intervenant");
    expect(cls({ scheduled_date: "2026-11-15" }, "2026-11-12")).toBe("a_confirmer");
  });
  it("détection Airbnb sur titre, client ou contrat", () => {
    expect(isAirbnb({ title: "Ménage", client_name: "CONCIERGERIE EASY STAY", contract_label: null })).toBe(true);
    expect(isAirbnb({ title: "Ménage", client_name: "X", contract_label: "Gestion séjours Paris 16e" })).toBe(true);
    expect(isAirbnb({ title: "Entretien SEA", client_name: "SEA", contract_label: "Entretien SEA" })).toBe(false);
  });
  it("les règles sont celles déclarées par le dirigeant", () => {
    expect(ASSIGNMENT_RULES).toMatchObject({ ownerCoversUntil: "2026-11-10", airbnbFrom: "2026-11-11", airbnbStaff: "Esma Nouali" });
  });
});

describe("indicateurs d'affectation (situation réelle du 7 nov.)", () => {
  const iv = (o: Partial<IntervRow>): IntervRow => ({ status: "planifie", scheduled_date: "2026-11-20", staff_id: null, assignee: null, client_name: "SEA", title: "Entretien SEA", contract_label: "Entretien SEA", updated_at: "2026-11-05T10:00:00Z", ...o });
  const snap = (interventions: IntervRow[]): KpiSnapshot => ({ today: TODAY, computedAt: "2026-11-07T12:00:00Z", invoices: [], quotes: [], requests: [], clients: [], contracts: [], interventions, staff: [], supplierPayments: [], errors: {} });
  it("la photo réelle : 1 affectée, 1 période dirigeant, 44 à confirmer, 0 sans intervenant", () => {
    const rows = [iv({ scheduled_date: "2026-11-08", assignee: "Kevinh", title: "Nettoyage Airbnb", client_name: "Geetha", contract_label: null }), iv({ scheduled_date: "2026-11-10", client_name: "SARB", title: "Entretien SARB OPTIQUE", contract_label: "Entretien SARB OPTIQUE" }), ...Array.from({ length: 44 }, (_, n) => iv({ scheduled_date: `2026-11-${String(11 + (n % 18)).padStart(2, "0")}` }))];
    const set = computeKpis(snap(rows));
    const sans = set.kpis.find((x) => x.id === "ops.sans_intervenant")!, conf = set.kpis.find((x) => x.id === "ops.a_confirmer")!;
    expect(sans.value).toBe(0);
    expect(conf.value).toBe(44);
    expect(Object.fromEntries(sans.lines!.map((l) => [l.label, l.value]))).toMatchObject({
      "Affectées dans le CRM": "1", "Assurées par vous (organisation actuelle)": "1", "Airbnb attribuées à Esma par règle": "0", "Affectation à confirmer": "44", "Réellement sans intervenant": "0"
    });
  });
  it("aucune intervention n'est comptée deux fois : la somme des classes = le nombre d'interventions à venir", () => {
    const rows = [iv({ scheduled_date: "2026-11-08", staff_id: "s" }), iv({ scheduled_date: "2026-11-09" }), iv({ scheduled_date: "2026-11-12", title: "Airbnb", client_name: "X", contract_label: null }), iv({ scheduled_date: "2026-11-30" }), iv({ scheduled_date: "2026-11-08" })];
    const t = tallyAssignments(rows.map((r) => classifyAssignment(r, TODAY)));
    expect(Object.values(t).reduce((a, b) => a + b, 0)).toBe(rows.length);
  });
  it("une affectation réelle n'est jamais modifiée : le module est en lecture seule", () => {
    const { readFileSync } = require("node:fs");
    const src = readFileSync(__dirname + "/../src/lib/jarvis/assignment.ts", "utf8");
    expect(src).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(|supabase/);
  });
});

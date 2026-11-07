import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { computeKpis, freshnessOf, type KpiSnapshot, type InvoiceRow, type IntervRow, type QuoteRow } from "@/lib/jarvis/kpis";

vi.mock("server-only", () => ({}));

const TODAY = "2026-11-07";
const NOW = new Date("2026-11-07T11:00:00Z");
const inv = (o: Partial<InvoiceRow> = {}): InvoiceRow => ({ number: "F-2026-001", client_name: "Client A", status: "envoye", issue_date: "2026-11-02", due_date: "2026-11-17", total_ht: 100, total_ttc: 120, paid_amount: 0, paid_at: null, updated_at: "2026-11-02T10:00:00Z", ...o });
const iv = (o: Partial<IntervRow> = {}): IntervRow => ({ status: "planifie", scheduled_date: "2026-11-10", staff_id: "s1", assignee: null, client_name: "Client A", title: "Ménage", updated_at: "2026-11-05T10:00:00Z", ...o });
const qt = (o: Partial<QuoteRow> = {}): QuoteRow => ({ status: "envoye", issue_date: "2026-10-20", sent_at: "2026-10-20T09:00:00Z", accepted_at: null, total_ht: 200, updated_at: "2026-10-20T09:00:00Z", ...o });
const snap = (o: Partial<KpiSnapshot> = {}): KpiSnapshot => ({
  today: TODAY, computedAt: NOW.toISOString(), invoices: [], quotes: [], requests: [], clients: [], contracts: [], interventions: [], staff: [{ id: "s1", full_name: "Awa Diop", active: true, updated_at: "2026-10-01T00:00:00Z" }], supplierPayments: [], errors: {}, ...o
});
const k = (s: KpiSnapshot, id: string) => computeKpis(s).kpis.find((x) => x.id === id)!;

describe("indicateurs — Finance", () => {
  it("CA du mois : factures émises du mois seulement (ni brouillon, ni annulée, ni autre mois)", () => {
    const s = snap({ invoices: [inv({ total_ht: 100 }), inv({ total_ht: 50, status: "paye", paid_amount: 60, paid_at: "2026-11-03T10:00:00Z" }), inv({ total_ht: 999, status: "brouillon" }), inv({ total_ht: 999, status: "annule" }), inv({ total_ht: 700, issue_date: "2026-10-30" })] });
    expect(k(s, "fin.ca_mois")).toMatchObject({ value: 150, detail: "2 factures émises ce mois" });
    expect(k(s, "fin.ca_annee").value).toBe(850);
  });
  it("encaissé, en attente et impayés : définitions distinctes et sans double compte", () => {
    const s = snap({ invoices: [
      inv({ status: "paye", total_ttc: 120, paid_amount: 120, paid_at: "2026-11-03T10:00:00Z" }),
      inv({ status: "paye", total_ttc: 60, paid_amount: 60, paid_at: "2026-10-03T10:00:00Z", issue_date: "2026-10-01" }),
      inv({ number: "F-2", status: "envoye", total_ttc: 240, due_date: "2026-11-30" }),
      inv({ number: "F-3", status: "envoye", total_ttc: 360, due_date: "2026-11-01", client_name: "Retardataire" })
    ] });
    expect(k(s, "fin.encaisse_mois").value).toBe(120);
    expect(k(s, "fin.encaisse_total").value).toBe(180);
    expect(k(s, "fin.en_attente")).toMatchObject({ value: 600, detail: "2 factures ouvertes" });
    const imp = k(s, "fin.impayes");
    expect(imp.value).toBe(360);
    expect(imp.lines).toEqual([{ label: "F-3 · Retardataire", value: expect.stringContaining("6 j") }]);
  });
  it("aucun impayé : 0 réel avec explication, pas « non disponible »", () => {
    const x = k(snap({ invoices: [inv()] }), "fin.impayes");
    expect(x.value).toBe(0);
    expect(x.detail).toBe("Aucune facture en retard");
  });
  it("la rentabilité n'est JAMAIS inventée : non disponible avec la raison", () => {
    expect(k(snap(), "fin.rentabilite")).toMatchObject({ value: null, reason: expect.stringContaining("coûts de revient") });
  });
  it("une source illisible rend ses indicateurs non disponibles avec le message d'erreur, sans toucher aux autres", () => {
    const s = snap({ invoices: null, errors: { invoices: "permission denied" }, quotes: [qt()] });
    const set = computeKpis(s);
    for (const id of ["fin.ca_mois", "fin.encaisse_total", "fin.en_attente", "fin.impayes"]) expect(set.kpis.find((x) => x.id === id)).toMatchObject({ value: null, reason: expect.stringContaining("permission denied") });
    expect(set.kpis.find((x) => x.id === "com.devis_attente")!.value).toBe(1);
  });
  it("dépenses fournisseurs du mois", () => {
    const x = k(snap({ supplierPayments: [{ paid_on: "2026-11-02", amount: 80.5, created_at: "2026-11-02T00:00:00Z" }, { paid_on: "2026-10-30", amount: 999, created_at: "2026-10-30T00:00:00Z" }] }), "fin.depenses_mois");
    expect(x.value).toBe(80.5);
  });
});

describe("indicateurs — Commercial", () => {
  it("devis en attente, envoyés/acceptés du mois, refusés", () => {
    const s = snap({ quotes: [qt(), qt({ sent_at: "2026-11-02T09:00:00Z", issue_date: "2026-11-02" }), qt({ status: "accepte", accepted_at: "2026-11-04T10:00:00Z", sent_at: "2026-11-01T10:00:00Z", issue_date: "2026-11-01", total_ht: 300, updated_at: "2026-11-04T10:00:00Z" }), qt({ status: "refuse", updated_at: "2026-11-05T10:00:00Z" })] });
    expect(k(s, "com.devis_attente")).toMatchObject({ value: 2, detail: expect.stringMatching(/^400,00\s€ HT en jeu$/) });
    expect(k(s, "com.devis_envoyes_mois").value).toBe(2);
    expect(k(s, "com.devis_acceptes_mois").value).toBe(1);
    expect(k(s, "com.devis_refuses_mois").value).toBe(1);
  });
  it("taux de conversion : acceptés / émis sur 90 jours, hors brouillons ; non disponible sans devis", () => {
    const s = snap({ quotes: [qt({ status: "accepte" }), qt(), qt(), qt({ status: "brouillon" }), qt({ issue_date: "2026-05-01", status: "refuse" })] });
    expect(k(s, "com.conversion")).toMatchObject({ value: 33, detail: "1 accepté sur 3 émis" });
    expect(k(snap(), "com.conversion")).toMatchObject({ value: null, reason: "Aucun devis émis sur les 90 derniers jours." });
  });
  it("prospects et nouveaux prospects (30 jours), demandes à traiter, contrats actifs", () => {
    const s = snap({
      clients: [{ status: "prospect", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z" }, { status: "prospect", created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" }, { status: "actif", created_at: "2026-11-02T10:00:00Z", updated_at: "2026-11-02T10:00:00Z" }],
      requests: [{ status: "nouvelle", received_at: "2026-11-06T10:00:00Z" }, { status: "traitee", received_at: "2026-11-01T10:00:00Z" }],
      contracts: [{ status: "actif", updated_at: "2026-10-01T00:00:00Z" }, { status: "en_cours", updated_at: "2026-10-02T00:00:00Z" }, { status: "resilie", updated_at: "2026-10-03T00:00:00Z" }]
    });
    expect(k(s, "com.prospects")).toMatchObject({ value: 2, detail: "dont 1 nouveau sur 30 jours" });
    expect(k(s, "com.prospects_30j").value).toBe(1);
    expect(k(s, "com.demandes").value).toBe(1);
    expect(k(s, "com.contrats")).toMatchObject({ value: 1, detail: "1 en cours de mise en place" });
  });
});

describe("indicateurs — Opérations", () => {
  it("planifiées à venir, en retard, non affectées, réalisées et annulées du mois", () => {
    const s = snap({ interventions: [
      iv(), iv({ scheduled_date: "2026-11-08" }), iv({ scheduled_date: "2026-11-20", staff_id: null, assignee: null }),
      iv({ scheduled_date: "2026-11-03" }), iv({ status: "realise", scheduled_date: "2026-11-02" }), iv({ status: "annule", scheduled_date: "2026-11-04" }), iv({ status: "realise", scheduled_date: "2026-10-02" })
    ] });
    expect(k(s, "ops.a_venir")).toMatchObject({ value: 3, detail: "2 dans les 7 prochains jours" });
    expect(k(s, "ops.retard").value).toBe(1);
    expect(k(s, "ops.non_affectees").value).toBe(1);
    expect(k(s, "ops.realisees_mois").value).toBe(1);
    expect(k(s, "ops.annulees_mois").value).toBe(1);
  });
  it("un intervenant saisi en texte compte comme affecté", () => {
    const s = snap({ interventions: [iv({ staff_id: null, assignee: "Jean Dupont" })] });
    expect(k(s, "ops.non_affectees").value).toBe(0);
    expect(k(s, "ops.affectations_7j")).toMatchObject({ value: 1, lines: [{ label: "Jean Dupont", value: "1 intervention" }] });
  });
  it("affectations sur 7 jours : regroupées par intervenant, nom lu dans la fiche équipe", () => {
    const s = snap({ interventions: [iv(), iv({ scheduled_date: "2026-11-11" }), iv({ scheduled_date: "2026-11-30" })] });
    expect(k(s, "ops.affectations_7j")).toMatchObject({ value: 1, detail: "2 interventions affectées", lines: [{ label: "Awa Diop", value: "2 interventions" }] });
  });
  it("sans fiche équipe lisible, les intervenants actifs sont non disponibles (raison fournie)", () => {
    const s = snap({ staff: null, errors: { staff: "boom" } });
    expect(k(s, "ops.intervenants")).toMatchObject({ value: null, reason: expect.stringContaining("boom") });
  });
});

describe("indicateurs — règles générales", () => {
  it("chaque valeur absente a une raison ; chaque valeur présente n'en a pas", () => {
    const s = snap({ invoices: [inv()], quotes: [qt()] });
    for (const x of computeKpis(s).kpis) { if (x.value === null) expect(x.reason, x.id).toBeTruthy(); else expect(x.reason, x.id).toBeNull(); }
  });
  it("dernière modification : date la plus récente parmi les lignes qui composent le chiffre", () => {
    const s = snap({ invoices: [inv({ updated_at: "2026-11-01T00:00:00Z" }), inv({ updated_at: "2026-11-06T08:00:00Z" })] });
    expect(k(s, "fin.en_attente").lastChangeAt).toBe("2026-11-06T08:00:00Z");
    expect(k(snap(), "fin.en_attente").lastChangeAt).toBeNull();
  });
  it("aucun chiffre n'est écrit dans le code : pas de valeur d'exemple ni de réponse figée", () => {
    const src = readFileSync(path.join(__dirname, "../src/lib/jarvis/kpis.ts"), "utf8");
    expect(src).not.toMatch(/7406|5068/);
    expect(src).not.toMatch(/from\s+"[^"]*demo/i);
  });
  it("fraîcheur : lu à l'instant, puis dégradée si l'actualisation s'arrête", () => {
    const at = NOW.toISOString();
    expect(freshnessOf(at, NOW.getTime() + 2000)).toMatchObject({ level: "ok", label: "lu à l'instant" });
    expect(freshnessOf(at, NOW.getTime() + 40_000).level).toBe("ok");
    expect(freshnessOf(at, NOW.getTime() + 5 * 60_000).level).toBe("warn");
    expect(freshnessOf(at, NOW.getTime() + 30 * 60_000).level).toBe("old");
  });
});

describe("chargeur d'indicateurs — lecture seule", () => {
  const fake = (rows: Record<string, unknown[] | { error: string }>) => ({
    from: (t: string) => { const r = rows[t] ?? []; const res = Array.isArray(r) ? { data: r, error: null } : { data: null, error: { message: r.error } }; const q: any = { select: () => q, limit: () => q, then: (ok: any) => ok(res) }; return q; }
  });
  it("transmet les lignes lues et signale une source illisible sans arrêter les autres", async () => {
    const { loadKpis } = await import("@/lib/jarvis/load-kpis");
    const set = await loadKpis(fake({ invoices: [{ number: "F-1", status: "envoye", issue_date: "2026-11-02", due_date: "2026-11-30", total_ht: "100", total_ttc: "120", paid_amount: "0", paid_at: null, updated_at: "2026-11-02T10:00:00Z", clients: { name: "Client A" } }], quotes: { error: "relation quotes does not exist" } }) as any, NOW);
    expect(set.errors.quotes).toContain("does not exist");
    expect(set.kpis.find((x) => x.id === "fin.en_attente")!.value).toBe(120);
    expect(set.kpis.find((x) => x.id === "com.devis_attente")).toMatchObject({ value: null, reason: expect.stringContaining("quotes") });
  });
  it("le chargeur et la route ne contiennent aucune écriture ni appel de fonction", () => {
    for (const f of ["src/lib/jarvis/load-kpis.ts", "src/app/api/jarvis/kpis/route.ts", "src/lib/jarvis/kpis.ts"]) {
      const src = readFileSync(path.join(__dirname, "..", f), "utf8");
      expect(src, f).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
      expect(src, f).not.toMatch(/createAdmin|service_role|SUPABASE_SERVICE/);
    }
  });
});

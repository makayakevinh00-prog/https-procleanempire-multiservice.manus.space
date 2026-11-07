import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACTION_KINDS, levelOf, needsApproval, isBlocked } from "@/lib/jarvis/policy";
import { AGENTS, AGENT_BY_KEY, routeEvent } from "@/lib/jarvis/registry";
import { prepare } from "@/lib/jarvis/core";
import type { AgentResult } from "@/lib/jarvis/types";

const sql = readFileSync(path.join(__dirname, "..", "supabase/migrations/0021_jarvis_core.sql"), "utf8");
const empty = (o: Partial<AgentResult> = {}): AgentResult => ({ summary: "", stats: {}, alerts: [], actions: [], tasks: [], events: [], memory: [], ...o });

describe("niveaux d'autonomie", () => {
  it("un type d'action inconnu est bloqué (L3), jamais automatique", () => {
    expect(levelOf("virement_bancaire")).toBe("L3");
    expect(isBlocked("n_importe_quoi")).toBe(true);
    expect(needsApproval("n_importe_quoi")).toBe(false);
  });
  it("les règles sensibles sont au bon niveau", () => {
    expect(levelOf("create_task")).toBe("L1");
    expect(levelOf("contact_client")).toBe("L2");
    expect(levelOf("change_terms")).toBe("L2");
    expect(levelOf("legal_notice")).toBe("L3");
    expect(levelOf("issue_credit_note")).toBe("L3");
  });
  it("le miroir TypeScript est IDENTIQUE à la table de la base (migration 0021)", () => {
    const block = sql.slice(sql.indexOf("insert into jarvis_action_kinds"), sql.indexOf("-- Mémoire commune maîtrisée"));
    const rows = [...block.matchAll(/\('(\w+)',\s*'(L[123])'/g)].map((m) => [m[1], m[2]]).sort();
    expect(rows).toEqual(Object.entries(ACTION_KINDS).map(([k, v]) => [k, v.level]).sort());
  });
});

describe("registre des agents", () => {
  it("9 entités, clés uniques, identiques à celles de la base", () => {
    expect(AGENTS).toHaveLength(9);
    expect(new Set(AGENTS.map((a) => a.key)).size).toBe(9);
    const block = sql.slice(sql.indexOf("insert into jarvis_agents"), sql.indexOf("-- Niveaux d'autonomie"));
    const seeded = [...block.matchAll(/\('(\w+)',\s*'[^']*',\s*'[^']*',\s*'(actif|prevu)'/g)].map((m) => [m[1], m[2]]).sort();
    expect(seeded).toEqual(AGENTS.map((a) => [a.key, a.status]).sort());
  });
  it("seuls Core et Finance sont déclarés construits", () => {
    expect(AGENTS.filter((a) => a.status === "actif").map((a) => a.key).sort()).toEqual(["core", "finance"]);
  });
  it("chaque fiche est complète (mission, limites, autonomie, collaborations)", () => {
    for (const a of AGENTS) {
      expect(a.mission.length, a.key).toBeGreaterThan(40);
      expect(a.responsibilities.length, a.key).toBeGreaterThan(0);
      expect(a.limits.length, a.key).toBeGreaterThan(0);
      expect(a.autonomy.L1.length + a.autonomy.L2.length + a.autonomy.L3.length, a.key).toBeGreaterThan(0);
      expect(a.collaborates.length, a.key).toBeGreaterThan(0);
      for (const c of a.collaborates) expect(AGENT_BY_KEY[c.agent], `${a.key} → ${c.agent}`).toBeDefined();
    }
  });
  it("aucun agent construit ne prétend une automatisation « construite » qui n'existe pas côté code", () => {
    // Les agents « prévus » ne peuvent annoncer que des automatisations déjà existantes dans le CRM (relances, planning...), listées explicitement.
    const EXISTANT = /existant|Moteur PDF|Accusé de réception/;
    for (const a of AGENTS.filter((x) => x.status === "prevu"))
      for (const au of a.automations.filter((x) => x.state === "construit")) expect(au.label, `${a.key}: ${au.label}`).toMatch(EXISTANT);
  });
  it("chaque type d'événement a un destinataire unique qui l'écoute", () => {
    expect(routeEvent("contract.incomplete")).toBe("operations");
    expect(routeEvent("invoice.cancelled_after_sent")).toBe("juridique");
    expect(() => routeEvent("inconnu")).toThrow(/sans destinataire/);
    const all = AGENTS.flatMap((a) => a.listens);
    expect(new Set(all).size).toBe(all.length);
  });
  it("la mémoire commune déclarée par Finance existe dans la base avec Finance comme seul rédacteur", () => {
    expect(sql).toMatch(/'client\.delai_paiement_moyen_jours', 'shared', array\['finance'\]/);
  });
});

describe("JARVIS Core — contrôle avant enregistrement", () => {
  it("refuse une action de type inconnu", () => {
    expect(() => prepare(empty({ actions: [{ dedupe_key: "x", kind: "payer_facture_fournisseur", title: "t" }] }))).toThrow(/Action inconnue/);
  });
  it("refuse de faire passer une action automatique par les propositions", () => {
    expect(() => prepare(empty({ actions: [{ dedupe_key: "x", kind: "create_task", title: "t" }] }))).toThrow(/automatique/);
  });
  it("adresse chaque événement à l'agent qui l'écoute, quel que soit ce que l'émetteur a écrit", () => {
    const r = prepare(empty({ events: [{ type: "contract.incomplete", target_agent: "commercial", dedupe_key: "k" }] }));
    expect(r.events[0].target_agent).toBe("operations");
  });
  it("refuse un événement que personne n'écoute", () => {
    expect(() => prepare(empty({ events: [{ type: "paiement.recu", target_agent: "finance", dedupe_key: "k" }] }))).toThrow(/sans destinataire/);
  });
});

import { ROADMAP, ORDERED_AGENTS } from "@/lib/jarvis/roadmap";
describe("calendrier de construction", () => {
  it("chaque agent a une feuille de route complète avec des preuves mesurables et des décisions explicites", () => {
    for (const a of AGENTS) {
      const r = ROADMAP[a.key];
      expect(r, a.key).toBeDefined();
      expect(r.window, a.key).toMatch(/^S\d+/);
      for (const champ of ["gates", "skills", "tools", "memory", "deliverables", "proof"] as const) expect(r[champ].length, `${a.key}.${champ}`).toBeGreaterThan(0);
      expect(r.proof.length, a.key).toBeGreaterThanOrEqual(3);
      expect(r.cost.length, a.key).toBeGreaterThan(2);
    }
  });
  it("les ordres sont uniques et les agents non construits sont tous planifiés", () => {
    expect(new Set(Object.values(ROADMAP).map((r) => r.order)).size).toBe(9);
    expect(ORDERED_AGENTS).toHaveLength(9);
  });
  it("aucun agent n'est promis avant d'avoir ses prérequis : chaque étape qui dépend d'un service payant ou externe le dit dans « gates »", () => {
    const externes = /Claude|WhatsApp|Metricool|Microsoft|Qonto|clé/i;
    for (const a of AGENTS) {
      const r = ROADMAP[a.key];
      if (r.tools.some((t) => externes.test(t))) expect(r.gates.some((g) => externes.test(g) || /accord|décision|autorisation/i.test(g)), a.key).toBe(true);
    }
  });
});

describe("code envoyé au navigateur", () => {
  it("les fiches des agents (affichées côté navigateur) ne nomment aucun secret ni détail d'accès interne", () => {
    const texte = JSON.stringify([AGENTS, ROADMAP]);
    expect(texte).not.toMatch(/service_role|SERVICE_ROLE|automation_secret|CRON_SECRET|INBOUND_SECRET|RESEND_API|QONTO_/);
  });
});

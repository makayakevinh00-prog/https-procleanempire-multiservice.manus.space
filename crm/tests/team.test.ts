import { describe, expect, it } from "vitest";
import { ROLES, SECTIONS, SECTION_KEYS, can, homeFor, pathAllowed, permsFromForm, sanitizePerms, sectionOf } from "@/lib/team";

describe("droits de l'équipe", () => {
  it("ne retient que des sections connues et des niveaux valides", () => {
    expect(sanitizePerms({ clients: "write", finances: "admin", pirate: "write", devis: "read", rh: 1 })).toEqual({ clients: "write", devis: "read" });
    expect(sanitizePerms(null)).toEqual({});
    expect(sanitizePerms("write")).toEqual({});
  });
  it("lit les droits d'un formulaire, « aucun » = pas de droit", () => {
    const f = new Map<string, string>([["perm_clients", "write"], ["perm_devis", "none"], ["perm_rh", "read"], ["perm_inconnu", "write"]]);
    expect(permsFromForm((n) => f.get(n))).toEqual({ clients: "write", rh: "read" });
  });
  it("lecture seule ne permet pas de modifier ; modification inclut la lecture", () => {
    expect(can({ clients: "read" }, "clients", "read")).toBe(true);
    expect(can({ clients: "read" }, "clients", "write")).toBe(false);
    expect(can({ clients: "write" }, "clients", "read")).toBe(true);
    expect(can({}, "clients", "read")).toBe(false);
    expect(can(null, "clients", "read")).toBe(false);
  });
  it("chaque page est rattachée à une section, le reste est réservé au patron", () => {
    expect(sectionOf("/clients/abc")).toBe("clients");
    expect(sectionOf("/factures")).toBe("finances");
    expect(sectionOf("/api/devis/1/pdf")).toBe("devis");
    expect(sectionOf("/bienvenue")).toBe("always");
    for (const p of ["/parametres", "/jarvis", "/jarvis/alertes", "/journal", "/actions", "/", "/compte", "/api/mcp", "/api/jarvis/kpis", "/api/qonto/sync", "/inconnue", "/clients-pirate", "/nettoyeurs", "/api/nettoyeurs/virements"]) expect(sectionOf(p)).toBeNull();
  });
  it("un préfixe ne déborde pas sur une autre route", () => {
    expect(sectionOf("/clients")).toBe("clients");
    expect(sectionOf("/clientsX")).toBeNull();
    expect(sectionOf("/equipe")).toBe("rh");
    expect(sectionOf("/equipement")).toBeNull();
  });
  it("une personne ne passe que là où elle a au moins la lecture", () => {
    const commercial = ROLES.commercial.perms;
    expect(pathAllowed(commercial, "/devis")).toBe(true);
    expect(pathAllowed(commercial, "/factures")).toBe(false);
    expect(pathAllowed(commercial, "/parametres")).toBe(false);
    expect(pathAllowed({}, "/clients")).toBe(false);
    expect(pathAllowed({}, "/bienvenue")).toBe(true);
  });
  it("aucun rôle de départ n'ouvre les finances ni le catalogue (coûts et marges)", () => {
    for (const r of Object.values(ROLES)) { const p = r.perms as Record<string, string>; expect(p.finances).toBeUndefined(); expect(p.catalogue).toBeUndefined(); }
  });
  it("accueil par défaut : première section ouverte, sinon la page de bienvenue", () => {
    expect(homeFor({ devis: "read" })).toBe("/devis");
    expect(homeFor({})).toBe("/bienvenue");
  });
  it("toutes les sections sont couvertes par des routes distinctes", () => {
    const all = SECTIONS.flatMap((s) => s.routes);
    expect(new Set(all).size).toBe(all.length);
    expect(SECTION_KEYS).toHaveLength(SECTIONS.length);
  });
});

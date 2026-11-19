import { describe, expect, it } from "vitest";
import { PROFILE_LINKS, SECTIONS_NAV, activeTab, allPages, sectionOfPath } from "../src/lib/nav-sections";

// Les 24 entrées de l'ancien menu (et leurs sous-liens) : aucune ne doit disparaître.
const OLD_MENU = ["/", "/actions", "/clients", "/demandes", "/devis", "/contrats", "/activites", "/veille/territoire", "/veille", "/croissance", "/croissance/aides",
  "/missions", "/planning", "/sites", "/conciergerie", "/nettoyeurs", "/equipe", "/recrutement", "/comptabilite", "/analyses", "/factures", "/facturation-auto", "/paiements",
  "/fournisseurs", "/catalogue", "/parametres", "/journal", "/compte"];

describe("navigation en 7 rubriques", () => {
  it("le menu a 7 entrées", () => { expect(SECTIONS_NAV.map((s) => s.label)).toEqual(["Accueil", "Clients & contrats", "Terrain & équipe", "Argent", "Croissance", "Média", "Messages"]); });
  it("toutes les pages de l'ancien menu restent atteignables (onglet ou menu du profil)", () => {
    const known = new Set(allPages().map((p) => p.href));
    for (const h of OLD_MENU) expect(known.has(h), h).toBe(true);
  });
  it("Paramètres, Journal, Mon compte, JARVIS et Alertes sont dans le menu du profil", () => {
    expect(PROFILE_LINKS.map((p) => p.href)).toEqual(["/parametres", "/journal", "/compte", "/jarvis", "/jarvis/alertes"]);
  });
  it("l'onglet le plus précis l'emporte", () => {
    const croissance = SECTIONS_NAV.find((s) => s.key === "croissance")!.tabs;
    expect(activeTab("/veille/territoire", croissance)?.label).toBe("Territoire");
    expect(activeTab("/veille/abc", croissance)?.label).toBe("Veille concurrentielle");
    expect(activeTab("/croissance/aides", croissance)?.label).toBe("Aides publiques");
    expect(activeTab("/croissance", croissance)?.label).toBe("Croissance");
  });
  it("les pages de détail restent dans leur rubrique", () => {
    expect(sectionOfPath("/clients/abc")?.key).toBe("clients");
    expect(sectionOfPath("/missions/a-verifier")?.key).toBe("terrain");
    expect(sectionOfPath("/factures/new")?.key).toBe("argent");
    expect(sectionOfPath("/conciergerie/veille/abc")?.key).toBe("clients");
    expect(sectionOfPath("/")?.key).toBe("accueil");
    expect(sectionOfPath("/calendrier")?.key).toBe("accueil");
    expect(sectionOfPath("/sites/abc")?.key).toBe("croissance");
    expect(activeTab("/sites", SECTIONS_NAV.find((x) => x.key === "croissance")!.tabs)?.label).toBe("Territoire");
    expect(sectionOfPath("/actions")?.key).toBe("accueil");
    expect(sectionOfPath("/parametres")).toBeNull();
  });
});

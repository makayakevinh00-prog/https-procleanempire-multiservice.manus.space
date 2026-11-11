import { describe, expect, it } from "vitest";
import { spamScore } from "@/lib/request-spam";

describe("filtre des demandes indésirables", () => {
  it("laisse passer de vraies demandes, même courtes ou sans message", () => {
    for (const r of [
      { name: "Marie Durand", company: "Cabinet Durand", service: "Bureaux", message: "Bonjour, nous cherchons un nettoyage de nos bureaux 2 fois par semaine, 120 m²." },
      { name: "kevinh makaya", company: "ProClean Empire", service: "Commerce", message: "" },
      { name: "Syndic Les Lilas", company: "Copropriété Les Lilas", service: "Parties communes", message: "Devis pour l'entretien des parties communes de la résidence, passage hebdomadaire." },
      { name: "Paul", company: "", service: "Airbnb", message: "Ménage entre chaque location, conciergerie pour 2 appartements." }
    ]) expect(spamScore(r).spam, JSON.stringify(r)).toBe(false);
  });
  it("écarte le démarchage commercial et le référencement", () => {
    const a = spamScore({ name: "J. Martin", company: "WebBoost Agency", message: "Bonjour, je me permets de vous contacter : notre agence web propose le référencement SEO et la création de site, sans engagement." });
    expect(a.spam).toBe(true); expect(a.reasons.join(" ")).toContain("marketing");
    expect(spamScore({ name: "Artisans du bâtiment", company: "Viro W artisans", message: "Nous proposons panneaux solaires, isolation et toiture, offre exceptionnelle sans engagement." }).spam).toBe(true);
  });
  it("écarte les textes dans un autre alphabet et les e-mails jetables", () => {
    expect(spamScore({ name: "Иван", message: "Предлагаем услуги продвижения вашего сайта" }).spam).toBe(true);
    expect(spamScore({ name: "x", email: "a@mailinator.com", message: "cheap crypto casino bonus" }).spam).toBe(true);
  });
  it("un vrai mot du métier protège d'un signal faible isolé", () => {
    expect(spamScore({ name: "Léa", company: "Agence immobilière Dupont", message: "Nous cherchons un nettoyage de fin de chantier pour notre agence. Voir https://exemple.fr/plan" }).spam).toBe(false);
  });
  it("donne toujours les raisons de l'écartement", () => {
    const r = spamScore({ name: "Z", company: "SEO Pro", message: "Meilleur référencement garanti, backlinks pas chers" });
    expect(r.spam).toBe(true); expect(r.reasons.length).toBeGreaterThan(0);
  });
});

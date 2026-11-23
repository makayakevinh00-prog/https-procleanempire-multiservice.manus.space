import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseAfter, parseBefore } from "@/lib/ai-inspect";
import { memoryPrompt, updateMemory } from "@/lib/marketplace/memory";
import { estimatedEnd, outcomeNotice, startNotice, type JobBrief } from "@/lib/marketplace/job-notices";

const before = parseBefore(JSON.stringify({ items: [{ zone: "Cuisine", todo: "plaque très grasse" }, { zone: "Salle de bain", todo: "calcaire" }], level: 4, state: "Logement très sali.", tidy: "Vaisselle sur la table, coussins au sol.", zones: ["Cuisine", "Salle de bain", "Salon"], minutes: 150, summary: "Cuisine très sale." }))!;

describe("relevé d'arrivée", () => {
  it("lit l'état, le rangement, les zones et la durée ; reste compatible avec l'ancien format", () => {
    expect(before).toMatchObject({ level: 4, minutes: 150, tidy: "Vaisselle sur la table, coussins au sol.", zones: ["Cuisine", "Salle de bain", "Salon"] });
    const old = parseBefore('{"items":[{"zone":"Salon","todo":"sol"}],"level":2,"summary":"ok"}')!;
    expect(old).toMatchObject({ level: 2, minutes: null, zones: [] });
    expect(parseBefore('{"items":[],"minutes":9999,"level":3}')!.minutes).toBeNull();
  });
});

describe("contrôle de fin", () => {
  it("une zone non refilmée devient un point à reprendre, avec le temps de reprise", () => {
    const r = parseAfter(JSON.stringify({ cleaned: ["Cuisine"], remaining: [], missing: ["Salle de bain"], rework_minutes: 10, verdict: "ok", summary: "", confidence: "haute" }))!;
    expect(r.verdict).toBe("reprise");
    expect(r.remaining[0]).toMatchObject({ zone: "Salle de bain" });
    expect(r.remaining[0]!.why).toContain("refilmez");
    expect(r.rework_minutes).toBe(10);
  });
  it("tout est propre : pas de reprise, pas de temps de reprise", () => {
    const r = parseAfter('{"cleaned":["Cuisine"],"remaining":[],"rework_minutes":15,"verdict":"ok","summary":"Tout est propre.","confidence":"haute"}')!;
    expect(r).toMatchObject({ verdict: "ok", rework_minutes: null, missing: [] });
  });
});

describe("mission guidée : tâches dans l'ordre et pièces reconnues", () => {
  it("l'IA donne les tâches dans l'ordre et la pièce de chaque capture ; sans tâches, elles viennent des points relevés", () => {
    const r = parseBefore(JSON.stringify({ items: [{ zone: "Cuisine", todo: "plaque grasse" }], tasks: ["Aérer", "Cuisine : dégraisser la plaque", "Sols en dernier"], frame_rooms: ["Cuisine", "Salon", ""], level: 3 }))!;
    expect(r.tasks).toEqual(["Aérer", "Cuisine : dégraisser la plaque", "Sols en dernier"]);
    expect(r.frame_rooms).toEqual(["Cuisine", "Salon", ""]);
    expect(before.tasks).toEqual(["Cuisine : plaque très grasse", "Salle de bain : calcaire"]);
    expect(parseBefore(JSON.stringify({ items: [], tasks: Array.from({ length: 30 }, (_, i) => `t${i}`) }))!.tasks).toHaveLength(14);
  });
  it("vidéo de fin : une tâche non faite devient un point à reprendre, avec son libellé ; une tâche faite n'ajoute rien", () => {
    const labels = ["Aérer", "Cuisine : dégraisser la plaque", "Sols en dernier"];
    const r = parseAfter(JSON.stringify({ cleaned: ["Aérer"], remaining: [], tasks: [{ n: 1, ok: true }, { n: 2, ok: false, why: "traces de gras encore visibles" }, { n: 3, ok: true }], verdict: "ok", summary: "", confidence: "haute" }), labels)!;
    expect(r.verdict).toBe("reprise");
    expect(r.remaining).toEqual([{ zone: "Cuisine : dégraisser la plaque", why: "traces de gras encore visibles" }]);
    const propre = parseAfter(JSON.stringify({ cleaned: [], remaining: [], tasks: [{ n: 1, ok: true }], verdict: "ok", summary: "ok" }), labels)!;
    expect(propre.verdict).toBe("ok");
    // numéro inconnu ou sans libellé : point repris sous « Tâche n », jamais de plantage
    expect(parseAfter(JSON.stringify({ remaining: [], tasks: [{ n: 9, ok: false }], verdict: "ok" }))!.remaining[0]!.zone).toBe("Tâche 9");
  });
});

describe("mémoire du logement", () => {
  it("première visite : rien à rappeler ; ensuite, zones et points récurrents", () => {
    expect(memoryPrompt(null, "2026-11-23")).toBe("");
    const m1 = updateMemory(null, before, "2026-11-15");
    expect(m1).toMatchObject({ visits: 1, recurring: [] });
    expect(memoryPrompt(m1, "2026-11-15")).toBe(""); // même jour : pas encore du passé
    const m2 = updateMemory(m1, { ...before, items: [{ zone: "cuisine", todo: "four" }], level: 2, minutes: 90 }, "2026-11-23");
    expect(m2.visits).toBe(2);
    expect(m2.recurring).toEqual(["Cuisine"]);
    const p = memoryPrompt(m2, "2026-11-29");
    expect(p).toContain("2 visites");
    expect(p).toContain("Cuisine");
    expect(p).toContain("150, 90 min");
  });
  it("le même jour rejoué remplace la visite, sans la compter deux fois", () => {
    const m = updateMemory(updateMemory(null, before, "2026-11-23"), { ...before, level: 5 }, "2026-11-23");
    expect(m.visits).toBe(1);
    expect(m.last).toHaveLength(1);
    expect(m.last[0]!.level).toBe(5);
  });
  it("garde les 4 dernières visites", () => {
    let m = null as ReturnType<typeof updateMemory> | null;
    for (let d = 1; d <= 6; d++) m = updateMemory(m, before, `2026-11-0${d}`);
    expect(m!.visits).toBe(6);
    expect(m!.last.map((v) => v.date)).toEqual(["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
  });
});

describe("messages au propriétaire", () => {
  const brief: JobBrief = { title: "Ménage — Appartement 16e", date: "2026-11-23", city: "Paris", status: "acceptee", arrived_at: "2026-11-23T10:00:00Z", duration_hours: 2, est_minutes: 150, rework_minutes: null,
    listing: "Appartement Grande Armée", has_listing: true, memory: null, before_report: before, ai_report: null, started_notified: false, cleaner: "Awa", client: "Propriétaire", emails: ["a@b.fr"] };
  it("fin estimée : arrivée + durée estimée par l'analyse, sinon durée prévue", () => {
    expect(estimatedEnd(brief)!.at.toISOString()).toBe("2026-11-23T12:30:00.000Z");
    expect(estimatedEnd({ ...brief, est_minutes: null })!.minutes).toBe(120);
    expect(estimatedEnd({ ...brief, arrived_at: null })).toBeNull();
  });
  it("ménage commencé : état, rangement, heure de fin, captures", () => {
    const n = startNotice(brief, 6);
    expect(n.subject).toBe("Ménage commencé — Appartement Grande Armée");
    expect(n.text).toContain("Awa est sur place depuis 11 h 00");
    expect(n.text).toContain("niveau de saleté 4 sur 5");
    expect(n.text).toContain("Rangement : Vaisselle sur la table");
    expect(n.text).toContain("Fin prévue vers 13 h 30");
    expect(n.text).toContain("6 captures");
    expect(n.text).toContain("L'équipe ProClean Empire");
    expect(n.text).not.toMatch(/Kevinh/);
  });
  it("reprise : points, temps de reprise et nouvelle heure de fin ; le détail interne ne va qu'à la direction", () => {
    const b = { ...brief, ai_report: parseAfter('{"cleaned":[],"remaining":[{"zone":"Cuisine","why":"plaque encore grasse"}],"rework_minutes":20,"verdict":"reprise","summary":"Un point reste.","confidence":"haute"}') };
    const now = new Date("2026-11-23T12:00:00Z");
    const owner = outcomeNotice(b, { status: "a_reprendre", summary: "Un point reste." }, 4, undefined, now);
    expect(owner.subject).toBe("Ménage à reprendre — Appartement Grande Armée");
    expect(owner.text).toContain("- Cuisine : plaque encore grasse");
    expect(owner.text).toContain("Temps de reprise estimé : 20 min, soit une fin vers 13 h 20");
    expect(owner.text).not.toContain("CRM");
    expect(outcomeNotice(b, { status: "a_reprendre", summary: "" }, 0, "À vérifier dans le CRM", now).text).toContain("CRM");
  });
  it("terminé : invitation à passer vérifier", () => {
    const n = outcomeNotice(brief, { status: "validee", summary: "Tout est propre." }, 2, undefined, new Date("2026-11-23T12:10:00Z"));
    expect(n.subject).toBe("Ménage terminé — Appartement Grande Armée");
    expect(n.text).toContain("Awa a terminé à 13 h 10. Vous pouvez passer vérifier le logement.");
  });
});

describe("envoi des images à l'IA", () => {
  it("retire les retours à la ligne du base64 venu de la base", async () => {
    const { askWith } = await import("@/lib/ai-inspect");
    const old = process.env.ANTHROPIC_API_KEY, f = globalThis.fetch;
    process.env.ANTHROPIC_API_KEY = "sk-ant-api-test";
    let sent = "";
    globalThis.fetch = (async (_u: unknown, init?: { body?: unknown }) => { sent = String(init?.body); return new Response(JSON.stringify({ content: [{ type: "text", text: "{}" }] }), { status: 200 }); }) as typeof fetch;
    try { await askWith("s", [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA\nBBBB\r\nCC==" } }], 10); }
    finally { globalThis.fetch = f; process.env.ANTHROPIC_API_KEY = old; }
    expect(JSON.parse(sent).messages[0].content[0].source.data).toBe("AAAABBBBCC==");
  });
});

describe("relevé d'arrivée : ce que l'IA voit et ses conseils", () => {
  it("garde la description et les conseils par surface, écarte les conseils vides", async () => {
    const { parseBefore } = await import("@/lib/ai-inspect");
    const r = parseBefore(JSON.stringify({ seen: "Un bureau avec quatre chaises.", items: [], tasks: ["Bureau : replacer les chaises"], tips: [{ surface: "Parquet", product: "nettoyant neutre dilué", how: "serpillière essorée" }, { surface: "", product: "x" }, { surface: "Verre" }] }));
    expect(r?.seen).toBe("Un bureau avec quatre chaises.");
    expect(r?.tips).toEqual([{ surface: "Parquet", product: "nettoyant neutre dilué", how: "serpillière essorée" }]);
    expect(r?.tasks).toEqual(["Bureau : replacer les chaises"]);
    const z = parseBefore(JSON.stringify({ items: [], tasks: ["x"], refilm: [{ zone: "Coin canapé", why: "image floue" }, { why: "sans zone" }, { zone: "A" }, { zone: "B" }, { zone: "C" }] }));
    expect(z?.refilm).toEqual([{ zone: "Coin canapé", why: "image floue" }, { zone: "A", why: "" }, { zone: "B", why: "" }, { zone: "C", why: "" }]);
    const { placePrompt } = await import("@/lib/ai-inspect");
    expect(placePrompt([], null)).toBe("");
    expect(placePrompt(["Bureau 1", "Salle de réunion"], { rooms: [{ room: "Bureau 1", steps: ["vider la corbeille"] }], attention: ["écrans fragiles"] })).toMatch(/Bureau 1, Salle de réunion.*pas encore filmée.*vider la corbeille.*écrans fragiles/s);
  });
});

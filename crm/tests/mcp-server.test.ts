import { describe, it, expect } from "vitest";
import { handleMcp, TOOLS } from "../src/lib/mcp/server";

const calls: any[] = [];
const call = async (op: string, args: any) => { calls.push({ op, args }); if (op === "boom") throw new Error("x"); return { ok: true, op }; };

describe("serveur MCP", () => {
  it("initialize : négocie la version et annonce les outils", async () => {
    const r = await handleMcp({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }, call);
    expect(r.json!.result.protocolVersion).toBe("2025-06-18"); expect(r.json!.result.capabilities.tools).toEqual({});
    expect((await handleMcp({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999" } }, call)).json!.result.protocolVersion).toBe("2025-03-26");
  });
  it("notification : 202 sans réponse ; ping ; méthode inconnue", async () => {
    expect((await handleMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, call)).status).toBe(202);
    expect((await handleMcp({ jsonrpc: "2.0", id: 3, method: "ping" }, call)).json!.result).toEqual({});
    expect((await handleMcp({ jsonrpc: "2.0", id: 4, method: "resources/list" }, call)).json!.error.code).toBe(-32601);
  });
  it("tools/list : 8 outils décrits, schémas valides, aucun outil d'envoi direct", async () => {
    const r = await handleMcp({ jsonrpc: "2.0", id: 5, method: "tools/list" }, call);
    const names = r.json!.result.tools.map((t: any) => t.name);
    expect(names).toEqual(TOOLS.map((t) => t.name)); expect(names).toHaveLength(8);
    for (const t of r.json!.result.tools) { expect(t.description.length).toBeGreaterThan(20); expect(t.inputSchema.type).toBe("object"); }
    expect(names.join(" ")).not.toMatch(/envoyer|send|supprimer|delete/);
  });
  it("tools/call : transmet l'opération, et l'e-mail devient une proposition send_email sans adresse", async () => {
    calls.length = 0;
    const r = await handleMcp({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "proposer_email_client", arguments: { client_id: "c", subject: "Objet", body: "Corps du message", title: "T", dedupe_key: "k", to: "pirate@example.invalid" } } }, call);
    expect(r.json!.result.isError).toBeUndefined();
    expect(calls[0].op).toBe("propose_action"); expect(calls[0].args.kind).toBe("send_email");
    expect(JSON.stringify(calls[0].args)).not.toContain("pirate@example.invalid");
  });
  it("erreur de la base : message utile, pas de fuite technique", async () => {
    const bad = async () => { throw new Error("CLIENT_INTERDIT: client introuvable ou contact réservé."); };
    const r = await handleMcp({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "creer_tache", arguments: { title: "abc" } } }, bad);
    expect(r.json!.result.isError).toBe(true); expect(r.json!.result.content[0].text).toContain("CLIENT_INTERDIT");
    const r2 = await handleMcp({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "creer_tache", arguments: { title: "abc" } } }, async () => { throw new Error("relation \"x\" does not exist at line 3"); });
    expect(r2.json!.result.content[0].text).not.toContain("relation");
  });
  it("refuse un outil inconnu, un corps invalide, des arguments démesurés", async () => {
    expect((await handleMcp({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "supprimer_tout" } }, call)).json!.error.code).toBe(-32602);
    expect((await handleMcp([] as any, call)).status).toBe(400);
    expect((await handleMcp({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "creer_tache", arguments: { title: "x".repeat(30_000) } } }, call)).json!.error.code).toBe(-32602);
  });
});

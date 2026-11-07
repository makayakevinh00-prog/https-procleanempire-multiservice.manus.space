import { describe, it, expect, vi, beforeEach } from "vitest";

let reponse: { data: unknown; error: unknown } = { data: true, error: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ rpc: async () => reponse }) }));

import { isOwner, requireOwner } from "@/lib/auth";

describe("requireOwner / isOwner", () => {
  beforeEach(() => { reponse = { data: true, error: null }; });

  it("laisse passer le patron", async () => {
    await expect(requireOwner()).resolves.toBeUndefined();
    expect(await isOwner()).toBe(true);
  });
  it("refuse un autre compte", async () => {
    reponse = { data: false, error: null };
    await expect(requireOwner()).rejects.toThrow("ACCES_REFUSE");
  });
  it("refuse sans session (la base répond par une erreur)", async () => {
    reponse = { data: null, error: { message: "permission denied for function is_owner" } };
    await expect(requireOwner()).rejects.toThrow("ACCES_REFUSE");
  });
  it("refuse toute réponse qui n'est pas strictement true", async () => {
    for (const data of [null, undefined, "true", 1, {}]) {
      reponse = { data, error: null };
      expect(await isOwner()).toBe(false);
    }
  });
});

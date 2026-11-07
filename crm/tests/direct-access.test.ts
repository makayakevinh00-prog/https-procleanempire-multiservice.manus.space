/// <reference types="vite/client" />
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Accès DIRECTS, sans interface : on appelle les actions serveur, les routes, le middleware et la mise en page comme le ferait un
 * client HTTP malveillant qui connaît les adresses. La base est simulée : on enregistre tout ce qui lui est demandé.
 */
const h = vi.hoisted(() => ({ owner: false, user: true as boolean, calls: [] as string[], adminUsed: false }));

vi.mock("@/lib/supabase/server", () => {
  const chain = (): any => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (res: any) => res({ data: null, error: { message: "mock" }, count: 0 }) : chain()),
    apply: () => chain()
  });
  const client = {
    rpc: async (name: string) => {
      if (name === "is_owner") return { data: h.owner, error: null };
      h.calls.push(`rpc:${name}`);
      return { data: null, error: { message: "mock" } };
    },
    from: (t: string) => { h.calls.push(`from:${t}`); return chain(); },
    auth: { getUser: async () => ({ data: { user: h.user ? { email: "x@y.fr" } : null } }), signOut: async () => ({}) },
    storage: { from: (t: string) => { h.calls.push(`storage:${t}`); return chain(); } }
  };
  return { createClient: () => client, createAdmin: () => { h.adminUsed = true; throw new Error("ADMIN_UTILISE"); } };
});
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user ? { email: "x@y.fr" } : null } }) },
    rpc: async (name: string) => (name === "is_owner" ? { data: h.owner, error: null } : { data: null, error: { message: "mock" } })
  })
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  notFound: () => { throw new Error("NOT_FOUND"); }
}));
vi.stubGlobal("fetch", async () => { throw new Error("RESEAU_INTERDIT_EN_TEST"); });

const UUID = "00000000-0000-4000-8000-000000000001";
const actionLoaders = import.meta.glob("../src/app/actions/*.ts");
const argsFor = (fn: Function) => [UUID, new FormData(), new FormData(), new FormData()].slice(0, Math.max(fn.length, 1));
const run = async (fn: Function) => { try { await fn(...argsFor(fn)); return null; } catch (e) { return (e as Error).message; } };

beforeEach(() => { h.owner = false; h.user = true; h.calls = []; h.adminUsed = false; });

async function allActions() {
  const out: { file: string; name: string; fn: Function }[] = [];
  for (const [path, load] of Object.entries(actionLoaders)) {
    const file = path.split("/").pop()!;
    const mod: any = await load();
    for (const [name, fn] of Object.entries(mod)) if (typeof fn === "function") out.push({ file, name, fn: fn as Function });
  }
  return out;
}

describe("actions serveur appelées directement", () => {
  it("un compte connecté qui n'est PAS le dirigeant est refusé par CHAQUE action du CRM, sans aucun accès aux données", async () => {
    const actions = (await allActions()).filter((a) => a.file !== "agent.ts");
    expect(actions.length).toBeGreaterThanOrEqual(80); // 75 du CRM + 5 de JARVIS : le test ne doit jamais se vider
    const fuites: string[] = [];
    for (const a of actions) {
      h.calls = []; h.adminUsed = false;
      const msg = await run(a.fn);
      if (!msg?.includes("ACCES_REFUSE") || h.calls.length || h.adminUsed) fuites.push(`${a.file}#${a.name} → ${msg} | accès: ${h.calls.join(",")}${h.adminUsed ? " ADMIN" : ""}`);
    }
    expect(fuites).toEqual([]);
  });

  it("sans session, c'est la même chose", async () => {
    h.user = false;
    const actions = (await allActions()).filter((a) => a.file !== "agent.ts");
    const ouvertes: string[] = [];
    for (const a of actions) { h.calls = []; if (!(await run(a.fn))?.includes("ACCES_REFUSE") || h.calls.length) ouvertes.push(`${a.file}#${a.name}`); }
    expect(ouvertes).toEqual([]);
  });

  it("le dirigeant conserve l'accès à CHAQUE action : aucune n'est bloquée par la garde", async () => {
    h.owner = true;
    const actions = (await allActions()).filter((a) => a.file !== "agent.ts");
    const bloquees: string[] = [];
    for (const a of actions) { const msg = await run(a.fn); if (msg?.includes("ACCES_REFUSE")) bloquees.push(`${a.file}#${a.name}`); }
    expect(bloquees).toEqual([]);
  });

  it("les actions de l'application des agents refusent un jeton invalide sans interroger la base", async () => {
    const mod: any = await import("../src/app/actions/agent");
    const fns = Object.entries(mod).filter(([, f]) => typeof f === "function") as [string, Function][];
    expect(fns.length).toBe(5);
    for (const [name, fn] of fns) {
      h.calls = [];
      const msg = await (async () => { try { await fn("pas-un-jeton", UUID, "x", true, 1); return null; } catch (e) { return (e as Error).message; } })();
      expect(msg, name).toBe("REDIRECT:/agent/invalide");
      expect(h.calls, name).toEqual([]);
    }
  });
});

describe("routes appelées directement", () => {
  const routes: [string, () => Promise<any>][] = [
    ["factures pdf", () => import("../src/app/api/factures/[id]/pdf/route")],
    ["devis pdf", () => import("../src/app/api/devis/[id]/pdf/route")],
    ["contrats pdf", () => import("../src/app/api/contrats/[id]/pdf/route")],
    ["photos de mission", () => import("../src/app/api/missions/photo/[id]/route")],
    ["open space (état en direct)", () => import("../src/app/api/jarvis/openspace/route")]
  ];
  for (const [label, load] of routes) {
    it(`${label} : 403 pour un autre compte, sans lire la base`, async () => {
      const { GET } = await load();
      const res: Response = await GET(new Request("https://crm.test/x"), { params: { id: UUID } });
      expect(res.status).toBe(403);
      expect(h.calls).toEqual([]);
    });
    it(`${label} : le dirigeant n'est pas bloqué (404 si le document n'existe pas)`, async () => {
      h.owner = true;
      const { GET } = await load();
      // Le dirigeant franchit la garde : la route répond (404...) ou échoue plus loin faute de vraies données — jamais par un 403.
      const status = await GET(new Request("https://crm.test/x"), { params: { id: UUID } }).then((r: Response) => r.status, () => 500);
      expect(status).not.toBe(403);
    });
  }
});

describe("middleware : point de contrôle de toutes les requêtes", () => {
  const call = async (path: string, init: RequestInit = {}) => {
    const { middleware } = await import("../src/middleware");
    const { NextRequest } = await import("next/server");
    return middleware(new NextRequest(`https://crm.test${path}`, init as any));
  };
  const rewrittenTo = (r: Response) => r.headers.get("x-middleware-rewrite");

  it("autre compte : 403 sur les pages, les routes API ET les actions (POST)", async () => {
    for (const [path, method] of [["/factures", "GET"], ["/jarvis", "GET"], ["/api/factures/abc/pdf", "GET"], ["/factures/abc", "POST"], ["/clients/new", "POST"]] as const) {
      const r = await call(path, { method });
      expect(r.status, `${method} ${path}`).toBe(403);
      expect(rewrittenTo(r), path).toContain("/acces-refuse");
    }
  });
  it("sans session : renvoi vers la connexion", async () => {
    h.user = false;
    const r = await call("/factures");
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/login");
  });
  it("le dirigeant passe partout", async () => {
    h.owner = true;
    for (const path of ["/", "/factures", "/jarvis", "/api/factures/abc/pdf", "/paiements"]) {
      const r = await call(path);
      expect(r.status, path).toBe(200);
      expect(r.headers.get("x-middleware-next"), path).toBe("1");
    }
  });
  it("le dirigeant connecté qui ouvre /login est renvoyé à l'accueil", async () => {
    h.owner = true;
    const r = await call("/login");
    expect(r.headers.get("location")).toBe("https://crm.test/");
  });
  it("les adresses publiques restent publiques (site, suivi, agents, tâches planifiées) et ne déclenchent aucun contrôle de rôle", async () => {
    h.user = false;
    for (const path of ["/login", "/acces-refuse", "/suivi/DEM-1", "/agent/abc", "/api/inbound/quote-request", "/api/cron/daily", "/api/public/requests/DEM-1", "/api/agent/photo"]) {
      const r = await call(path);
      expect(r.headers.get("x-middleware-next"), path).toBe("1");
    }
  });
  it("un compte non dirigeant peut atteindre la page « Accès refusé » (sinon elle bouclerait)", async () => {
    const r = await call("/acces-refuse");
    expect(r.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("mise en page de l'espace patron", () => {
  it("refuse tout autre compte avant de charger quoi que ce soit", async () => {
    const { default: Layout } = await import("../src/app/(app)/layout");
    const el = await Layout({ children: null });
    expect(JSON.stringify(el)).toContain("Accès refusé");
    expect(h.calls.filter((c) => !c.startsWith("rpc:is_owner"))).toEqual([]);
  });
});

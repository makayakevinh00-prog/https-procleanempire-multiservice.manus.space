import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFileSync } from "node:fs";

/**
 * Mesure DÉTERMINISTE des allers-retours vers Supabase déclenchés par chaque page (mise en page + page).
 * Chaque appel (requête, rpc, auth) coûte un « tour » simulé de 15 ms : la durée totale / 15 donne le nombre de tours SÉQUENTIELS
 * (chemin critique). Chaque tour réel coûte une latence réseau entre la fonction Vercel et Supabase.
 * Les données sont vides : les boucles dépendantes du volume ne sont pas mesurées ici.
 */
const TOUR = 15;
const log: { kind: string; t0: number; t1: number }[] = [];
const settings: any = { id: 1, payment_terms_days: 15, large_amount_threshold_ht: 1000, unpaid_alert_days: 7, reminder_manual_days: 30, quote_followup_days: 7, quote_followup2_days: 14, quote_followup_enabled: true, auto_reminders_enabled: true, reminder_max_count: 3, reminder_first_after_days: 3, reminder_interval_days: 7, recruit_green_max_hours: 20, recruit_orange_max_hours: 30, indep_hourly_cost: 20, salarie_gross_hourly: 12, salarie_employer_charges_pct: 40, salarie_paid_leave_pct: 10, default_vat_rate: 20, company_name: "X", owner_email: "o@x.fr" };

function builder(table: string, kind = "requête") {
  const t0 = Date.now();
  const exec = () => new Promise((resolve) => setTimeout(() => {
    log.push({ kind: `${kind}:${table}`, t0, t1: Date.now() });
    resolve({ data: table === "app_settings" ? settings : [], error: null, count: 0 });
  }, TOUR));
  const p: any = new Proxy(function () {}, {
    get: (_t, prop) => {
      if (prop === "then") return (ok: any, ko: any) => exec().then(ok, ko);
      if (prop === "single" || prop === "maybeSingle") return () => p;
      return () => p;
    }
  });
  return p;
}
const fakeClient = () => ({
  from: (t: string) => builder(t),
  rpc: (name: string) => new Promise((r) => setTimeout(() => { log.push({ kind: `rpc:${name}`, t0: Date.now() - TOUR, t1: Date.now() }); r({ data: name === "is_owner" ? true : null, error: null }); }, TOUR)),
  auth: { getUser: () => new Promise((r) => setTimeout(() => { log.push({ kind: "auth:getUser", t0: Date.now() - TOUR, t1: Date.now() }); r({ data: { user: { email: "o@x.fr" } } }); }, TOUR)), getClaims: () => Promise.resolve({ data: { claims: { email: "o@x.fr" } } }), getSession: () => Promise.resolve({ data: { session: { user: { email: "o@x.fr" } } } }) },
  storage: { from: () => ({}) }
});
// Émule la mémoïsation par requête de React `cache` (documentée) : le cache est vidé entre deux « requêtes » mesurées.
const memos: Map<unknown, unknown>[] = [];
vi.mock("@/lib/request-cache", () => ({ requestCache: (fn: (...a: unknown[]) => unknown) => { const m = new Map<unknown, unknown>(); memos.push(m); return (...a: unknown[]) => { const k = JSON.stringify(a); if (!m.has(k)) m.set(k, fn(...a)); return m.get(k); }; } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => fakeClient(), createAdmin: () => fakeClient() }));
vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], get: () => undefined, set: () => {} }), headers: () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("NEXT_REDIRECT"); }, notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, useRouter: () => ({}), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, unstable_cache: (f: any) => f }));

const ROUTES = ["", "factures", "clients", "missions", "planning", "devis", "contrats", "paiements", "sites", "equipe", "jarvis", "actions", "demandes", "fournisseurs"];
const loadPage = async (r: string) => (await import(/* @vite-ignore */ `../src/app/(app)/${r ? r + "/" : ""}page.tsx`)).default;

async function measure(fn: () => Promise<unknown>) {
  log.length = 0; memos.forEach((m) => m.clear());
  const t = Date.now();
  try { await fn(); } catch (e) { if (!/NEXT_|ACCES/.test(String(e))) throw e; }
  return { calls: log.length, tours: Math.round((Date.now() - t) / TOUR) };
}

describe("allers-retours Supabase par navigation (mise en page + page, en cascade : pire cas)", () => {
  const rows: Record<string, unknown>[] = [];
  beforeEach(() => { log.length = 0; });
  it("mesure chaque route et enregistre le tableau", async () => {
    const Layout = (await import("../src/app/(app)/layout")).default;
    const layout = await measure(async () => Layout({ children: null }));
    // Menu et bandeau : exécutés en continu (Suspense), ils ne bloquent plus la page ; mesurés ici pour mémoire.
    let live = { calls: 0, tours: 0 };
    try { const { SidebarCounts, TopbarCounts } = await import("../src/components/crm/shell-live"); live = await measure(async () => Promise.all([SidebarCounts({ signOut: async () => {} }), TopbarCounts({ signOut: async () => {} })])); } catch { /* version antérieure : le comptage est dans la mise en page */ }
    for (const r of ROUTES) {
      let page: any;
      try { page = await loadPage(r); } catch { continue; }
      const m = await measure(async () => page({ searchParams: {}, params: {} }));
      rows.push({ route: `/${r}`, layout_calls: layout.calls, layout_tours: layout.tours, stream_calls: live.calls, stream_tours: live.tours, page_calls: m.calls, page_tours: m.tours, total_calls: layout.calls + m.calls, total_tours: layout.tours + m.tours + 2 /* middleware : getUser + is_owner */ });
    }
    writeFileSync(process.env.PERF_OUT ?? "/tmp/perf-roundtrips.json", JSON.stringify(rows, null, 1));
    expect(rows.length).toBeGreaterThan(8);
  }, 60000);
});

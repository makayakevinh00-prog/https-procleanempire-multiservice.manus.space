import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { parisToday, addDays } from "@/lib/domain/dates";
import { Sidebar } from "@/components/crm/nav";
import { Flash } from "@/components/crm/flash";

export const dynamic = "force-dynamic";

/** Compteurs affichés dans le menu : ce qui attend une action. */
async function menuCounts(): Promise<Record<string, number>> {
  try {
    const supabase = createClient();
    const settings = await getSettings(supabase);
    const today = parisToday();
    const head = { count: "exact" as const, head: true };
    const [requests, quotes, drafts, unsent, toConfirm] = await Promise.all([
      supabase.from("quote_requests").select("id", head).eq("status", "nouvelle"),
      supabase.from("quotes").select("id", head).eq("status", "envoye").lt("sent_at", new Date(Date.now() - settings.quote_followup_days * 86_400_000).toISOString()),
      supabase.from("invoices").select("id", head).eq("status", "brouillon"),
      supabase.from("invoices").select("id", head).not("billing_month", "is", null).is("sent_at", null).in("status", ["envoye", "en_retard"]),
      supabase.from("interventions").select("id", head).eq("status", "planifie").lt("scheduled_date", addDays(today, 0)).is("invoice_id", null)
    ]);
    return { "/demandes": requests.count ?? 0, "/devis": quotes.count ?? 0, "/factures": (drafts.count ?? 0) + (unsent.count ?? 0), "/planning": toConfirm.count ?? 0 };
  } catch {
    return {};
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  async function signOut() {
    "use server";
    await createClient().auth.signOut();
    redirect("/login");
  }
  const counts = await menuCounts();
  return (
    <div className="min-h-screen">
      <Sidebar signOut={signOut} counts={counts} />
      <main className="mx-auto max-w-6xl px-4 py-6 md:ml-60 md:px-8">
        <form action="/recherche" className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input name="q" placeholder="Rechercher un client, devis, facture, contrat…" aria-label="Recherche"
            className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </form>
        <Flash />
        {children}
      </main>
    </div>
  );
}

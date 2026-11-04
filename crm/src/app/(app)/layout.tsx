import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadActions, menuCountsFrom } from "@/lib/actions";
import { Sidebar } from "@/components/crm/nav";
import { Flash } from "@/components/crm/flash";

export const dynamic = "force-dynamic";

/** Compteurs affichés dans le menu : mêmes chiffres que « Actions à faire ». */
async function menuCounts(): Promise<Record<string, number>> {
  try {
    return menuCountsFrom(await loadActions(createClient()));
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
      <main className="mx-auto max-w-6xl px-4 py-6 md:ml-64 md:px-8">
        <form action="/recherche" className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input name="q" placeholder="Rechercher un client, site, adresse, téléphone, mission, devis, facture…" aria-label="Recherche"
            className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </form>
        <Flash />
        {children}
      </main>
    </div>
  );
}

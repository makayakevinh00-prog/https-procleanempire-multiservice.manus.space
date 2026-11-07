import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth";
import { loadActions, menuCountsFrom } from "@/lib/actions";
import { Sidebar } from "@/components/crm/nav";
import { Topbar } from "@/components/crm/topbar";
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
  // Porte d'entrée : tout autre compte que celui du patron n'obtient aucune page ni aucun chiffre (la base refuse déjà ses lectures).
  if (!(await isOwner())) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-bold">Accès refusé</h1>
        <p className="mt-3 text-sm text-slate-600">Ce compte n&apos;a pas accès à cet espace.</p>
        <form action={signOut} className="mt-6">
          <button className="rounded-md border px-4 py-2 text-sm font-semibold">Se déconnecter</button>
        </form>
      </main>
    );
  }
  const [counts, { data }] = await Promise.all([menuCounts(), createClient().auth.getUser()]);
  return (
    <div className="min-h-screen">
      <Sidebar signOut={signOut} counts={counts} />
      <div className="md:ml-64">
        <Topbar actionsCount={counts["/actions"] ?? 0} email={data.user?.email ?? ""} signOut={signOut} />
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-8">
          <Flash />
          {children}
        </main>
      </div>
    </div>
  );
}

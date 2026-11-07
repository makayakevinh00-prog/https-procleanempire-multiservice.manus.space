import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth";
import { SidebarLive, TopbarLive } from "@/components/crm/shell-live";
import { Flash } from "@/components/crm/flash";

export const dynamic = "force-dynamic";

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
  return (
    <div className="min-h-screen">
      {process.env.VERCEL_ENV === "preview" && (
        <div role="note" className="sticky top-0 z-50 bg-amber-300 px-4 py-1 text-center text-xs font-bold text-slate-900">
          BASE DE TEST · données fictives, aucun e-mail réel, aucun accès à la production
        </div>
      )}
      <SidebarLive signOut={signOut} />
      <div className="md:ml-64">
        <TopbarLive signOut={signOut} />
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-8">
          <Flash />
          {children}
        </main>
      </div>
    </div>
  );
}

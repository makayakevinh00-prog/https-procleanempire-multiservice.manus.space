import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

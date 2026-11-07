import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accès refusé", robots: { index: false } };

/** Page publique affichée (code 403) à tout compte connecté qui n'est pas celui du dirigeant. Elle n'affiche aucune donnée. */
export default function AccessDenied() {
  async function signOut() {
    "use server";
    await createClient().auth.signOut();
    redirect("/login");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] p-6">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-xl font-extrabold text-slate-900">Accès refusé</h1>
        <p className="mt-3 text-sm text-slate-600">Ce compte n&apos;a pas accès à cet espace.</p>
        <form action={signOut} className="mt-6">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Se déconnecter</button>
        </form>
      </div>
    </main>
  );
}

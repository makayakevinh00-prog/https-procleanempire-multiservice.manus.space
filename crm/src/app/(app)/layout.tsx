import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/crm/nav";
import { Flash } from "@/components/crm/flash";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  async function signOut() {
    "use server";
    await createClient().auth.signOut();
    redirect("/login");
  }
  return (
    <div className="min-h-screen">
      <Sidebar signOut={signOut} />
      <main className="mx-auto max-w-6xl px-4 py-6 md:ml-60 md:px-8">
        <Flash />
        {children}
      </main>
    </div>
  );
}

import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewAccounting } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  await createClient().auth.signOut();
  redirect("/login");
}

/** Coquille minimale de l'espace comptable : aucun menu du CRM, seulement la comptabilité. L'activation (/compta/activer) a sa propre page. */
export default async function ComptaLayout({ children }: { children: React.ReactNode }) {
  const allowed = await canViewAccounting();
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:px-10">
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="h-9 w-auto" />
        <div className="text-[15px] font-semibold">Espace comptable</div>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">lecture seule</span>
        {allowed && <form action={signOut} className="ml-auto"><button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Se déconnecter</button></form>}
      </header>
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 md:px-10">{children}</main>
    </div>
  );
}

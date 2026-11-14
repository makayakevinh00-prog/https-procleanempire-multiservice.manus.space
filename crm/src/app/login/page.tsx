import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  async function signIn(fd: FormData) {
    "use server";
    const { error } = await createClient().auth.signInWithPassword({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? "")
    });
    const next = String(fd.get("next") ?? "");
    const safe = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";   // retour interne seulement
    if (error) redirect("/login?error=" + encodeURIComponent("Identifiants invalides.") + (safe !== "/" ? "&next=" + encodeURIComponent(safe) : ""));
    redirect(safe);
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col items-center gap-2 pb-2 text-center">
            <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="h-24 w-auto" priority />
            <h1 className="text-lg font-bold text-slate-900">Espace de gestion</h1>
          </div>
          {searchParams.error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-900">{searchParams.error}</p>}
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={searchParams.next ?? ""} />
            <Field label="E-mail"><Input name="email" type="email" required autoComplete="username" /></Field>
            <Field label="Mot de passe"><Input name="password" type="password" required autoComplete="current-password" /></Field>
            <Button className="w-full">Se connecter</Button>
          </form>
          <p className="text-center text-xs text-slate-500">Nettoyeur, agent, livreur ou conciergerie ? <a href="/connexion?autre=1" className="font-medium text-slate-900 underline">Connexion par code</a></p>
        </CardContent>
      </Card>
    </main>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  async function signIn(fd: FormData) {
    "use server";
    const { error } = await createClient().auth.signInWithPassword({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? "")
    });
    if (error) redirect("/login?error=" + encodeURIComponent("Identifiants invalides."));
    redirect("/");
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-bold">ProClean <span className="text-primary">CRM</span></h1>
          {searchParams.error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-900">{searchParams.error}</p>}
          <form action={signIn} className="space-y-4">
            <Field label="E-mail"><Input name="email" type="email" required autoComplete="username" /></Field>
            <Field label="Mot de passe"><Input name="password" type="password" required autoComplete="current-password" /></Field>
            <Button className="w-full">Se connecter</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

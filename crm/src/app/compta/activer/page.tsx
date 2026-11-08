import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activer l'accès comptable" };

const back = (kind: "error" | "ok", msg: string) => redirect(`/compta/activer?${kind}=${encodeURIComponent(msg)}`);
const mail = (fd: FormData) => String(fd.get("email") ?? "").trim().toLowerCase();

/**
 * Activation de l'accès comptable : le comptable crée son compte (ou se connecte), puis saisit le code reçu du patron.
 * Les actions sont ici (comme la connexion) : elles ne donnent aucun droit à elles seules, c'est le code lié à l'adresse invitée qui active l'accès.
 */
export default async function ActivatePage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const sb = createClient();
  const { data: u } = await sb.auth.getUser();
  const { data: already } = u.user ? await sb.rpc("is_accountant") : { data: false };
  if (already === true) redirect("/compta");

  async function claimAction(fd: FormData) {
    "use server";
    const { data, error } = await createClient().rpc("accountant_claim", { p_code: String(fd.get("code") ?? "").trim().toUpperCase() });
    if (error || data !== true) back("error", "Code incorrect, expiré ou adresse différente de celle invitée. Après 5 erreurs, demandez une nouvelle invitation.");
    redirect("/compta");
  }
  async function signUpAction(fd: FormData) {
    "use server";
    const password = String(fd.get("password") ?? "");
    if (password.length < 10) back("error", "Mot de passe : 10 caractères minimum.");
    const c = createClient();
    const { data, error } = await c.auth.signUp({ email: mail(fd), password });
    if (error) back("error", "Création impossible : cette adresse a peut-être déjà un compte (utilisez « Se connecter »).");
    if (!data.session) back("ok", "Compte créé. Confirmez votre adresse avec le lien reçu par e-mail, puis revenez ici pour vous connecter et saisir votre code.");
    redirect("/compta/activer");
  }
  async function signInAction(fd: FormData) {
    "use server";
    const { error } = await createClient().auth.signInWithPassword({ email: mail(fd), password: String(fd.get("password") ?? "") });
    if (error) back("error", "Identifiants invalides.");
    redirect("/compta/activer");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col items-center gap-2 pb-1 text-center">
            <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="h-20 w-auto" priority />
            <h1 className="text-lg font-bold text-slate-900">Accès comptable</h1>
            <p className="text-sm text-slate-600">Accès en lecture seule à la comptabilité de ProClean Empire.</p>
          </div>
          {searchParams.error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-900">{searchParams.error}</p>}
          {searchParams.ok && <p role="status" className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">{searchParams.ok}</p>}
          {u.user ? (
            <form action={claimAction} className="space-y-3">
              <p className="text-sm text-slate-700">Connecté en tant que <b>{u.user.email}</b>. Saisissez le code d&apos;invitation reçu de ProClean Empire.</p>
              <Field label="Code d'invitation"><Input name="code" required autoComplete="off" autoCapitalize="characters" maxLength={20} className="font-mono uppercase tracking-widest" /></Field>
              <Button className="w-full">Activer mon accès</Button>
              <p className="text-center text-xs text-slate-500">Ce n&apos;est pas la bonne adresse ? <Link href="/login" className="underline">Se connecter avec une autre</Link></p>
            </form>
          ) : (
            <div className="space-y-5">
              <form action={signUpAction} className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-800">1. Première visite : créer mon compte</h2>
                <Field label="Adresse e-mail (celle de l'invitation)"><Input name="email" type="email" required autoComplete="username" /></Field>
                <Field label="Mot de passe (10 caractères minimum)"><Input name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
                <Button className="w-full">Créer mon compte</Button>
              </form>
              <form action={signInAction} className="space-y-3 border-t pt-4">
                <h2 className="text-sm font-semibold text-slate-800">2. J&apos;ai déjà un compte</h2>
                <Field label="Adresse e-mail"><Input name="email" type="email" required autoComplete="username" /></Field>
                <Field label="Mot de passe"><Input name="password" type="password" required autoComplete="current-password" /></Field>
                <Button variant="outline" className="w-full">Se connecter</Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  async function signIn(fd: FormData) {
    "use server";
    const { error } = await createClient().auth.signInWithPassword({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    });
    if (error)
      redirect("/login?error=" + encodeURIComponent("Identifiants invalides."));
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Panneau gauche — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0d1a28] via-[#0b1e22] to-[#061412] p-12 lg:flex">
        {/* cercles décoratifs */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-teal-400/8 blur-2xl" />

        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Image
              src="/logo.png"
              alt="ProClean Empire"
              width={187}
              height={344}
              className="h-12 w-auto"
              priority
            />
          </div>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight text-white">
            ProClean Empire
          </h2>
          <p className="mt-3 text-lg text-slate-400">
            Espace de gestion — clients, missions, facturation et opérations.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              { n: "Clients & Devis", d: "Suivi commercial complet" },
              { n: "Planning & Missions", d: "Gestion des interventions" },
              { n: "Facturation", d: "Factures, paiements, Qonto" },
            ].map((f) => (
              <div key={f.n} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{f.n}</div>
                  <div className="text-xs text-slate-500">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} ProClean Empire — usage interne
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* logo mobile */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0d1a28] shadow">
              <Image
                src="/logo.png"
                alt="ProClean Empire"
                width={187}
                height={344}
                className="h-10 w-auto"
                priority
              />
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-900">
                ProClean Empire
              </div>
              <div className="text-sm text-slate-500">Espace de gestion</div>
            </div>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-3xl font-extrabold text-slate-900">
              Connexion
            </h1>
            <p className="mt-2 text-slate-500">
              Entrez vos identifiants pour accéder à votre espace.
            </p>
          </div>
          <div className="lg:hidden">
            <h1 className="text-center text-2xl font-extrabold text-slate-900">
              Connexion
            </h1>
          </div>

          {searchParams.error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              {searchParams.error}
            </div>
          )}

          <form action={signIn} className="mt-8 space-y-5">
            <Field label="Adresse e-mail">
              <Input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="votre@email.com"
              />
            </Field>
            <Field label="Mot de passe">
              <Input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </Field>
            <Button className="mt-2 h-12 w-full text-base font-semibold">
              Se connecter
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Accès réservé aux membres de l&apos;équipe ProClean Empire.
          </p>
        </div>
      </div>
    </div>
  );
}

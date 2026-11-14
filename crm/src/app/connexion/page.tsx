import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Brush, CalendarDays, Shirt, Building2, LayoutDashboard, ChevronRight } from "lucide-react";
import { agentPrefs } from "@/lib/agent";
import { loginStartAction, loginVerifyAction, logoutAction } from "@/app/actions/nettoyeur";
import { FIELD_CSS } from "@/components/agent/theme";
import { ForgetLocal } from "@/components/nettoyeur/live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion — ProClean", manifest: "/nettoyeur/manifest.webmanifest", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const viewport: Viewport = { themeColor: "#ffffff" };

type Space = { kind: string; label: string; path: string };
const KIND: Record<string, { title: string; sub: string; icon: typeof Brush }> = {
  nettoyeur: { title: "Nettoyeur indépendant", sub: "Mes ménages, mes demandes, mes gains", icon: Brush },
  agent: { title: "Agent ProClean", sub: "Mon planning et mes missions", icon: CalendarDays },
  linge: { title: "Livreur de linge", sub: "Mes tournées", icon: Shirt },
  partenaire: { title: "Conciergerie", sub: "Mes logements et mes ménages", icon: Building2 },
  gestion: { title: "Espace de gestion", sub: "Le CRM complet (mot de passe demandé)", icon: LayoutDashboard }
};
const input = "h-14 w-full rounded-2xl border border-[var(--a-line)] bg-[var(--a-bg)] px-4 text-[18px]";

/** Entrée unique de l'application : une adresse e-mail, un code, puis son ou ses espaces. */
export default function LoginPage({ searchParams }: { searchParams: { etape?: string; error?: string; choisir?: string; bye?: string; autre?: string } }) {
  const jar = cookies();
  let session: { email: string; spaces: Space[] } | null = null;
  try { const v = JSON.parse(jar.get("pc_spaces")?.value ?? "null"); if (v && Array.isArray(v.spaces) && v.spaces.length) session = v; } catch { session = null; }
  // Un seul espace de terrain : on y va directement. L'espace de gestion demande son mot de passe : on laisse toujours le choix (et la déconnexion) visibles.
  const pending = jar.get("pc_login_email")?.value ?? "";
  const step = searchParams.etape === "code" && pending ? "code" : session && !searchParams.autre ? "espaces" : "email";
  if (step === "espaces" && session!.spaces.length === 1 && session!.spaces[0]!.kind !== "gestion" && !searchParams.choisir && !searchParams.error && !searchParams.bye) redirect(session!.spaces[0]!.path);
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <main className="mx-auto max-w-md px-4 py-10">
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="mb-4 h-20 w-auto" priority />
        {searchParams.bye && <ForgetLocal />}
        {searchParams.error && <div role="alert" className="mb-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
        {searchParams.bye && !session && <div role="status" className="mb-4 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">Vous êtes déconnecté de cet appareil.</div>}

        {step === "espaces" && session && (
          <>
            <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Mes espaces</h1>
            <p className="mt-1 text-[15px] text-[var(--a-mute)]">Mémorisés sur cet appareil. Choisissez où aller.</p>
            <div className="mt-5 space-y-3">
              {session.spaces.map((s) => { const k = KIND[s.kind] ?? KIND.nettoyeur!, Icon = k.icon; return (
                <a key={s.path} href={s.path} className="flex items-center gap-4 rounded-3xl bg-[var(--a-card)] p-4 active:opacity-90">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--a-soft)] text-[var(--a-pri)]"><Icon className="h-6 w-6" /></span>
                  <span className="min-w-0 flex-1"><b className="block text-[17px]">{k.title}</b><span className="block truncate text-[13px] text-[var(--a-mute)]">{s.kind === "gestion" ? k.sub : `${s.label} · ${k.sub}`}</span></span>
                  <ChevronRight className="h-5 w-5 text-[var(--a-mute)]" />
                </a>); })}
            </div>
            <Link href="/connexion?autre=1" className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-[var(--a-pri)] text-[16px] font-extrabold text-white">Me connecter avec une autre adresse</Link>
            <form action={logoutAction} className="mt-3"><button className="h-12 w-full rounded-2xl border border-[var(--a-line)] text-[15px] font-extrabold text-[var(--a-mute)]">Tout oublier sur cet appareil</button></form>
          </>
        )}

        {step === "email" && (
          <>
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">Connexion</h1>
            <p className="mt-1 text-[16px] text-[var(--a-mute)]">Nettoyeur, agent, livreur, conciergerie ou gestion : entrez votre e-mail, nous vous envoyons un code.</p>
            <form action={loginStartAction} className="mt-6 space-y-3">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              <label className="block"><span className="mb-1 block text-[14px] font-bold">Votre e-mail</span><input name="email" type="email" required autoComplete="email" inputMode="email" className={input} placeholder="prenom@exemple.fr" /></label>
              <button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Recevoir mon code</button>
            </form>
            <div className="mt-8 space-y-2 text-center text-[15px]">
              <Link href="/nettoyeur/inscription" className="block font-extrabold text-[var(--a-pri)]">Devenir nettoyeur : créer mon compte</Link>
              <Link href="/login" className="block text-[var(--a-mute)]">Espace de gestion avec mot de passe</Link>
              {session && <Link href="/connexion?choisir=1" className="block text-[var(--a-mute)]">Revenir à mes espaces mémorisés</Link>}
            </div>
          </>
        )}

        {step === "code" && (
          <>
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">Votre code</h1>
            <p className="mt-1 text-[16px] text-[var(--a-mute)]">Si un compte existe pour <b className="text-[var(--a-ink)]">{pending}</b>, un code à 6 chiffres vient d&apos;être envoyé. Il est valable 10 minutes. Regardez aussi les courriers indésirables.</p>
            <form action={loginVerifyAction} className="mt-6 space-y-3">
              <label className="block"><span className="mb-1 block text-[14px] font-bold">Code reçu par e-mail</span><input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} className={`${input} text-center text-[28px] font-extrabold tracking-[0.4em]`} placeholder="000000" autoFocus /></label>
              <button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Me connecter</button>
            </form>
            <Link href="/connexion?autre=1" className="mt-6 block text-center text-[15px] font-bold text-[var(--a-pri)]">Utiliser une autre adresse ou renvoyer un code</Link>
          </>
        )}
      </main>
    </div>
  );
}

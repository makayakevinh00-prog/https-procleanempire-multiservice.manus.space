import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, agentPrefs, isToken } from "@/lib/agent";
import { cleanerSiretAction } from "@/app/actions/nettoyeur";
import { FIELD_CSS } from "@/components/agent/theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon compte en attente — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };
const input = "h-14 w-full rounded-2xl border border-[var(--a-line)] bg-[var(--a-bg)] px-4 text-[18px]";
const btn = "flex h-14 items-center justify-center rounded-2xl text-[16px] font-extrabold";

/** Compte de nettoyeur créé sans SIRET : la personne crée son entreprise, puis saisit son SIRET. Aucun ménage n'est visible avant. */
export default async function PendingPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string; nouveau?: string } }) {
  const token = params.token;
  if (!isToken(token)) redirect("/connexion");
  const { data, error } = await agentClient().rpc("cleaner_pending", { p_token: token });
  const p = data as { name: string; statut_pro: string; state: "actif" | "sans_siret" | "a_valider" } | null;
  if (p?.state === "actif") redirect(`/nettoyeur/${token}`);
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <main className="mx-auto max-w-md px-4 py-8">
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="mb-3 h-16 w-auto" priority />
        {error || !p ? (
          <>
            <h1 className="text-[28px] font-extrabold leading-tight">Lien invalide ou expiré</h1>
            <p className="mt-2 text-[16px] text-[var(--a-mute)]">{error ? agentMessage(error.message) : "Reconnectez-vous avec votre e-mail."}</p>
            <a href="/connexion" className={`${btn} mt-6 bg-[var(--a-pri)] text-white`}>Me connecter</a>
          </>
        ) : (
          <>
            <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Bonjour {p.name.split(" ")[0]}</h1>
            {searchParams.nouveau && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Votre compte est créé. Un e-mail avec le lien de cette page vient de vous être envoyé.</div>}
            {searchParams.ok && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
            {searchParams.error && <div role="alert" className="mt-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}

            {p.state === "a_valider" ? (
              <section className="mt-5 rounded-3xl bg-[var(--a-card)] p-5 text-[16px]"><b className="block text-[18px]">SIRET reçu, vérification en cours</b><p className="mt-2 text-[var(--a-mute)]">Nous vérifions votre SIRET et activons votre compte très vite. Vous recevrez un e-mail.</p></section>
            ) : (
              <>
                <p className="mt-2 text-[16px] text-[var(--a-mute)]">Pour recevoir des ménages, il vous faut un numéro <b className="text-[var(--a-ink)]">SIRET</b> : c&apos;est le numéro de votre entreprise. Sans lui, nous ne pouvons pas vous payer. Tant qu&apos;il manque, votre compte reste en attente.</p>

                <section className="mt-5 space-y-3 rounded-3xl bg-[var(--a-card)] p-5">
                  <b className="block text-[13px] uppercase tracking-[0.14em] text-[var(--a-mute)]">Étape 1</b>
                  <h2 className="text-[20px] font-extrabold">Créer mon entreprise</h2>
                  <p className="text-[15px] text-[var(--a-mute)]">Le statut le plus simple est l&apos;auto-entreprise (micro-entreprise). Comptez quelques jours à deux semaines pour recevoir le SIRET.</p>
                  <a href="https://www.legalplace.fr/" target="_blank" rel="noreferrer" className={`${btn} bg-[var(--a-pri)] text-white`}>Créer avec LegalPlace (accompagné, payant)</a>
                  <a href="https://www.autoentrepreneur.urssaf.fr/" target="_blank" rel="noreferrer" className={`${btn} border border-[var(--a-pri)] text-[var(--a-pri)]`}>Créer moi-même, gratuitement (site officiel)</a>
                  <p className="text-[13px] text-[var(--a-mute)]">Activité à déclarer : « nettoyage courant des bâtiments ». Étudiant(e) : c&apos;est compatible avec vos études.</p>
                </section>

                <section className="mt-4 space-y-3 rounded-3xl bg-[var(--a-card)] p-5">
                  <b className="block text-[13px] uppercase tracking-[0.14em] text-[var(--a-mute)]">Étape 2</b>
                  <h2 className="text-[20px] font-extrabold">Saisir mon SIRET</h2>
                  <p className="text-[15px] text-[var(--a-mute)]">Dès que vous l&apos;avez reçu, entrez-le ici : il est contrôlé dans l&apos;annuaire officiel et votre compte s&apos;active aussitôt.</p>
                  <form action={cleanerSiretAction.bind(null, token)} className="space-y-3">
                    <input name="siret" required inputMode="numeric" className={input} placeholder="14 chiffres" />
                    <button className={`${btn} w-full bg-[var(--a-pri)] text-white`}>Activer mon compte</button>
                  </form>
                </section>
              </>
            )}
            <form method="post" action="/connexion/sortir" className="mt-6"><input type="hidden" name="t" value={token} /><button className="h-12 w-full rounded-2xl border border-[var(--a-line)] text-[15px] font-extrabold text-[var(--a-mute)]">Me déconnecter</button></form>
          </>
        )}
      </main>
    </div>
  );
}

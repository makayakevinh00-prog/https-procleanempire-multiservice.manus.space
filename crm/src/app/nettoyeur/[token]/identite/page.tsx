import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { Gate } from "@/components/agent/gate";
import { startIdentityAction } from "@/app/actions/nettoyeur";
import { syncIdentity, type CleanerIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vérifier mon identité — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Vérification d'identité : pièce d'identité + selfie, faite par Stripe. ProClean ne conserve aucun document, seulement le résultat. */
export default async function CleanerIdentityPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  if (!isToken(params.token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_identity", { p_token: params.token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const c = data as CleanerIdentity;
  let status = c.status;
  if (status === "en_cours" && c.session_id) status = await syncIdentity(c.id, c.session_id).catch(() => status);
  const done = status === "verifie" || status === "non_requis";
  return (
    <>
      <h1 className="mb-3 text-[30px] font-extrabold tracking-tight">Vérifier mon identité</h1>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      {done ? (
        <p className="rounded-3xl bg-[var(--a-okbg)] p-5 text-[16px] font-bold text-[var(--a-ok)]"><ShieldCheck className="mr-2 inline h-5 w-5" />Identité vérifiée. Vous pouvez accepter des ménages.</p>
      ) : status === "en_cours" ? (
        <p className="rounded-3xl bg-[var(--a-warnbg)] p-5 text-[16px] font-bold text-[var(--a-warn)]">Vérification en cours de traitement. Revenez sur cette page dans quelques minutes.</p>
      ) : (
        <>
          {status === "echec" && <p className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-4 text-[14px] font-bold text-[var(--a-bad)]">La dernière vérification n&apos;a pas abouti. Vous pouvez recommencer avec une pièce lisible et un bon éclairage.</p>}
          <p className="mb-3 rounded-3xl bg-[var(--a-card)] p-5 text-[15px]">Pour la sécurité de nos clients, nous vérifions l&apos;identité de chaque nettoyeur : une photo de votre pièce d&apos;identité (carte d&apos;identité, passeport ou permis) puis un selfie. Cela prend environ 2 minutes. La vérification est faite par notre prestataire Stripe : ProClean ne conserve ni votre pièce ni votre photo, seulement le résultat.</p>
          <form action={startIdentityAction.bind(null, params.token)}>
            <button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Commencer la vérification</button>
          </form>
        </>
      )}
      <Link href={`/nettoyeur/${params.token}/profil`} className="mt-4 inline-block text-[14px] font-bold text-[var(--a-pri)]">← Mon profil</Link>
    </>
  );
}

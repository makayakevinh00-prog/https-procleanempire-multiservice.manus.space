import type { Metadata } from "next";
import { isSignatureToken } from "@/lib/signature";
import { automationClient } from "@/lib/automation/deps";
import { SignForm } from "@/components/crm/sign-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Signature en ligne", robots: { index: false, follow: false }, referrer: "no-referrer" };

type View = { kind: "devis" | "contrat"; doc_number: string; title: string | null; status: string; expires_at: string; signed_at: string | null; signer_name: string | null; company: string };

/** Page publique de signature : le client lit le document, coche son accord, tape son nom et dessine sa signature. */
export default async function SignPage({ params }: { params: { token: string } }) {
  const view = isSignatureToken(params.token) ? ((await automationClient().rpc("signature_view", { p_token: params.token })).data as View | null) : null;
  const box = "mx-auto max-w-3xl px-4 py-8";
  if (!view) return <main className={box}><h1 className="text-2xl font-bold">Lien inconnu</h1><p className="mt-2 text-slate-600">Ce lien de signature n&apos;existe pas ou a été remplacé. Demandez-en un nouveau à l&apos;entreprise.</p></main>;
  const what = view.kind === "devis" ? "devis" : "contrat";
  if (view.status !== "en_attente") {
    const msg = view.status === "signe" ? `Ce ${what} a été signé${view.signer_name ? ` par ${view.signer_name}` : ""}.` : view.status === "expire" ? "Ce lien a expiré. Demandez-en un nouveau." : view.status === "refuse" ? `Ce ${what} a été refusé.` : "Ce lien n'est plus valable : un nouveau a été envoyé.";
    return (
      <main className={box}>
        <h1 className="text-2xl font-bold">{view.kind === "devis" ? "Devis" : "Contrat"} {view.doc_number}</h1>
        <p className="mt-2 text-lg">{msg}</p>
        {view.status === "signe" && <a className="mt-4 inline-block rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white" href={`/signer/${params.token}/pdf?signe=1`}>Télécharger le document signé</a>}
      </main>
    );
  }
  return (
    <main className={box}>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{view.company}</p>
      <h1 className="text-2xl font-bold">{view.kind === "devis" ? "Devis" : "Contrat"} {view.doc_number} à signer</h1>
      {view.title && <p className="text-slate-600">{view.title}</p>}
      <iframe src={`/signer/${params.token}/pdf`} title="Document à signer" className="mt-4 h-[70vh] w-full rounded-xl border bg-white" />
      <p className="mt-1 text-sm"><a className="text-blue-700 underline" href={`/signer/${params.token}/pdf`} target="_blank" rel="noreferrer">Ouvrir le document en grand</a></p>
      <SignForm token={params.token} what={what} />
    </main>
  );
}

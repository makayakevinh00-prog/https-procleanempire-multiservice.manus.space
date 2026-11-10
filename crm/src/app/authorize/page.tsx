import Image from "next/image";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveOAuthAction, denyOAuthAction } from "@/app/actions/oauth";
import { checkAuthRequest } from "@/lib/oauth-check";

export const dynamic = "force-dynamic";
type P = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Page de consentement : le patron (connecté) autorise un connecteur Claude à utiliser le CRM comme agent « JARVIS Core ». */
export default async function AuthorizePage({ searchParams }: { searchParams: P }) {
  const params = Object.fromEntries(Object.entries(searchParams).map(([k, v]) => [k, one(v)]));
  if (!(await isOwner())) redirect(`/login?next=${encodeURIComponent(`/authorize?${new URLSearchParams(params).toString()}`)}`);
  const c = await checkAuthRequest(params);
  if (!c.ok) redirect(`/authorize/erreur?m=${encodeURIComponent(c.error)}`);
  const hidden = ["client_id", "redirect_uri", "code_challenge", "code_challenge_method", "response_type", "state"].map((k) => <input key={k} type="hidden" name={k} value={params[k] ?? ""} />);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-7">
          <div className="flex flex-col items-center gap-2 text-center">
            <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="h-20 w-auto" priority />
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Autoriser {c.client.client_name ?? "Claude"} ?</h1>
          </div>
          <p className="text-[15px] text-secondary-foreground">Cette application demande à utiliser votre CRM comme agent <b className="font-medium text-foreground">JARVIS Core</b>. Elle pourra :</p>
          <ul className="space-y-1.5 text-[14px] text-secondary-foreground">
            <li>• <b className="font-medium text-foreground">lire et modifier toutes les données du CRM</b> : clients, devis, factures, catalogue de prix, missions, équipe… ;</li>
            <li>• créer des tâches pour vous ;</li>
            <li>• <b className="font-medium text-foreground">proposer</b> des e-mails : rien ne part sans votre validation dans JARVIS.</li>
          </ul>
          <p className="text-[13px] text-muted-foreground">Accès complet réservé à votre assistant : chaque modification est enregistrée dans le journal, et les factures déjà émises restent protégées. Vous pourrez retirer l&apos;accès à tout moment dans Paramètres &gt; Agents.</p>
          <div className="flex gap-3">
            <form action={approveOAuthAction} className="flex-1">{hidden}<Button className="w-full">Autoriser</Button></form>
            <form action={denyOAuthAction} className="flex-1">{hidden}<Button variant="outline" className="w-full">Refuser</Button></form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

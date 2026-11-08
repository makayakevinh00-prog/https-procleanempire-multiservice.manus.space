import { Card, CardContent } from "@/components/ui/card";

export default function AuthorizeError({ searchParams }: { searchParams: { m?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
      <Card className="w-full max-w-md"><CardContent className="space-y-3 p-7 text-center">
        <h1 className="text-lg font-semibold">Connexion impossible</h1>
        <p className="text-[15px] text-secondary-foreground">{(searchParams.m ?? "Demande invalide.").slice(0, 200)}</p>
        <p className="text-[13px] text-muted-foreground">Retournez dans Claude et relancez la connexion.</p>
      </CardContent></Card>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/auth";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLES, SECTIONS, levelOf } from "@/lib/team";

export const dynamic = "force-dynamic";

/** Accueil d'une personne de l'équipe : ce qu'elle peut faire, et rien de plus. Le patron retrouve son tableau de bord. */
export default async function WelcomePage() {
  const a = await getAccess();
  if (a.kind === "owner") redirect("/");
  if (a.kind !== "team") redirect("/invitation");
  const role = (ROLES as Record<string, { label: string }>)[a.role]?.label ?? a.role;
  const open = SECTIONS.filter((s) => levelOf(a.perms, s.key) !== "none");
  return (
    <>
      <PageHeader title={`Bonjour${a.label ? ` ${a.label}` : ""}`} />
      <Card>
        <CardHeader><CardTitle>Votre accès : {role}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-secondary-foreground">
          {!open.length ? <p>Aucune section ne vous est ouverte pour l&apos;instant. Demandez au patron de vous donner accès à ce dont vous avez besoin.</p> : (
            <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
              {open.map((s) => (
                <li key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <Link href={s.routes[0]} className="font-medium text-primary hover:underline">{s.label}</Link>
                  <span className="text-muted-foreground">{s.hint}</span>
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs">{levelOf(a.perms, s.key) === "write" ? "Lecture et modification" : "Lecture seule"}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[13px] text-muted-foreground">Vos accès sont réglés par le patron et peuvent changer à tout moment.</p>
        </CardContent>
      </Card>
    </>
  );
}

import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadActions, type ActionTone } from "@/lib/actions";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GROUPS: { tone: ActionTone; title: string; hint: string; border: string }[] = [
  { tone: "red", title: "Urgent", hint: "À regarder en premier", border: "border-l-4 border-destructive" },
  { tone: "orange", title: "À traiter", hint: "Une décision ou un clic suffit", border: "border-l-4 border-amber-500" },
  { tone: "blue", title: "À compléter", hint: "Pour que les automatisations puissent travailler", border: "border-l-4 border-sky-400" }
];

export default async function ActionsPage() {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const actions = await loadActions(supabase);

  return (
    <>
      <PageHeader title="Actions à faire" subtitle="Tout ce qui attend une décision ou une vérification. Cliquez sur une ligne pour ouvrir la liste déjà filtrée." />
      {!actions.length && (
        <Card><CardContent className="flex items-center gap-3 p-6 text-sm"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Rien à faire pour le moment : les automatisations tournent seules.</CardContent></Card>
      )}
      <div className="space-y-4">
        {GROUPS.map((g) => {
          const rows = actions.filter((a) => a.tone === g.tone);
          if (!rows.length) return null;
          return (
            <Card key={g.tone}>
              <CardHeader><CardTitle>{g.title} ({rows.length})</CardTitle><span className="text-xs text-muted-foreground">{g.hint}</span></CardHeader>
              <ul className="divide-y">
                {rows.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className={`flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/50 ${g.border}`}>
                      {a.count !== undefined && <span className="min-w-8 rounded-full bg-muted px-2 py-0.5 text-center text-sm font-bold">{a.count}</span>}
                      <span className="flex-1">{a.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}

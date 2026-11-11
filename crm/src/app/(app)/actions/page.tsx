import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadActions, type ActionTone } from "@/lib/actions";
import { dismissActionAction, restoreActionAction } from "@/app/actions/todo";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GROUPS: { tone: ActionTone; title: string; hint: string; border: string }[] = [
  { tone: "red", title: "Urgent", hint: "À regarder en premier", border: "border-l-4 border-destructive" },
  { tone: "orange", title: "À traiter", hint: "Une décision ou un clic suffit", border: "border-l-4 border-amber-500" },
  { tone: "blue", title: "Pour information", hint: "Rien d'urgent : à regarder quand vous avez un moment", border: "border-l-4 border-sky-400" }
];

export default async function ActionsPage() {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const actions = await loadActions(supabase);
  const { data: hidden } = await supabase.from("action_dismissals").select("key, count_at, dismissed_at").order("dismissed_at", { ascending: false });

  return (
    <>
      <PageHeader title="Actions à faire" subtitle="Tout ce qui attend une décision. Cliquez sur une ligne pour ouvrir la liste déjà filtrée ; « Masquer » retire une ligne qui ne vous concerne pas (elle revient seulement si la situation s'aggrave)." />
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
                  <li key={a.key} className={`flex items-center hover:bg-muted/50 ${g.border}`}>
                    <Link href={a.href} className="flex flex-1 items-center gap-3 px-5 py-3 text-sm">
                      {a.count !== undefined && <span className="min-w-8 rounded-full bg-muted px-2 py-0.5 text-center text-sm font-bold">{a.count}</span>}
                      <span className="flex-1">{a.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <form action={dismissActionAction.bind(null, a.key, a.count ?? null)} className="pr-4"><button className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" title="Retirer cette ligne de la liste">Masquer</button></form>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      {!!hidden?.length && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Actions masquées ({hidden.length})</summary>
          <ul className="mt-2 divide-y rounded-lg border">{hidden.map((h: any) => (
            <li key={h.key} className="flex items-center justify-between gap-3 px-4 py-2"><span className="truncate text-muted-foreground">{h.key}{h.count_at != null ? ` (masqué à ${h.count_at})` : ""}</span>
              <form action={restoreActionAction.bind(null, h.key)}><button className="text-xs font-medium text-primary hover:underline">Réafficher</button></form></li>
          ))}</ul>
        </details>
      )}
    </>
  );
}

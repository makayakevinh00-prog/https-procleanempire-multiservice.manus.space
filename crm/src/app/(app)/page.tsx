import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadHomeTodo } from "@/lib/home-todo";
import { Card } from "@/components/ui/card";

const DOT = { red: "bg-red-500", orange: "bg-orange-400", blue: "bg-sky-500" } as const;

/** Accueil volontairement sobre : une seule liste « À faire maintenant », une ligne courte par événement. */
export default async function Dashboard() {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const [todo, reserved] = await Promise.all([loadHomeTodo(supabase), supabase.from("clients").select("id, name").eq("is_reserved", true)]);
  if (reserved.error) throw new Error(reserved.error.message);

  const today = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">À faire maintenant</h1>
        <p className="mt-1 text-sm capitalize text-slate-500">{today}</p>
      </div>

      <Card className="overflow-hidden">
        {todo.lines.length === 0 ? (
          <p className="px-5 py-8 text-center text-[15px] text-slate-500">Rien à faire pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todo.lines.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className="group flex items-center gap-3 px-5 py-3.5 text-[15px] text-slate-800 transition-colors hover:bg-slate-50">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[l.tone]}`} aria-hidden />
                  <span className="flex-1">{l.label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {todo.hidden > 0 && (
          <Link href="/actions" className="block border-t border-slate-100 px-5 py-3 text-sm font-semibold text-primary hover:bg-slate-50">
            Voir les {todo.hidden} autres
          </Link>
        )}
      </Card>

      {todo.mailsUnavailable && (
        <p className="mt-3 text-xs text-amber-700">Les mails reçus ne s&apos;affichent pas encore : la migration 0020 (historique des mails) n&apos;est pas appliquée.</p>
      )}
      {(reserved.data?.length ?? 0) > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Contacts réservés (aucune action automatique) :
          {reserved.data!.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="font-medium underline">{c.name}</Link>
          ))}
        </p>
      )}
    </div>
  );
}

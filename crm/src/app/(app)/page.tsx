import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadTodo } from "@/lib/todo";

export const dynamic = "force-dynamic";

const DOT = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  blue: "bg-primary",
} as const;

/** Accueil : une seule section, « À faire maintenant » — une ligne courte par événement, un clic ouvre la bonne fiche. */
export default async function Dashboard() {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const { lines, hidden } = await loadTodo(supabase);

  const hour = Number(
    new Date().toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "numeric",
      hour12: false,
    }),
  );
  const greeting = hour < 18 ? "Bonjour" : "Bonsoir";
  const date = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#14213d] md:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1 text-sm capitalize text-slate-500">{date}</p>
      </header>

      <section
        aria-labelledby="todo-title"
        className="overflow-hidden rounded-2xl border border-slate-200/70 bg-card shadow-sm"
      >
        <h2
          id="todo-title"
          className="border-b border-slate-100 px-5 py-4 text-base font-bold text-[#14213d]"
        >
          À faire maintenant
        </h2>
        {!lines.length ? (
          <p className="flex items-center gap-2 px-5 py-8 text-[15px] text-slate-600">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Rien à faire pour
            l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lines.map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  className="group flex items-center gap-3 px-5 py-3.5 text-[15px] text-slate-800 transition-colors hover:bg-slate-50"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[l.tone]}`}
                    aria-hidden
                  />
                  <span className="flex-1 leading-snug">{l.text}</span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 && (
          <Link
            href="/actions"
            className="block border-t border-slate-100 px-5 py-3 text-sm font-semibold text-primary hover:bg-slate-50"
          >
            + {hidden} autre{hidden > 1 ? "s" : ""} — tout voir
          </Link>
        )}
      </section>
    </div>
  );
}

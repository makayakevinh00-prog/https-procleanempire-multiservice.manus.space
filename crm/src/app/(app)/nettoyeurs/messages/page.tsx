import { createClient } from "@/lib/supabase/server";
import { adminPostMessageAction } from "@/app/actions/nettoyeur";

export const dynamic = "force-dynamic";
type M = { id: string; job_id: string; role: string; author: string | null; body: string; created_at: string };

/** Messages des ménages : tous les fils récents, avec réponse de la direction. */
export default async function MessagesPage({ searchParams }: { searchParams: { error?: string } }) {
  const db = createClient();
  const { data } = await db.from("cleaning_messages").select("id, job_id, role, author, body, created_at").order("created_at", { ascending: false }).limit(200);
  const msgs = (data ?? []) as M[];
  const ids = Array.from(new Set(msgs.map((m) => m.job_id)));
  const { data: jobs } = ids.length ? await db.from("cleaning_jobs").select("id, title, job_date").in("id", ids) : { data: [] };
  const title = new Map((jobs ?? []).map((j) => [j.id as string, `${j.title as string} · ${new Date((j.job_date as string) + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })}`]));
  const threads = ids.map((id) => ({ id, items: msgs.filter((m) => m.job_id === id).reverse() }));
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Messages des ménages</h1>
      {searchParams.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      {!threads.length && <p className="text-sm text-muted-foreground">Aucun message pour l&apos;instant.</p>}
      {threads.map((t) => (
        <section key={t.id} className="space-y-2 rounded-xl border p-4">
          <h2 className="font-semibold">{title.get(t.id) ?? "Ménage"}</h2>
          <ul className="space-y-1.5 text-sm">
            {t.items.map((m) => <li key={m.id}><b>{m.author ?? m.role}</b> <span className="text-muted-foreground">({m.role} · {new Date(m.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })})</span><br />{m.body}</li>)}
          </ul>
          <form action={adminPostMessageAction.bind(null, t.id)} className="flex gap-2">
            <input name="body" required maxLength={1000} placeholder="Répondre au nettoyeur…" className="h-10 flex-1 rounded-lg border px-3 text-sm" />
            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Envoyer</button>
          </form>
        </section>
      ))}
    </div>
  );
}

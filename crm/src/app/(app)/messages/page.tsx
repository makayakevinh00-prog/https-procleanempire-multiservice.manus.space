import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { MessagesLive, type Conversation } from "@/components/crm/messages-live";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

/** Messagerie avec les agents : une conversation par agent, en temps réel. */
export default async function MessagesPage({ searchParams }: { searchParams: { agent?: string } }) {
  const sb = createClient();
  const [{ data: staff }, { data: msgs }] = await Promise.all([
    sb.from("staff").select("id, full_name").eq("active", true).order("full_name"),
    sb.from("team_messages").select("id, staff_id, from_owner, body, created_at, read_at").order("created_at", { ascending: false }).limit(400)
  ]);
  const convs: Conversation[] = ((staff ?? []) as { id: string; full_name: string }[]).map((s) => ({
    id: s.id, name: s.full_name,
    messages: ((msgs ?? []) as any[]).filter((m) => m.staff_id === s.id).reverse().map((m) => ({ id: m.id, fromOwner: m.from_owner, body: m.body, at: m.created_at, read: !!m.read_at }))
  }));
  return (
    <>
      <PageHeader title="Messages" subtitle="Écrivez à vos agents : leurs réponses s'affichent en direct, sans recharger la page." />
      <MessagesLive initial={convs} selected={searchParams.agent ?? null} />
    </>
  );
}

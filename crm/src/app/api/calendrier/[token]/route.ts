import { agentClient } from "@/lib/agent";
import { isToken } from "@/lib/agent";
import { buildCalendar, type FeedEvent } from "@/lib/ical";

export const dynamic = "force-dynamic";

/** Flux calendrier privé (abonnement Outlook). Lecture seule ; le lien secret est vérifié dans la base (empreinte). */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const denied = () => new Response("Lien invalide ou révoqué.", { status: 404, headers: { "cache-control": "no-store" } });
  const token = params.token.replace(/\.ics$/, "");
  if (!isToken(token)) return denied();
  const { data, error } = await agentClient().rpc("calendar_feed_events", { p_token: token });
  if (error) return denied();
  return new Response(buildCalendar((data ?? []) as FeedEvent[]), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex", "content-disposition": 'inline; filename="proclean-missions.ics"' }
  });
}

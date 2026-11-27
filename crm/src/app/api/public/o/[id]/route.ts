import { createAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GIF transparent 1×1 : ouvert par le logiciel de messagerie du destinataire quand il affiche l'e-mail.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id.replace(/\.gif$/i, "");
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    try {
      const sb = createAdmin();
      const { data } = await sb.from("email_opens").select("open_count, first_opened_at").eq("id", id).maybeSingle();
      if (data) {
        const now = new Date().toISOString();
        await sb.from("email_opens").update({ open_count: ((data as any).open_count ?? 0) + 1, first_opened_at: (data as any).first_opened_at ?? now, last_opened_at: now }).eq("id", id);
      }
    } catch { /* le suivi ne doit jamais casser l'affichage de l'e-mail */ }
  }
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
}

import { automationClient, automationSecret } from "@/lib/automation/deps";

export const dynamic = "force-dynamic";

const s = (v: unknown, max = 500) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max) : "");

/**
 * Réception d'une demande de devis envoyée par le site (POST JSON, en-tête x-inbound-secret).
 * La demande apparaît dans « Demandes de devis » ; le client y est créé en un clic.
 */
export async function POST(req: Request) {
  const expected = process.env.INBOUND_SECRET;
  if (!expected || req.headers.get("x-inbound-secret") !== expected) return new Response("Unauthorized", { status: 401 });
  const raw = await req.text();
  if (raw.length > 30_000) return Response.json({ error: "Demande trop volumineuse" }, { status: 413 });
  let b: Record<string, any>;
  try { b = JSON.parse(raw); } catch { return Response.json({ error: "JSON invalide" }, { status: 400 }); }
  if (!s(b.name) || (!s(b.email) && !s(b.phone))) return Response.json({ error: "Nom et e-mail ou téléphone requis" }, { status: 400 });

  const details: Record<string, string> = {};
  if (Array.isArray(b.details)) for (const d of b.details.slice(0, 20)) if (Array.isArray(d) && d.length === 2) details[s(d[0], 80)] = s(d[1], 300);

  const { data, error } = await automationClient().rpc("submit_quote_request", {
    p_secret: automationSecret(),
    p: {
      reference: s(b.reference ?? b.id, 60) || null, received_at: s(b.receivedAt, 40) || null, name: s(b.name, 120), company: s(b.company, 120),
      email: s(b.email, 200), phone: s(b.phone, 40), address: s(b.address, 250), postcode: s(b.postcode, 10), city: s(b.city, 120),
      service: s(b.service, 120), start_date: s(b.startDate, 40), message: s(b.comments ?? b.message, 2000), details, source: s(b.source, 120)
    }
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: data, duplicate: data === null });
}

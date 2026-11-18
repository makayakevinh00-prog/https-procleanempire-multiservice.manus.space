import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Recherche rapide de la barre Commande K : quelques résultats par type (clients, devis, factures, sites, missions). Accès réservé au patron et à l'équipe (la base applique ses droits). */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().replace(/[%,()]/g, " ").slice(0, 60);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const like = `%${q}%`, sb = createClient();
  const [clients, quotes, invoices, sites, missions] = await Promise.all([
    sb.from("clients").select("id, name, city").or(`name.ilike.${like},email.ilike.${like},city.ilike.${like},siret.ilike.${like}`).limit(5),
    sb.from("quotes").select("id, number, subject, clients(name)").or(`number.ilike.${like},subject.ilike.${like}`).limit(4),
    sb.from("invoices").select("id, number, subject, clients(name)").or(`number.ilike.${like},subject.ilike.${like}`).limit(4),
    sb.from("sites").select("id, name, city").or(`name.ilike.${like},address.ilike.${like},city.ilike.${like}`).limit(4),
    sb.from("interventions").select("id, title, scheduled_date, clients(name)").or(`title.ilike.${like},site_address.ilike.${like}`).order("scheduled_date", { ascending: false }).limit(4)
  ]);
  const results = [
    ...(clients.data ?? []).map((c: any) => ({ type: "Client", label: c.name, sub: c.city ?? "", href: `/clients/${c.id}` })),
    ...(quotes.data ?? []).map((d: any) => ({ type: "Devis", label: d.number, sub: [d.clients?.name, d.subject].filter(Boolean).join(" · "), href: `/devis/${d.id}` })),
    ...(invoices.data ?? []).map((d: any) => ({ type: "Facture", label: d.number ?? "Brouillon", sub: [d.clients?.name, d.subject].filter(Boolean).join(" · "), href: `/factures/${d.id}` })),
    ...(sites.data ?? []).map((s: any) => ({ type: "Site", label: s.name, sub: s.city ?? "", href: `/sites/${s.id}` })),
    ...(missions.data ?? []).map((m: any) => ({ type: "Mission", label: m.title, sub: [m.clients?.name, m.scheduled_date].filter(Boolean).join(" · "), href: `/missions/${m.id}` }))
  ];
  return NextResponse.json({ results });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyQuery, mapResult, type Company } from "@/lib/entreprises";

export const dynamic = "force-dynamic";
const H = { "cache-control": "no-store" };

/**
 * Recherche d'entreprise dans l'annuaire officiel (API publique gratuite, sans clé) : nom commercial, SIREN, SIRET ou n° de TVA.
 * Accès réservé au patron (middleware) ; seul le texte tapé part vers l'annuaire.
 */
export async function GET(req: Request) {
  const c = classifyQuery(new URL(req.url).searchParams.get("q") ?? "");
  if (c.kind === "short")
    return NextResponse.json({ results: [] }, { headers: H });

  let raw: any;
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(c.q)}&per_page=6`,
      {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
        headers: { accept: "application/json" },
      },
    );
    if (!res.ok)
      return NextResponse.json(
        {
          error:
            "L'annuaire des entreprises ne répond pas, réessayez dans un instant.",
        },
        { status: 502, headers: H },
      );
    raw = await res.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "L'annuaire des entreprises ne répond pas, réessayez dans un instant.",
      },
      { status: 502, headers: H },
    );
  }

  const results = ((raw?.results ?? []) as any[])
    .map(mapResult)
    .filter((x): x is Company => !!x);
  const sirens = results.map((r) => r.siren); // déjà validés : 9 chiffres exactement
  const existing = new Map<string, { id: string; name: string }>();
  if (sirens.length) {
    const { data } = await createClient()
      .from("clients")
      .select("id, name, siren, siret")
      .or(
        `siren.in.(${sirens.join(",")}),${sirens.map((s) => `siret.like.${s}*`).join(",")}`,
      );
    for (const row of data ?? []) {
      const s =
        row.siren ??
        String(row.siret ?? "")
          .replace(/\s/g, "")
          .slice(0, 9);
      if (s) existing.set(s, { id: row.id, name: row.name });
    }
  }
  return NextResponse.json(
    {
      results: results.map((r) => ({
        ...r,
        existing: existing.get(r.siren) ?? null,
      })),
    },
    { headers: H },
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { monthLabel, statement } from "@/lib/concierge/plan";
import { PrintButton } from "@/components/crm/print-button";
import { formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
const DONE = ["terminee", "validee", "facturable", "facturee"];
const next = (m: string) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** Relevé du propriétaire pour un mois : revenus locatifs, commission, ménages réalisés. À imprimer ou enregistrer en PDF. */
export default async function StatementPage({
  searchParams,
}: {
  searchParams: { client?: string; m?: string };
}) {
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.m ?? "")
    ? searchParams.m!
    : null;
  if (!searchParams.client || !month) notFound();
  const sb = createClient();
  const [owner, settings, ctr, mis, lst] = await Promise.all([
    sb
      .from("clients")
      .select("id, name, address, postal_code, city")
      .eq("id", searchParams.client)
      .maybeSingle(),
    getSettings(sb),
    sb
      .from("contracts")
      .select(
        "id, label, commission_pct, concierge_revenues(month, revenue_ht)",
      )
      .eq("client_id", searchParams.client)
      .not("commission_pct", "is", null),
    sb
      .from("interventions")
      .select("title, scheduled_date, quantity, unit_price_ht, stage")
      .eq("client_id", searchParams.client)
      .like("source_key", "conc:%")
      .gte("scheduled_date", `${month}-01`)
      .lt("scheduled_date", `${next(month)}-01`)
      .order("scheduled_date"),
    sb
      .from("concierge_listings")
      .select("name")
      .eq("client_id", searchParams.client)
      .order("name"),
  ]);
  if (!owner.data) notFound();
  const o = owner.data as any;
  const revenues = ((ctr.data ?? []) as any[]).flatMap((k) =>
    ((k.concierge_revenues ?? []) as any[])
      .filter((r) => r.month === month)
      .map((r) => ({
        revenue: num(r.revenue_ht),
        pct: num(k.commission_pct),
        label: k.label as string,
      })),
  );
  const done = ((mis.data ?? []) as any[]).filter((i) =>
    DONE.includes(i.stage),
  );
  const s = statement(revenues, {
    count: done.length,
    amount: done.reduce(
      (t, i) => t + num(i.quantity ?? 1) * num(i.unit_price_ht ?? 0),
      0,
    ),
  });
  const logements = ((lst.data ?? []) as any[]).map((l) => l.name).join(", ");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/conciergerie?tab=revenus&m=${month}`}
          className="text-sm text-primary hover:underline"
        >
          ← Revenus et commission
        </Link>
        <PrintButton />
      </div>
      <article className="rounded-2xl bg-card p-8 shadow-sm print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-xl font-semibold">Relevé propriétaire</h1>
            <p className="text-sm text-muted-foreground">{monthLabel(month)}</p>
          </div>
          <div className="text-right text-sm">
            <b className="font-semibold">{settings.company_name}</b>
            <div className="text-muted-foreground">
              {settings.company_address}
            </div>
          </div>
        </header>
        <section className="mt-5 text-sm">
          <b className="font-semibold">{o.name}</b>
          <div className="text-muted-foreground">
            {[o.address, [o.postal_code, o.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ")}
          </div>
          {logements && (
            <div className="mt-1 text-muted-foreground">
              Logements : {logements}
            </div>
          )}
        </section>

        <table className="mt-6 w-full text-sm">
          <tbody className="divide-y">
            <tr>
              <td className="py-2.5">Revenus locatifs du mois (HT)</td>
              <td className="py-2.5 text-right num">
                {revenues.length ? formatEUR(s.revenue) : "non saisis"}
              </td>
            </tr>
            {revenues.map((r) => (
              <tr key={r.label} className="text-muted-foreground">
                <td className="py-1.5 pl-4">
                  Commission de gestion {r.pct} % ({r.label})
                </td>
                <td className="py-1.5 text-right num">
                  − {formatEUR((r.revenue * r.pct) / 100)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2.5">Commission de gestion (total)</td>
              <td className="py-2.5 text-right num">
                − {formatEUR(s.commission)}
              </td>
            </tr>
            <tr>
              <td className="py-2.5">Ménages réalisés ({s.cleanings})</td>
              <td className="py-2.5 text-right num">
                − {formatEUR(s.cleaningsAmount)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td className="py-3">Reste à verser au propriétaire</td>
              <td className="py-3 text-right num">{formatEUR(s.net)}</td>
            </tr>
          </tbody>
        </table>

        {done.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">Détail des ménages</h2>
            <ul className="divide-y text-sm">
              {done.map((i, k) => (
                <li key={k} className="flex justify-between py-1.5">
                  <span>
                    {new Date(
                      `${i.scheduled_date}T12:00:00Z`,
                    ).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })}{" "}
                    · {String(i.title).replace(/^Ménage — /, "")}
                  </span>
                  <span className="num text-muted-foreground">
                    {i.unit_price_ht != null
                      ? formatEUR(num(i.quantity ?? 1) * num(i.unit_price_ht))
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          Le « reste à verser » suppose les ménages à la charge du propriétaire
          et les montants HT ; les revenus viennent de la saisie du mois.
          Document établi automatiquement : à vérifier avant de l&apos;envoyer.
        </p>
      </article>
    </div>
  );
}

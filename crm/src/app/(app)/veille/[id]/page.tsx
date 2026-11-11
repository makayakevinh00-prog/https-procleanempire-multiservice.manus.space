import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  askCompetitorResearchAction,
  enrichCompetitorAction,
  deleteCompetitorAction,
  deleteWatchAction,
  saveCompetitorAction,
  saveWatchAction,
  toggleWatchDoneAction,
} from "@/app/actions/veille";
import { IMPACT, WATCH_KIND } from "@/lib/veille";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { CompetitorFields, WatchFields } from "@/components/crm/veille-fields";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
const IMPACT_TONE: Record<string, "gray" | "orange" | "red"> = {
  faible: "gray",
  moyen: "orange",
  fort: "red",
};

export default async function CompetitorPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = createClient();
  const { data: c } = await sb
    .from("competitors")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!c) notFound();
  const [{ data: certs }, { data: links }, { data: watch }] = await Promise.all(
    [
      sb.from("certifications").select("id, name").order("name"),
      sb
        .from("competitor_certifications")
        .select("certification_id")
        .eq("competitor_id", c.id),
      sb
        .from("watch_items")
        .select("*")
        .eq("competitor_id", c.id)
        .order("observed_on", { ascending: false }),
    ],
  );
  const held = new Set(
    (links ?? []).map((l: any) => l.certification_id as string),
  );
  const back = `/veille/${c.id}`;
  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={
          [c.city, c.headcount, c.naf_code && `NAF ${c.naf_code}`]
            .filter(Boolean)
            .join(" · ") || "Concurrent suivi"
        }
        actions={
          <ConfirmAction
            action={deleteCompetitorAction.bind(null, c.id)}
            label="Supprimer"
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50"
            title={`Supprimer « ${c.name} » ?`}
            description="La fiche et ses certifications associées sont supprimées ; ses informations de veille restent dans le journal. Définitif."
            confirmLabel="Oui, supprimer"
          />
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/veille?tab=concurrents" className="text-primary underline">
          ← Tous les concurrents
        </Link>
        {c.status === "archive" && <Badge>Archivé</Badge>}
        {c.website && (
          <a
            className="inline-flex items-center gap-1 text-primary underline"
            href={c.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            Site web <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {c.last_reviewed_on && (
          <span className="text-slate-500">
            Dernière revue : {formatDate(c.last_reviewed_on)}
          </span>
        )}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Ce que l&apos;on sait de {c.name}</CardTitle>
          <form action={enrichCompetitorAction.bind(null, c.id)}><Button size="sm"><Sparkles className="mr-1.5 h-4 w-4" /> Enrichir automatiquement</Button></form>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
            {([["Ville", [c.city, c.postal_code].filter(Boolean).join(" ")], ["Taille", c.headcount], ["Chiffre d'affaires publié", c.revenue_eur ? `${formatEUR(c.revenue_eur)}${c.revenue_year ? ` (${c.revenue_year})` : ""}` : null], ["Activité (NAF)", c.naf_code], ["Création", c.creation_date ? formatDate(c.creation_date) : null], ["SIREN", c.siren]] as [string, string | null][]).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v || <span className="font-normal text-muted-foreground">non renseigné</span>}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Ces informations viennent de l&apos;annuaire officiel des entreprises : ne les saisissez pas, cliquez sur « Enrichir ». Un chiffre d&apos;affaires absent veut dire que l&apos;entreprise ne le publie pas.</p>
          <form action={askCompetitorResearchAction.bind(null, c.id)} className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
            <Button size="sm" variant="outline">Demander la recherche web à l&apos;assistant</Button>
            <span className="text-xs text-muted-foreground">Prix, labels, certifications, points forts : l&apos;assistant les cherche et remplit la fiche ci-dessous.</span>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Notes et analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={saveCompetitorAction.bind(null, c.id)}
            className="space-y-3"
          >
            <CompetitorFields c={c} certs={certs ?? []} held={held} />
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Veille sur ce concurrent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!watch?.length ? (
            <p className="text-sm text-slate-500">Aucune information notée.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {watch.map((i: any) => (
                <div key={i.id} className="px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{WATCH_KIND[i.kind]}</Badge>
                    <Badge tone={IMPACT_TONE[i.impact]}>
                      {IMPACT[i.impact]}
                    </Badge>
                    <span className="font-semibold">{i.title}</span>
                    <span className="ml-auto text-xs text-slate-500">
                      {formatDate(i.observed_on)}
                    </span>
                  </div>
                  {i.detail && (
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">
                      {i.detail}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    {i.action && (
                      <span className={i.done ? "text-emerald-700" : ""}>
                        {i.done ? "✓ Fait : " : "À faire : "}
                        {i.action}
                      </span>
                    )}
                    {i.action && (
                      <form
                        action={toggleWatchDoneAction.bind(null, i.id, back)}
                      >
                        <input
                          type="hidden"
                          name="value"
                          value={i.done ? "0" : "1"}
                        />
                        <button className="text-xs text-primary hover:underline">
                          {i.done ? "Rouvrir" : "Marquer fait"}
                        </button>
                      </form>
                    )}
                    {i.source_url && (
                      <a
                        className="inline-flex items-center gap-1 text-xs text-primary underline"
                        href={i.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <form
                      action={deleteWatchAction.bind(null, i.id, back)}
                      className="ml-auto"
                    >
                      <button className="text-xs text-red-700 hover:underline">
                        Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
          <details className="rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-primary">
              <Plus className="h-5 w-5" /> Ajouter une information
            </summary>
            <div className="border-t p-4">
              <form
                action={saveWatchAction.bind(null, c.id)}
                className="space-y-3"
              >
                <WatchFields />
                <Button type="submit">Enregistrer</Button>
              </form>
            </div>
          </details>
        </CardContent>
      </Card>
    </>
  );
}

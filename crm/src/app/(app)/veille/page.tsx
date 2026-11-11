import Link from "next/link";
import {
  ExternalLink,
  GraduationCap,
  Plus,
  Radar,
  Search,
  Telescope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchRivals } from "@/lib/veille-api";
import {
  CERT_KIND,
  CERT_STATUS,
  IMPACT,
  PRIORITY,
  WATCH_KIND,
  gapOrder,
} from "@/lib/veille";
import {
  deleteCertificationAction,
  deleteWatchAction,
  followCompetitorAction,
  saveCertificationAction,
  saveCompetitorAction,
  saveWatchAction,
  setCertificationStatusAction,
  toggleWatchDoneAction,
} from "@/app/actions/veille";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/crm/confirm-action";
import {
  CertFields,
  CompetitorFields,
  WatchFields,
} from "@/components/crm/veille-fields";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
const IMPACT_TONE: Record<string, "gray" | "orange" | "red"> = {
  faible: "gray",
  moyen: "orange",
  fort: "red",
};
const CERT_TONE: Record<string, "gray" | "blue" | "green" | "orange"> = {
  a_envisager: "gray",
  en_cours: "orange",
  obtenu: "green",
  ecarte: "gray",
};
const href = (tab: string, extra = "") => `/veille?tab=${tab}${extra}`;

export default async function VeillePage({
  searchParams,
}: {
  searchParams: {
    tab?: string;
    lieu?: string;
    q?: string;
    staff?: string;
    page?: string;
    tri?: string;
    voir?: string;
  };
}) {
  const tab = ["secteur", "concurrents", "veille", "formations", "decouvrir"].includes(
    searchParams.tab ?? "",
  )
    ? searchParams.tab!
    : "secteur";
  const sb = createClient();
  const [comp, certs, links, watch, settings, facts] = await Promise.all([
    sb.from("competitors").select("*").order("name"),
    sb.from("certifications").select("*").order("name"),
    sb
      .from("competitor_certifications")
      .select("competitor_id, certification_id"),
    sb
      .from("watch_items")
      .select("*")
      .order("observed_on", { ascending: false })
      .limit(200),
    sb.from("app_settings").select("company_siret").maybeSingle(),
    sb.from("sector_facts").select("*").order("sort"),
  ]);
  for (const r of [comp, certs, links, watch])
    if (r.error) throw new Error(r.error.message);
  const competitors = (comp.data ?? []) as any[];
  const certList = (certs.data ?? []) as any[];
  const items = (watch.data ?? []) as any[];
  const nameOf = new Map(competitors.map((c) => [c.id, c.name as string]));
  const certName = new Map(certList.map((k) => [k.id, k.name as string]));
  const heldBy = new Map<string, string[]>(); // concurrent → certifications
  const holders = new Map<string, string[]>(); // certification → concurrents
  for (const l of (links.data ?? []) as any[]) {
    heldBy.set(l.competitor_id, [
      ...(heldBy.get(l.competitor_id) ?? []),
      l.certification_id,
    ]);
    holders.set(l.certification_id, [
      ...(holders.get(l.certification_id) ?? []),
      l.competitor_id,
    ]);
  }
  const todo = items.filter((i) => i.action && !i.done);
  const gap = certList.filter(
    (k) =>
      (holders.get(k.id)?.length ?? 0) > 0 &&
      !["obtenu", "ecarte"].includes(k.status),
  );

  const factRows = (facts.error ? [] : (facts.data ?? [])) as any[];
  const tabs = [
    {
      href: href("secteur"),
      label: "Le secteur",
      count: null,
      active: tab === "secteur",
    },
    {
      href: href("concurrents"),
      label: "Concurrents",
      count: competitors.length,
      active: tab === "concurrents",
    },
    {
      href: href("veille"),
      label: "Veille",
      count: todo.length || items.length,
      active: tab === "veille",
    },
    {
      href: href("formations"),
      label: "Formations & certifications",
      count: certList.length,
      active: tab === "formations",
    },
    {
      href: href("decouvrir"),
      label: "Découvrir dans l'annuaire",
      count: null,
      active: tab === "decouvrir",
    },
  ];

  return (
    <>
      <PageHeader
        title="Veille concurrentielle"
        subtitle="Qui sont vos concurrents, ce qu'ils font, les certifications et formations à viser pour vous aligner."
      />
      <Tabs items={tabs} />

      {tab === "secteur" && (
        <>
          <p className="mb-4 max-w-3xl text-[14px] text-secondary-foreground">
            Le marché du nettoyage en chiffres, avec la source de chacun. Rien n&apos;est à remplir : ces chiffres sont recherchés et mis à jour à partir de publications publiques.
          </p>
          {!factRows.length ? (
            <Card><Empty>Chiffres du secteur en cours d&apos;installation : réessayez dans une minute.</Empty></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {([["france", "En France"], ["monde", "Dans le monde"], ["acteurs", "Les plus gros acteurs"]] as const).map(([scope, title]) => (
                <Card key={scope}>
                  <CardContent className="space-y-4 p-4">
                    <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
                    {factRows.filter((f) => f.scope === scope).map((f) => (
                      <div key={f.id} className="border-t border-border/60 pt-3 first:border-0 first:pt-0">
                        <div className="text-xs text-muted-foreground">{f.label}</div>
                        <div className="mt-0.5 text-[15px] font-semibold leading-snug text-foreground">{f.value}</div>
                        {f.note && <p className="mt-1 text-xs text-secondary-foreground">{f.note}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Source : {f.source_url ? <a href={f.source_url} target="_blank" rel="noopener noreferrer" className="underline">{f.source_name}</a> : f.source_name}{f.as_of ? ` · ${f.as_of}` : ""}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card className="mt-4">
            <CardContent className="p-4">
              <h2 className="mb-1 text-[15px] font-semibold text-foreground">Les concurrents qui se rapprochent le plus de vos services</h2>
              <p className="mb-3 text-xs text-muted-foreground">Ceux que vous suivez, les plus proches de Pontoise d&apos;abord. Ajoutez-en depuis « Découvrir dans l&apos;annuaire » ; leurs informations se remplissent toutes seules.</p>
              {!competitors.length ? <p className="text-sm text-muted-foreground">Aucun concurrent suivi pour l&apos;instant.</p> : (
                <ul className="divide-y text-sm">
                  {[...competitors].sort((a, b) => Number(String(b.postal_code ?? "").startsWith("95")) - Number(String(a.postal_code ?? "").startsWith("95")) || (b.revenue_eur ?? 0) - (a.revenue_eur ?? 0)).slice(0, 8).map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 py-2">
                      <Link href={`/veille/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                      <span className="text-muted-foreground">{[c.city, c.headcount, c.revenue_eur ? `CA ${formatEUR(c.revenue_eur)}${c.revenue_year ? ` (${c.revenue_year})` : ""}` : null].filter(Boolean).join(" · ") || "à enrichir"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "concurrents" && (
        <>
          <Card className="mb-4">
            {!competitors.length ? (
              <Empty
                icon={Radar}
                action={
                  <Link
                    href={href("decouvrir")}
                    className="font-semibold text-primary underline"
                  >
                    Découvrir les entreprises de nettoyage de votre zone
                  </Link>
                }
              >
                Aucun concurrent suivi pour l&apos;instant.
              </Empty>
            ) : (
              <div className="divide-y">
                {competitors.map((c) => {
                  const hc = (heldBy.get(c.id) ?? [])
                    .map((id) => certName.get(id))
                    .filter(Boolean) as string[];
                  const last = items.find(
                    (i) => i.competitor_id === c.id,
                  )?.observed_on;
                  return (
                    <Link
                      key={c.id}
                      href={`/veille/${c.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-secondary/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">
                          {c.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {[
                            c.city,
                            c.headcount,
                            c.revenue_eur
                              ? `CA ${formatEUR(c.revenue_eur)}${c.revenue_year ? ` (${c.revenue_year})` : ""}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Fiche à compléter"}
                        </div>
                        {hc.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {hc.map((n) => (
                              <Badge key={n} tone="blue">
                                {n}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        {last
                          ? `Dernière info : ${formatDate(last)}`
                          : "Aucune info de veille"}
                      </div>
                      {c.status === "archive" && <Badge>Archivé</Badge>}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
          <details className="rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-primary">
              <Plus className="h-5 w-5" /> Ajouter un concurrent
            </summary>
            <CardContent className="border-t pt-4">
              <form
                action={saveCompetitorAction.bind(null, null)}
                className="space-y-3"
              >
                <CompetitorFields />
                <Button type="submit">Enregistrer</Button>
              </form>
            </CardContent>
          </details>
        </>
      )}

      {tab === "veille" && (
        <>
          {todo.length > 0 && (
            <Card className="mb-4 border-amber-200">
              <div className="border-b bg-amber-50/60 px-4 py-2.5 text-sm font-semibold text-amber-900">
                À traiter ({todo.length})
              </div>
              <div className="divide-y">
                {todo.map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{i.title}</span>
                      <span className="block text-slate-600">
                        À faire : {i.action}
                      </span>
                    </div>
                    <form
                      action={toggleWatchDoneAction.bind(
                        null,
                        i.id,
                        href("veille"),
                      )}
                    >
                      <input type="hidden" name="value" value="1" />
                      <Button size="sm" variant="outline">
                        Fait
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card className="mb-4">
            {!items.length ? (
              <Empty icon={Telescope}>
                Aucune information de veille. Notez ici un nouveau tarif, une
                offre, un recrutement, un avis…
              </Empty>
            ) : (
              <div className="divide-y">
                {items.map((i) => (
                  <div key={i.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="blue">{WATCH_KIND[i.kind]}</Badge>
                      <Badge tone={IMPACT_TONE[i.impact]}>
                        {IMPACT[i.impact]}
                      </Badge>
                      <span className="font-semibold text-slate-900">
                        {i.title}
                      </span>
                      <span className="ml-auto text-xs text-slate-500">
                        {formatDate(i.observed_on)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {i.competitor_id ? (
                        <Link
                          className="text-primary underline"
                          href={`/veille/${i.competitor_id}`}
                        >
                          {nameOf.get(i.competitor_id)}
                        </Link>
                      ) : (
                        "Marché en général"
                      )}
                      {i.source_url && (
                        <a
                          className="ml-3 inline-flex items-center gap-1 text-primary underline"
                          href={i.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {i.detail && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {i.detail}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      {i.action && (
                        <span
                          className={
                            i.done ? "text-emerald-700" : "text-slate-800"
                          }
                        >
                          {i.done ? "✓ Fait : " : "À faire : "}
                          {i.action}
                        </span>
                      )}
                      {i.action && i.done && (
                        <form
                          action={toggleWatchDoneAction.bind(
                            null,
                            i.id,
                            href("veille"),
                          )}
                        >
                          <input type="hidden" name="value" value="0" />
                          <button className="text-xs text-slate-500 hover:underline">
                            Rouvrir
                          </button>
                        </form>
                      )}
                      <form
                        action={deleteWatchAction.bind(
                          null,
                          i.id,
                          href("veille"),
                        )}
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
          </Card>
          <details className="rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-primary">
              <Plus className="h-5 w-5" /> Ajouter une information de veille
            </summary>
            <CardContent className="border-t pt-4">
              <form
                action={saveWatchAction.bind(null, null)}
                className="space-y-3"
              >
                <WatchFields
                  competitors={competitors.filter(
                    (c) => c.status !== "archive",
                  )}
                />
                <Button type="submit">Enregistrer</Button>
              </form>
            </CardContent>
          </details>
        </>
      )}

      {tab === "formations" && (
        <>
          {gap.length > 0 && (
            <Card className="mb-4 border-amber-200">
              <div className="border-b bg-amber-50/60 px-4 py-2.5 text-sm font-semibold text-amber-900">
                Écart avec la concurrence : ce que des concurrents affichent et
                que vous n&apos;avez pas encore
              </div>
              <div className="divide-y">
                {gapOrder(
                  gap,
                  new Map(
                    gap.map((k) => [k.id, holders.get(k.id)?.length ?? 0]),
                  ),
                ).map((k) => (
                  <div key={k.id} className="px-4 py-2.5 text-sm">
                    <b>{k.name}</b> :{" "}
                    {(holders.get(k.id) ?? [])
                      .map((id) => nameOf.get(id))
                      .join(", ")}
                  </div>
                ))}
              </div>
            </Card>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm" aria-label="Filtrer les certifications">
            {([["", "Priorité (écart avec la concurrence)"], ["prix", "Les moins chères d'abord"]] as const).map(([v, l]) => (
              <Link key={v || "ecart"} href={href("formations", v ? `&tri=${v}` : "") + (searchParams.voir ? `&voir=${searchParams.voir}` : "")} className={`rounded-full border px-3 py-1 ${(searchParams.tri ?? "") === v ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{l}</Link>
            ))}
            <Link href={href("formations", searchParams.tri ? `&tri=${searchParams.tri}` : "") + (searchParams.voir === "a_obtenir" ? "" : "&voir=a_obtenir")} className={`ml-auto rounded-full border px-3 py-1 ${searchParams.voir === "a_obtenir" ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>Seulement celles que je n&apos;ai pas</Link>
          </div>
          <div className="mb-4 space-y-3">
            {(() => {
              const base = searchParams.voir === "a_obtenir" ? certList.filter((k) => !["obtenu", "ecarte"].includes(k.status)) : certList;
              return searchParams.tri === "prix"
                ? [...base].sort((a, b) => (a.cost_eur ?? Infinity) - (b.cost_eur ?? Infinity) || a.name.localeCompare(b.name))
                : gapOrder(base, new Map(base.map((k) => [k.id, holders.get(k.id)?.length ?? 0])));
            })().map((k) => (
              <Card key={k.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span className="text-[16px] font-semibold text-slate-900">
                      {k.name}
                    </span>
                    <Badge tone="blue">{CERT_KIND[k.kind]}</Badge>
                    <Badge tone={CERT_TONE[k.status]}>
                      {CERT_STATUS[k.status]}
                    </Badge>
                    {k.status !== "obtenu" && k.status !== "ecarte" && (
                      <Badge tone={k.priority === "haute" ? "orange" : "gray"}>
                        {PRIORITY[k.priority]}
                      </Badge>
                    )}
                    <form
                      action={setCertificationStatusAction.bind(null, k.id)}
                      className="ml-auto flex items-center gap-2"
                    >
                      <Select
                        name="status"
                        defaultValue={k.status}
                        className="h-9 w-40 py-1 text-sm"
                        aria-label="Statut"
                      >
                        {Object.entries(CERT_STATUS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </Select>
                      <Button size="sm" variant="outline">
                        OK
                      </Button>
                    </form>
                  </div>
                  {k.description && (
                    <p className="text-sm text-slate-700">{k.description}</p>
                  )}
                  {k.benefit && (
                    <p className="text-sm text-slate-700">
                      <b>Pour nous :</b> {k.benefit}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                    {k.provider && <span>Organisme : {k.provider}</span>}
                    {(k.cost_eur != null || k.cost_note) && <span>Coût : {k.cost_eur != null ? `${formatEUR(k.cost_eur)}${k.cost_note ? ` (${k.cost_note})` : ""}` : k.cost_note}</span>}
                    {k.cost_eur == null && !k.cost_note && <span>Coût : à demander à l&apos;organisme</span>}
                    {(k.enroll_url || k.source_url) && k.status !== "obtenu" && <a href={k.enroll_url ?? k.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">S&apos;inscrire / demander un devis →</a>}
                    {k.duration_note && <span>Durée : {k.duration_note}</span>}
                    {k.target_date && (
                      <span>Objectif : {formatDate(k.target_date)}</span>
                    )}
                    {k.obtained_on && (
                      <span>Obtenu le {formatDate(k.obtained_on)}</span>
                    )}
                    {k.source_url && (
                      <a
                        className="inline-flex items-center gap-1 text-primary underline"
                        href={k.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-sm">
                    {(holders.get(k.id)?.length ?? 0) > 0 ? (
                      <>
                        Affichée par :{" "}
                        {(holders.get(k.id) ?? [])
                          .map((id) => nameOf.get(id))
                          .join(", ")}
                      </>
                    ) : (
                      <span className="text-slate-500">
                        Aucun concurrent suivi ne l&apos;affiche (à vérifier sur
                        leurs sites).
                      </span>
                    )}
                  </div>
                  <details className="pt-1">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                      Modifier
                    </summary>
                    <form
                      action={saveCertificationAction.bind(null, k.id)}
                      className="mt-3 space-y-3"
                    >
                      <CertFields k={k} />
                      <div className="flex gap-2">
                        <Button type="submit">Enregistrer</Button>
                      </div>
                    </form>
                    <div className="mt-2">
                      <ConfirmAction
                        action={deleteCertificationAction.bind(null, k.id)}
                        label="Supprimer"
                        variant="outline"
                        size="sm"
                        title={`Supprimer « ${k.name} » ?`}
                        description="Retiré du référentiel, ainsi que le lien avec les concurrents."
                        confirmLabel="Oui, supprimer"
                      />
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Coûts et durées à chiffrer sur devis des organismes : aucun montant
            n&apos;est inventé ici.
          </p>
          <details className="rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-primary">
              <Plus className="h-5 w-5" /> Ajouter une certification ou une
              formation
            </summary>
            <CardContent className="border-t pt-4">
              <form
                action={saveCertificationAction.bind(null, null)}
                className="space-y-3"
              >
                <CertFields />
                <Button type="submit">Ajouter</Button>
              </form>
            </CardContent>
          </details>
        </>
      )}

      {tab === "decouvrir" && (
        <Discover
          sp={searchParams}
          followed={new Set(competitors.map((c) => c.siren).filter(Boolean))}
          ownSiren={String(settings.data?.company_siret ?? "")
            .replace(/\s/g, "")
            .slice(0, 9)}
        />
      )}
    </>
  );
}

async function Discover({
  sp,
  followed,
  ownSiren,
}: {
  sp: { lieu?: string; q?: string; staff?: string; page?: string };
  followed: Set<string>;
  ownSiren: string;
}) {
  const lieu = (sp.lieu ?? "95").trim() || "95";
  const staff = sp.staff === "1";
  const page = Math.max(Number(sp.page) || 1, 1);
  const r = await searchRivals({ lieu, q: sp.q, staff, page });
  const rivals = r.rivals.filter((x) => x.siren !== ownSiren);
  const qs = (p: number) =>
    `&lieu=${encodeURIComponent(lieu)}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${staff ? "&staff=1" : ""}&page=${p}`;
  return (
    <>
      <form
        action="/veille"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <input type="hidden" name="tab" value="decouvrir" />
        <label className="text-sm font-semibold text-slate-700">
          Département ou code postal
          <input
            name="lieu"
            defaultValue={lieu}
            className="mt-1.5 block h-11 w-44 rounded-lg border border-slate-300 bg-card px-3.5 text-[15px] font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Nom (facultatif)
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            className="mt-1.5 block h-11 w-56 rounded-lg border border-slate-300 bg-card px-3.5 text-[15px] font-normal"
          />
        </label>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="staff"
            value="1"
            defaultChecked={staff}
          />{" "}
          Avec salariés seulement (3 et plus)
        </label>
        <Button type="submit">
          <Search className="mr-2 h-4 w-4" /> Chercher
        </Button>
      </form>
      <p className="mb-3 text-sm text-slate-600">
        Entreprises de nettoyage actives (NAF 81.21Z, 81.22Z, 81.29A, 81.29B)
        d&apos;après l&apos;annuaire officiel. Le lieu comprend les entreprises
        ayant un établissement dans la zone, même si leur siège est ailleurs.
        {r.total ? ` ${r.total.toLocaleString("fr-FR")} résultat(s).` : ""}
      </p>
      {r.error && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {r.error}
        </p>
      )}
      <Card className="mb-4">
        {!rivals.length && !r.error ? (
          <Empty icon={Search}>
            Aucune entreprise trouvée pour cette recherche.
          </Empty>
        ) : (
          <div className="divide-y">
            {rivals.map((x) => (
              <div
                key={x.siren}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{x.name}</div>
                  <div className="text-sm text-slate-500">
                    {[
                      `SIREN ${x.siren}`,
                      x.naf_code,
                      x.legal_form,
                      x.headcount,
                      x.revenue_eur
                        ? `CA ${formatEUR(x.revenue_eur)} (${x.revenue_year})`
                        : null,
                      x.creation_date
                        ? `créée en ${x.creation_date.slice(0, 4)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="text-xs text-slate-500">
                    Siège :{" "}
                    {[x.postal_code, x.city].filter(Boolean).join(" ") || "—"}
                    {x.local_place ? ` · présent à ${x.local_place}` : ""}
                  </div>
                </div>
                {followed.has(x.siren) ? (
                  <Badge tone="green">Déjà suivi</Badge>
                ) : (
                  <form action={followCompetitorAction}>
                    {(
                      [
                        ["name", x.name],
                        ["siren", x.siren],
                        ["city", x.city],
                        ["postal_code", x.postal_code],
                        ["naf_code", x.naf_code],
                        ["headcount", x.headcount],
                        ["revenue_eur", x.revenue_eur],
                        ["revenue_year", x.revenue_year],
                        ["creation_date", x.creation_date],
                      ] as const
                    ).map(([n, v]) => (
                      <input key={n} type="hidden" name={n} value={v ?? ""} />
                    ))}
                    <Button size="sm" variant="outline">
                      <Plus className="mr-1 h-4 w-4" /> Suivre
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      {r.pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link
              className="text-primary underline"
              href={`/veille?tab=decouvrir${qs(page - 1)}`}
            >
              ← Précédent
            </Link>
          )}
          <span className="text-slate-500">
            Page {page} sur {r.pages}
          </span>
          {page < r.pages && (
            <Link
              className="text-primary underline"
              href={`/veille?tab=decouvrir${qs(page + 1)}`}
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </>
  );
}

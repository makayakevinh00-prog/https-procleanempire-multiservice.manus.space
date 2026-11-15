import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { TerritoryMapLazy } from "@/components/crm/territory-map-lazy";
import { addZoneAction, excludeTargetAction, loadTerritoryAction, saveZoneAction, setZoneStatusAction, targetToProspectAction } from "@/app/actions/veille";
import { HEADCOUNT, SECTORS, SECTOR_KEYS, SIZES, byCity, coverage, headcountLabel, isSector, pointOf, type Point, type State } from "@/lib/territoire";
import { formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Territoire commercial" };

const STATE: Record<State, { label: string; tone: "gray" | "orange" | "green" }> = { cible: { label: "À prospecter", tone: "gray" }, en_cours: { label: "En cours", tone: "orange" }, client: { label: "Client", tone: "green" } };
const pct = (n: number) => `${String(n).replace(".", ",")} %`;

/** Territoire commercial : la carte des entreprises à prospecter zone par zone, ce qui est déjà signé, et quand passer à la zone suivante. */
export default async function TerritoryPage({ searchParams }: { searchParams: { zone?: string; etat?: string; secteur?: string; ville?: string; fiche?: string; ok?: string; error?: string } }) {
  const sb = createClient();
  const { data: zs, error: zErr } = await sb.from("territory_zones").select("*").order("rank");
  if (zErr) return (<><PageHeader title="Territoire commercial" subtitle="Les entreprises à prospecter, zone par zone." /><div role="alert" className="mb-4 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">La carte est prête, mais la liste des entreprises ne peut pas encore se charger : il manque une autorisation sur la base de données. Demandez à l&apos;assistant de relancer l&apos;installation du territoire, puis cliquez sur « Autoriser ».</div><Card className="p-3"><TerritoryMapLazy points={[]} cities={[]} zone="95" /></Card></>);
  const zones = (zs ?? []) as any[];
  const zone = zones.find((z) => z.code === searchParams.zone) ?? zones.find((z) => z.status === "active") ?? zones[0];
  if (!zone) return (<><PageHeader title="Territoire commercial" /><Card><Empty>Aucune zone. Ajoutez un département ci-dessous.</Empty></Card></>);
  const [{ data: raw, error }, loads] = await Promise.all([sb.rpc("territory_data", { p_dept: zone.code }), sb.from("territory_loads").select("sector, next_page, total_pages").eq("dept", zone.code)]);
  if (error) throw new Error(error.message);
  const d = raw as { total: number; clients: number; en_cours: number; excluded: number; zone_clients: number; mrr: number; loyal: number; targets: any[][] };
  const all: Point[] = d.targets.map(pointOf);
  const etat = (["cible", "en_cours", "client"] as const).find((s) => s === searchParams.etat) ?? null, secteur = isSector(searchParams.secteur) ? searchParams.secteur : null, ville = searchParams.ville ?? null;
  const shown = all.filter((p) => (!etat || p.state === etat) && (!secteur || p.sector === secteur) && (!ville || p.city === ville));
  const cities = byCity(all), cov = coverage(d.clients, d.total);
  const located = shown.filter((p) => p.lat != null && p.lng != null);
  const mapPoints = located.slice(0, 6000).map((p) => ({ id: p.siret, lat: p.lat!, lng: p.lng!, name: p.name, sub: `${p.city ?? ""} · ${headcountLabel(p.headcount)} · ${STATE[p.state].label}`, state: p.state }));
  const mapCities = (ville ? cities.filter((c) => c.city === ville) : cities).filter((c) => c.lat != null).slice(0, 200).map((c) => ({ city: c.city, lat: c.lat!, lng: c.lng!, total: c.total, clients: c.clients, pct: c.pct }));
  const size = (p: Point) => Object.keys(HEADCOUNT).indexOf(p.headcount ?? "");
  const toProspect = shown.filter((p) => p.state === "cible").sort((a, b) => size(b) - size(a)).slice(0, 40);
  const fiche = searchParams.fiche ? all.find((p) => p.siret === searchParams.fiche) ?? null : null;
  const q = (o: Record<string, string | null>) => { const u = new URLSearchParams({ zone: zone.code, ...(etat ? { etat } : {}), ...(secteur ? { secteur } : {}), ...(ville ? { ville } : {}) }); for (const [k, v] of Object.entries(o)) { if (v == null) u.delete(k); else u.set(k, v); } return `/veille/territoire?${u}`; };
  const crit = [
    { label: "Part des établissements ciblés devenus clients", value: cov, goal: Number(zone.target_pct), fmt: pct },
    { label: "Chiffre mensuel récurrent dans la zone (contrats actifs)", value: Number(d.mrr), goal: Number(zone.min_mrr), fmt: (n: number) => `${formatEUR(n)} HT` },
    { label: "Clients fidèles (contrat actif depuis 6 mois ou plus)", value: Number(d.loyal), goal: Number(zone.min_loyal), fmt: (n: number) => String(n) }
  ];
  const ready = crit.every((c) => c.value >= c.goal) && d.total > 0;
  const next = zones.find((z) => z.rank > zone.rank && z.status === "verrouillee");
  const loaded = new Set(((loads.data ?? []) as any[]).filter((l) => l.total_pages != null && l.next_page > l.total_pages).map((l) => String(l.sector).split(":")[0]));
  return (
    <>
      <PageHeader title="Territoire commercial" subtitle="Les entreprises à prospecter, zone par zone. Une zone se remplit en vert à mesure que vous signez ; quand elle est assez couverte et que ses clients sont fidèles, vous ouvrez la suivante." />
      {searchParams.error && <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{searchParams.ok}</div>}

      <div className="mb-4 flex flex-wrap gap-2">
        {zones.map((z) => (
          <Link key={z.code} href={`/veille/territoire?zone=${z.code}`} className={`rounded-full border px-4 py-2 text-sm font-medium ${z.code === zone.code ? "border-foreground bg-foreground text-background" : "bg-white hover:bg-secondary"}`}>
            {z.rank}. {z.label} ({z.code}) {z.status === "verrouillee" ? "🔒" : z.status === "terminee" ? "✔" : ""}
          </Link>
        ))}
      </div>

      {zone.status === "verrouillee" && (
        <Card className="mb-4 border-amber-300"><CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="flex-1">Cette zone n&apos;est pas encore ouverte : concentrez-vous sur les zones actives. Vous pouvez déjà regarder son potentiel.</span>
          <ConfirmAction action={setZoneStatusAction.bind(null, zone.code, "active")} label="Ouvrir cette zone" size="sm" variant="outline" title={`Ouvrir ${zone.label} ?`} description="La zone devient active. Mieux vaut d'abord atteindre les objectifs de la zone précédente : fidéliser avant de s'étendre." confirmLabel="Ouvrir" />
        </CardContent></Card>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {([["Établissements ciblés", String(d.total), d.excluded ? `${d.excluded} écarté(s)` : "dans la zone", q({ etat: null })], ["Clients", String(d.clients), "en vert sur la carte", q({ etat: "client" })], ["En cours", String(d.en_cours), "prospects, devis", q({ etat: "en_cours" })], ["Couverture", pct(cov), `objectif ${pct(Number(zone.target_pct))}`, q({ etat: null })]] as [string, string, string, string][]).map(([l, v, sub, href]) => (
          <Link key={l} href={href} className="rounded-xl border bg-white p-4 hover:bg-secondary"><div className="text-xs font-medium text-muted-foreground">{l}</div><div className="mt-1 text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{sub}</div></Link>
        ))}
      </div>
      <div className="mb-4 h-3 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={cov} aria-valuemin={0} aria-valuemax={100} aria-label="Couverture de la zone">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Number(zone.target_pct) > 0 ? (cov / Number(zone.target_pct)) * 100 : 0)}%` }} />
      </div>

      <Card className="mb-4 p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2 px-1 text-sm">
          <span className="font-medium">Afficher :</span>
          {([[null, "Tout"], ["cible", "À prospecter"], ["en_cours", "En cours"], ["client", "Clients"]] as [string | null, string][]).map(([k, l]) => <Link key={l} href={q({ etat: k, fiche: null })} className={`rounded-full border px-3 py-1 ${etat === k ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}>{l}</Link>)}
          <span className="ml-2 font-medium">Secteur :</span>
          <Link href={q({ secteur: null, fiche: null })} className={`rounded-full border px-3 py-1 ${!secteur ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}>Tous</Link>
          {SECTOR_KEYS.filter((k) => all.some((p) => p.sector === k)).map((k) => <Link key={k} href={q({ secteur: k, fiche: null })} className={`rounded-full border px-3 py-1 ${secteur === k ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}>{SECTORS[k].label}</Link>)}
          {ville && <Link href={q({ ville: null })} className="rounded-full border border-foreground bg-foreground px-3 py-1 text-background">{ville} ✕</Link>}
        </div>
        {!all.length && <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">La carte est vide : aucune entreprise n&apos;est encore chargée pour {zone.label}. Descendez jusqu&apos;à « Charger les entreprises », choisissez un secteur et cliquez sur « Charger ».</div>}
        <TerritoryMapLazy points={mapPoints} cities={mapCities} zone={zone.code} />
        <p className="mt-2 px-1 text-xs text-muted-foreground">Gris : à prospecter · orange : prospect ou devis en cours · vert : client. Les cercles montrent les communes, d&apos;autant plus verts qu&apos;elles sont couvertes. {shown.length} établissement(s) affiché(s){shown.length - located.length > 0 ? `, dont ${shown.length - located.length} sans position connue (absents de la carte)` : ""}{located.length > 6000 ? " ; la carte en montre 6 000" : ""}. Source : annuaire officiel des entreprises.</p>
      </Card>

      {fiche && (
        <Card id="fiche" className="mb-4 border-foreground">
          <CardHeader><CardTitle>{fiche.name}</CardTitle><Badge tone={STATE[fiche.state].tone}>{STATE[fiche.state].label}</Badge></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{fiche.address ?? [fiche.postal, fiche.city].filter(Boolean).join(" ")} · {headcountLabel(fiche.headcount)} · {SECTORS[fiche.sector].label}{fiche.naf ? ` · code d'activité ${fiche.naf}` : ""} · SIRET {fiche.siret}</p>
            <div className="flex flex-wrap gap-2">
              {fiche.clientId ? <Link href={`/clients/${fiche.clientId}`} className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-secondary">Ouvrir la fiche client</Link>
                : <form action={targetToProspectAction.bind(null, zone.code, fiche.siret)}><Button size="sm">Ajouter à mes prospects</Button></form>}
              <a href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${fiche.siret}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-secondary">Voir dans l&apos;annuaire officiel</a>
              {!fiche.clientId && <ConfirmAction action={excludeTargetAction.bind(null, zone.code, fiche.siret, true)} label="Écarter" size="sm" variant="ghost" title="Écarter cet établissement ?" description="Il sort de la carte et ne compte plus dans le pourcentage de la zone." confirmLabel="Écarter" />}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>À prospecter en priorité</CardTitle></CardHeader>
          {!toProspect.length ? <Empty>{all.length ? "Plus rien à prospecter avec ces filtres." : "Chargez d'abord les entreprises de la zone."}</Empty> : (
            <ul className="divide-y text-sm">{toProspect.map((p) => (
              <li key={p.siret} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1"><Link href={q({ fiche: p.siret }) + "#fiche"} className="font-medium hover:underline">{p.name}</Link><span className="block text-xs text-muted-foreground">{p.city} · {headcountLabel(p.headcount)} · {SECTORS[p.sector].label}</span></span>
                <form action={targetToProspectAction.bind(null, zone.code, p.siret)}><Button size="sm" variant="outline">Ajouter en prospect</Button></form>
              </li>
            ))}</ul>
          )}
          <p className="px-5 pb-4 pt-2 text-xs text-muted-foreground">Les plus grandes entreprises d&apos;abord. « Ajouter en prospect » crée sa fiche dans Clients, à l&apos;étape « à contacter ».</p>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avancement par commune</CardTitle></CardHeader>
          {!cities.length ? <Empty>Aucune commune pour l&apos;instant.</Empty> : (
            <ul className="divide-y text-sm">{cities.slice(0, 25).map((c) => (
              <li key={c.city} className="px-5 py-2.5">
                <div className="flex items-center justify-between gap-3"><Link href={q({ ville: c.city, fiche: null })} className="font-medium hover:underline">{c.city}</Link><span className="text-xs text-muted-foreground">{c.clients} client(s){c.enCours ? ` · ${c.enCours} en cours` : ""} sur {c.total} · {pct(c.pct)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, c.pct)}%` }} /></div>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Avant d&apos;ouvrir la zone suivante</CardTitle><Badge tone={ready ? "green" : "gray"}>{ready ? "Objectifs atteints" : "Pas encore"}</Badge></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {crit.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between gap-3"><span>{c.label}</span><b className={c.value >= c.goal ? "text-emerald-700" : ""}>{c.fmt(c.value)} / {c.fmt(c.goal)}</b></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full ${c.value >= c.goal ? "bg-emerald-600" : "bg-amber-500"}`} style={{ width: `${c.goal > 0 ? Math.min(100, (c.value / c.goal) * 100) : 100}%` }} /></div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Le but n&apos;est pas seulement de signer : c&apos;est de garder ses clients et d&apos;atteindre un chiffre avec eux avant de s&apos;étendre. {d.zone_clients} client(s) actif(s) ont une adresse dans la zone.</p>
            <form action={saveZoneAction.bind(null, zone.code)} className="grid gap-3 border-t pt-3 sm:grid-cols-3">
              <Field label="Part à signer (%)"><Input name="target_pct" type="number" min={1} max={100} step="0.5" defaultValue={Number(zone.target_pct)} /></Field>
              <Field label="Chiffre mensuel (€ HT)"><Input name="min_mrr" type="number" min={0} step="100" defaultValue={Number(zone.min_mrr)} /></Field>
              <Field label="Clients fidèles"><Input name="min_loyal" type="number" min={0} defaultValue={Number(zone.min_loyal)} /></Field>
              <div className="sm:col-span-3"><Button size="sm" variant="outline">Enregistrer les objectifs</Button></div>
            </form>
            {next && zone.status === "active" && (
              <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                <span className="flex-1">{ready ? `Vous pouvez ouvrir ${next.label} (${next.code}).` : `Zone suivante : ${next.label} (${next.code}). Elle s'ouvre quand les trois objectifs sont atteints.`}</span>
                <ConfirmAction action={setZoneStatusAction.bind(null, next.code, "active")} label={ready ? `Ouvrir ${next.label}` : "Ouvrir quand même"} size="sm" variant={ready ? "default" : "ghost"} title={`Ouvrir ${next.label} ?`} description={ready ? "Les objectifs de la zone actuelle sont atteints." : "Les objectifs de la zone actuelle ne sont pas atteints. S'étendre trop tôt disperse l'effort commercial."} confirmLabel="Ouvrir" />
              </div>
            )}
            <p className="text-xs"><Link href="/croissance" className="text-primary hover:underline">Voir aussi Croissance : quand recruter, ouvrir une agence ou racheter une entreprise →</Link></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Charger les entreprises de {zone.label}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Les établissements viennent de l&apos;annuaire officiel des entreprises (gratuit). Choisissez un secteur et une taille : chaque clic en charge jusqu&apos;à 750, puis vous relancez pour la suite.</p>
            <form action={loadTerritoryAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="zone" value={zone.code} />
              <Field label="Secteur"><Select name="sector" defaultValue="bureaux">{SECTOR_KEYS.map((k) => <option key={k} value={k}>{SECTORS[k].label}{loaded.has(k) ? " ✔" : ""}</option>)}</Select></Field>
              <Field label="Taille de l'entreprise"><Select name="size" defaultValue="10">{Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
              <div className="sm:col-span-2"><Button>Charger</Button></div>
            </form>
            <ul className="space-y-1 text-xs text-muted-foreground">{SECTOR_KEYS.map((k) => <li key={k}><b className="text-foreground">{SECTORS[k].label}</b> : {SECTORS[k].hint} · {all.filter((p) => p.sector === k).length} chargé(s)</li>)}</ul>
            <form action={addZoneAction} className="grid gap-3 border-t pt-3 sm:grid-cols-3">
              <Field label="Ajouter un département"><Input name="code" placeholder="78" maxLength={3} /></Field>
              <Field label="Nom"><Input name="label" placeholder="Yvelines" /></Field>
              <div className="flex items-end"><Button size="sm" variant="outline">Ajouter la zone</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

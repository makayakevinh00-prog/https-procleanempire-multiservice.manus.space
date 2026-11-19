"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { saveTargetsAction, targetToProspectAction } from "@/app/actions/veille";
import { HEADCOUNT, IDF, SECTORS, SECTOR_KEYS, SIZES, headcountLabel, targetsOf, type SectorKey, type TargetRow } from "@/lib/territoire";

export type XPoint = { siret: string; name: string; city: string | null; lat: number | null; lng: number | null; headcount: string | null; sector: SectorKey; state: "cible" | "en_cours" | "client"; clientId: string | null; address: string | null; postal: string | null };
const COLOR = { cible: "#64748b", en_cours: "#f59e0b", client: "#16a34a" } as const;
const LABEL = { cible: "À prospecter", en_cours: "En cours", client: "Client" } as const;
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Carte simple du territoire : les départements d'Île-de-France se cliquent ; une fois un département choisi, ses entreprises apparaissent
 * (gris = à prospecter, orange = en cours, vert = client) et la liste par commune dit où passer. Les entreprises se chargent depuis l'annuaire officiel, par le navigateur.
 */
export type XClient = { id: string; name: string; address: string | null; postal: string | null; city: string | null; lat: number | null; lng: number | null };
const RADII = [1, 2, 3, 5];
const km = (a: [number, number], b: [number, number]) => { const r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r, h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

export function TerritoryExplorer({ zone, points, clients }: { zone: string; points: XPoint[]; clients: XClient[] }) {
  const router = useRouter();
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layer = useRef<any>(null);
  const [city, setCity] = useState<string | null>(null);
  const [sector, setSector] = useState<SectorKey | "tous">("tous");
  const [extra, setExtra] = useState<XPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loadSector, setLoadSector] = useState<SectorKey>("sante");
  const [size, setSize] = useState("3");
  const [radius, setRadius] = useState(3);
  const [showClients, setShowClients] = useState(true);
  const [around, setAround] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, [number, number]>>({});
  const clayer = useRef<any>(null);

  // Clients sans position enregistrée : on la cherche dans l'adresse officielle (navigateur), à défaut au centre de leur commune.
  useEffect(() => {
    let dead = false;
    (async () => {
      for (const c of clients) {
        if (dead || c.lat != null || placed[c.id] || (!c.city && !c.postal && !c.address)) continue;
        try {
          const q = [c.address, c.postal, c.city].filter(Boolean).join(" ");
          const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`);
          const f = (await r.json())?.features?.[0]?.geometry?.coordinates;
          if (Array.isArray(f) && !dead) setPlaced((p) => ({ ...p, [c.id]: [f[1], f[0]] }));
        } catch { /* ce client reste hors carte */ }
        await sleep(150);
      }
    })();
    return () => { dead = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);
  const located = useMemo(() => clients.flatMap((c) => { const p: [number, number] | null = c.lat != null && c.lng != null ? [c.lat, c.lng] : placed[c.id] ?? null; return p ? [{ ...c, pos: p }] : []; }), [clients, placed]);
  const aroundClient = located.find((c) => c.id === around) ?? null;

  const all = useMemo(() => { const m = new Map<string, XPoint>(); for (const p of [...extra, ...points]) m.set(p.siret, p); return [...m.values()]; }, [points, extra]);
  const inSector = useMemo(() => all.filter((p) => sector === "tous" || p.sector === sector), [all, sector]);
  const cities = useMemo(() => {
    const m = new Map<string, { city: string; todo: number; total: number; lat: number; lng: number; n: number }>();
    for (const p of inSector) {
      const k = p.city ?? "Commune inconnue", c = m.get(k) ?? { city: k, todo: 0, total: 0, lat: 0, lng: 0, n: 0 };
      c.total++; if (p.state === "cible") c.todo++;
      if (p.lat != null && p.lng != null) { c.lat += p.lat; c.lng += p.lng; c.n++; }
      m.set(k, c);
    }
    return [...m.values()].sort((a, b) => b.todo - a.todo || b.total - a.total);
  }, [inSector]);
  const shown = useMemo(() => inSector.filter((p) => (!city || p.city === city) && (!aroundClient || (p.lat != null && p.lng != null && km(aroundClient.pos, [p.lat, p.lng]) <= radius))), [inSector, city, aroundClient, radius]);
  const perClient = useMemo(() => located.map((c) => ({ c, n: all.filter((p) => p.state === "cible" && p.lat != null && p.lng != null && km(c.pos, [p.lat, p.lng]) <= radius).length })).sort((a, b) => b.n - a.n), [located, all, radius]);
  const list = useMemo(() => shown.filter((p) => p.state !== "client").sort((a, b) => Object.keys(HEADCOUNT).indexOf(b.headcount ?? "") - Object.keys(HEADCOUNT).indexOf(a.headcount ?? "")).slice(0, 60), [shown]);

  // Carte et contours des départements (une seule fois).
  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current || mapRef.current) return;
      const map = L.map(el.current, { preferCanvas: true });
      mapRef.current = map; layer.current = L.layerGroup().addTo(map); clayer.current = L.layerGroup().addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      map.setView([48.75, 2.4], 8);
      const bounds: any[] = [];
      await Promise.all(Object.entries(IDF).map(async ([code, nom]) => {
        try {
          const r = await fetch(`https://geo.api.gouv.fr/departements/${code}?fields=nom,code,contour&format=geojson&geometry=contour`);
          if (!r.ok) return;
          const g = L.geoJSON(await r.json(), {
            style: { color: code === zone ? "#0f172a" : "#64748b", weight: code === zone ? 3 : 1.2, fillColor: code === zone ? "#38bdf8" : "#94a3b8", fillOpacity: code === zone ? 0.12 : 0.18 }
          }).bindTooltip(`${nom} (${code})`, { sticky: true }).on("click", () => router.push(`/veille/territoire?zone=${code}`)).addTo(map);
          g.bringToBack();
          if (code === zone) bounds.push(g.getBounds());
        } catch { /* le fond de carte reste utilisable sans les contours */ }
      }));
      if (!dead && bounds[0]) map.fitBounds(bounds[0], { padding: [20, 20] });
    })();
    return () => { dead = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [zone, router]);

  // Entreprises du département.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (!map || !layer.current) { await sleep(400); }
      if (!mapRef.current || !layer.current) return;
      layer.current.clearLayers();
      const order = { cible: 0, en_cours: 1, client: 2 } as const;
      const canvas = L.canvas({ padding: 0.4 });
      for (const p of [...shown].filter((x) => x.lat != null && x.lng != null).sort((a, b) => order[a.state] - order[b.state])) {
        L.circleMarker([p.lat!, p.lng!], { renderer: canvas, radius: p.state === "cible" ? 5 : 8, color: "#fff", weight: 1.5, fillColor: COLOR[p.state], fillOpacity: 0.95 })
          .bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.address ?? p.city ?? "")}<br>${esc(headcountLabel(p.headcount))} · ${LABEL[p.state]}<br><a target="_blank" rel="noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${p.name} ${p.address ?? ""}`)}">Itinéraire</a>`).addTo(layer.current);
      }
      if (city) { const c = cities.find((x) => x.city === city); if (c && c.n) mapRef.current.setView([c.lat / c.n, c.lng / c.n], 14); }
    })();
  }, [shown, city, cities]);

  // Mes clients : repère bleu, avec le cadre de leur secteur (cercle) pour chercher des clients autour.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current || !clayer.current) { await sleep(600); }
      if (!mapRef.current || !clayer.current) return;
      clayer.current.clearLayers();
      if (!showClients) return;
      for (const c of located) {
        L.circle(c.pos, { radius: radius * 1000, color: "#2563eb", weight: c.id === around ? 3 : 1.5, dashArray: "6 5", fillColor: "#3b82f6", fillOpacity: c.id === around ? 0.16 : 0.07 }).addTo(clayer.current);
        L.circleMarker(c.pos, { radius: 9, color: "#fff", weight: 2.5, fillColor: "#1d4ed8", fillOpacity: 1 })
          .bindTooltip(c.name, { permanent: located.length <= 12, direction: "top", offset: [0, -8] }).on("click", () => setAround(c.id)).addTo(clayer.current);
      }
    })();
  }, [located, radius, showClients, around, zone]);
  useEffect(() => { if (aroundClient && mapRef.current) mapRef.current.setView(aroundClient.pos, radius <= 2 ? 14 : radius <= 3 ? 13 : 12); }, [aroundClient, radius]);

  async function load() {
    if (busy) return;
    setBusy(true); setMsg("Lecture de l'annuaire officiel…");
    let added = 0, errored = "";
    try {
      const codes = SIZES[size]!.codes.join(",");
      for (const section of SECTORS[loadSector].sections) {
        let page = 1, total = 1, pend: TargetRow[] = [];
        const flush = async () => {
          if (!pend.length) return;
          const uniq = [...new Map(pend.map((t) => [t.siret, t])).values()]; pend = [];
          const r = await saveTargetsAction(zone, loadSector, uniq);
          if (r.error) errored = r.error;
          setExtra((e) => [...e, ...uniq.map((t) => ({ siret: t.siret, name: t.name, city: t.city, lat: t.lat, lng: t.lng, headcount: t.headcount, sector: t.sector, state: "cible" as const, clientId: null, address: t.address, postal: t.postal_code }))]);
        };
        while (page <= Math.min(total, 40) && !errored) {
          const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?departement=${zone}&section_activite_principale=${section}&tranche_effectif_salarie=${codes}&etat_administratif=A&per_page=25&page=${page}`);
          if (res.status === 429) { await sleep(3000); continue; }
          if (!res.ok) { errored = `L'annuaire répond ${res.status}.`; break; }
          const j = (await res.json()) as { results?: Record<string, any>[]; total_pages?: number };
          total = Number(j.total_pages ?? 0) || 0;
          const rows = (j.results ?? []).flatMap((r) => targetsOf(r, zone, loadSector));
          pend.push(...rows); added += rows.length;
          setMsg(`${added} entreprise(s) trouvée(s)… (${SECTORS[loadSector].label}, page ${page}/${Math.min(total, 40)})`);
          if (pend.length >= 100) await flush();
          page++; await sleep(250);
        }
        await flush();
        if (errored) break;
      }
      setMsg(errored ? `Arrêt : ${errored} ${added} entreprise(s) chargée(s) avant l'arrêt.` : `Terminé : ${added} entreprise(s) chargée(s) (${SECTORS[loadSector].label}).`);
    } catch { setMsg(`Chargement interrompu (réseau). ${added} entreprise(s) déjà chargée(s) : relancez pour la suite.`); }
    setBusy(false);
    router.refresh();
  }

  const btn = "rounded-full border px-3 py-1 text-sm";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(IDF).map(([code, nom]) => <button key={code} type="button" onClick={() => router.push(`/veille/territoire?zone=${code}`)} className={`${btn} ${code === zone ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-secondary"}`}>{nom} ({code})</button>)}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        <div>
          <div ref={el} className="z-0 h-[620px] w-full overflow-hidden rounded-xl border" aria-label="Carte de l'Île-de-France" />
          <p className="mt-1 text-xs text-muted-foreground"><span style={{ color: COLOR.cible }}>●</span> à prospecter · <span style={{ color: COLOR.en_cours }}>●</span> en cours · <span style={{ color: COLOR.client }}>●</span> client. Cliquez un département sur la carte pour le choisir, un point pour voir l&apos;entreprise et l&apos;itinéraire.</p>
        </div>
        <aside className="space-y-3">
          <div className="rounded-xl border bg-white p-3 text-sm">
            <div className="mb-2 flex items-center justify-between"><b>Mes clients et leur secteur</b><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={showClients} onChange={(e) => setShowClients(e.target.checked)} /> afficher</label></div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5"><span className="text-xs text-muted-foreground">Rayon :</span>{RADII.map((r) => <button key={r} type="button" onClick={() => setRadius(r)} className={`${btn} ${radius === r ? "border-primary bg-primary text-primary-foreground" : ""}`}>{r} km</button>)}</div>
            {around && <button type="button" onClick={() => setAround(null)} className="mb-2 rounded-full border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground">Autour de {aroundClient?.name} ✕</button>}
            {located.length ? <ul className="max-h-48 divide-y overflow-auto">{perClient.map(({ c, n }) => <li key={c.id}><button type="button" onClick={() => setAround(c.id === around ? null : c.id)} className={`flex w-full items-center justify-between py-1.5 text-left hover:bg-secondary ${c.id === around ? "font-semibold" : ""}`}><span>{c.name}</span><span className="text-xs text-muted-foreground">{n} à prospecter autour</span></button></li>)}</ul> : <p className="text-xs text-muted-foreground">Position de vos clients en cours de recherche…</p>}
            {clients.length > located.length && <p className="mt-1 text-xs text-muted-foreground">{clients.length - located.length} client(s) sans adresse exploitable (hors carte).</p>}
            <p className="mt-1 text-xs text-muted-foreground">Les points de prospection ci-dessous (gris) comptent ceux déjà chargés pour le département choisi.</p>
          </div>
          <div className="rounded-xl border bg-white p-3 text-sm">
            <b>Charger les entreprises du {IDF[zone] ?? zone}</b>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select value={loadSector} onChange={(e) => setLoadSector(e.target.value as SectorKey)} className="h-9 rounded-md border px-2">{SECTOR_KEYS.map((k) => <option key={k} value={k}>{SECTORS[k].label}</option>)}</select>
              <select value={size} onChange={(e) => setSize(e.target.value)} className="h-9 rounded-md border px-2">{Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            </div>
            <button type="button" onClick={() => void load()} disabled={busy} className="mt-2 h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? "Chargement…" : "Charger sur la carte"}</button>
            {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
          </div>
          <div className="rounded-xl border bg-white p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setSector("tous")} className={`${btn} ${sector === "tous" ? "border-primary bg-primary text-primary-foreground" : ""}`}>Tous</button>
              {SECTOR_KEYS.filter((k) => all.some((p) => p.sector === k)).map((k) => <button key={k} type="button" onClick={() => setSector(k)} className={`${btn} ${sector === k ? "border-primary bg-primary text-primary-foreground" : ""}`}>{SECTORS[k].label}</button>)}
            </div>
            <b>Où aller ? {city ? <button type="button" onClick={() => setCity(null)} className="ml-1 rounded-full border px-2 text-xs">{city} ✕</button> : "Communes avec le plus à prospecter"}</b>
            {!city && (cities.length ? <ul className="mt-2 max-h-56 divide-y overflow-auto">{cities.slice(0, 40).map((c) => <li key={c.city}><button type="button" onClick={() => setCity(c.city)} className="flex w-full items-center justify-between py-1.5 text-left hover:bg-secondary"><span>{c.city}</span><span className="text-xs text-muted-foreground">{c.todo} à voir · {c.total} au total</span></button></li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">Aucune entreprise chargée pour ce département : utilisez « Charger sur la carte » ci-dessus.</p>)}
          </div>
          {city && (
            <div className="max-h-[420px] overflow-auto rounded-xl border bg-white text-sm">
              <ul className="divide-y">{list.map((p) => (
                <li key={p.siret} className="p-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.address ?? p.city} · {headcountLabel(p.headcount)} · {LABEL[p.state]}</div>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <a className="rounded-md border px-2 py-1 text-xs hover:bg-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${p.name} ${p.address ?? ""}`)}`}>Itinéraire</a>
                    {p.clientId ? <a className="rounded-md border px-2 py-1 text-xs hover:bg-secondary" href={`/clients/${p.clientId}`}>Fiche</a>
                      : <button type="button" onClick={() => void targetToProspectAction(zone, p.siret)} className="rounded-md border px-2 py-1 text-xs hover:bg-secondary">Ajouter en prospect</button>}
                  </div>
                </li>
              ))}</ul>
              {!list.length && <p className="p-3 text-xs text-muted-foreground">Plus rien à prospecter ici.</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

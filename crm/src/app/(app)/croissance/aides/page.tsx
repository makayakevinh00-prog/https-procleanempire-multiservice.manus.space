import Link from "next/link";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIDES, NEEDS, NEED_KEYS, SEARCH, byNeed, isNeed } from "@/lib/aides";

export const metadata = { title: "Aides publiques" };

/** Aides publiques : les financements qui s'adressent à une petite entreprise de propreté en Île-de-France, par besoin. */
export default function AidesPage({ searchParams }: { searchParams: { besoin?: string } }) {
  const need = isNeed(searchParams.besoin) ? searchParams.besoin : null;
  const list = byNeed(need), top = AIDES.filter((a) => a.priority);
  const pill = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? "border-foreground bg-primary text-primary-foreground" : "bg-white hover:bg-secondary"}`;
  return (
    <>
      <PageHeader title="Aides publiques" subtitle="Les financements publics qui s'adressent à une entreprise comme la vôtre : petite entreprise de propreté et de conciergerie, dans le Val-d'Oise." />
      <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Liste de repérage : les conditions et les montants changent souvent. Avant de compter sur une aide, ouvrez la page officielle et faites confirmer par votre comptable ou un conseiller de la chambre de commerce.</div>

      {!need && (
        <Card className="mb-4">
          <CardHeader><CardTitle>À regarder en premier</CardTitle></CardHeader>
          <ul className="divide-y text-sm">{top.map((a) => (
            <li key={a.name} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
              <span className="min-w-0 flex-1"><b>{a.name}</b><span className="block text-xs text-muted-foreground">{NEEDS[a.need]} · {a.by}</span></span>
              <a href={(a.apply ?? a).url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">{a.apply ? "Faire la demande" : "Page officielle"}</a>
            </li>
          ))}</ul>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/croissance/aides" className={pill(!need)}>Toutes ({AIDES.length})</Link>
        {NEED_KEYS.map((k) => <Link key={k} href={`/croissance/aides?besoin=${k}`} className={pill(need === k)}>{NEEDS[k]} ({AIDES.filter((a) => a.need === k).length})</Link>)}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {list.map((a) => (
          <Card key={a.name}>
            <CardContent className="space-y-2 p-5 text-sm">
              <div className="flex items-start justify-between gap-3"><b className="text-base">{a.name}</b><Badge tone={a.kind === "Subvention" ? "green" : a.kind === "Prêt" || a.kind === "Garantie" ? "orange" : "gray"}>{a.kind}</Badge></div>
              <p className="text-xs text-muted-foreground">{a.by} · {NEEDS[a.need]}</p>
              <p>{a.what}</p>
              <p><span className="text-muted-foreground">Pour qui : </span>{a.who}</p>
              {a.amount && <p><span className="text-muted-foreground">Montant indicatif : </span>{a.amount}</p>}
              {a.how && <p className="rounded-md bg-secondary p-3"><b>Comment faire la demande : </b>{a.how}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {a.apply && <a href={a.apply.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">{a.apply.label}</a>}
                <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-secondary">Conditions (page officielle)</a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Chercher toutes les aides, à jour</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">Ces moteurs officiels connaissent toutes les aides selon votre adresse, votre activité et votre projet.</p>
          <ul className="grid gap-2 sm:grid-cols-2">{SEARCH.map((s) => (
            <li key={s.name}><a href={s.url} target="_blank" rel="noreferrer" className="block rounded-lg border p-3 hover:bg-secondary"><b>{s.name}</b><span className="block text-xs text-muted-foreground">{s.by} · {s.what}</span></a></li>
          ))}</ul>
          <p className="text-xs"><Link href="/croissance" className="text-primary hover:underline">← Retour à Croissance : quand recruter, investir ou racheter une entreprise</Link></p>
        </CardContent>
      </Card>
    </>
  );
}

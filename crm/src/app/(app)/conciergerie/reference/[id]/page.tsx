import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { RefUpload } from "@/components/crm/ref-upload";
import { analyzeListingAction, clearListingReferenceAction, saveListingGuideAction, setListingRoomsAction } from "@/app/actions/nettoyeurs";
import { aiConfigured, type Guide } from "@/lib/ai-inspect";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Référence du logement" };

/** Référence d'un logement : on filme ou photographie le logement propre une fois ; l'IA rédige le guide de ménage et s'en sert pour contrôler chaque ménage. */
export default async function ListingReference({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const sb = createClient();
  const [l, ph] = await Promise.all([
    sb.from("concierge_listings").select("id, name, ref_guide, ref_at, rooms, clients(name)").eq("id", params.id).maybeSingle(),
    sb.from("listing_ref_photos").select("id, created_at").eq("listing_id", params.id).order("created_at")
  ]);
  if (!l.data) notFound();
  const k = l.data as any, g = k.ref_guide as Guide | null, photos = (ph.data ?? []) as { id: string }[];
  return (
    <>
      <PageHeader title={`Référence — ${k.name}`} subtitle={`${k.clients?.name ?? ""} · Filmez ou photographiez le logement propre une fois : l'IA en tire le guide de ménage et compare ensuite chaque ménage à cet état.`} />
      <p className="mb-4 text-sm"><Link href="/conciergerie" className="text-primary hover:underline">← Retour à la conciergerie</Link></p>
      {searchParams.error && <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{searchParams.ok}</div>}

      <Card className="mb-4">
        <CardHeader><CardTitle>1. Le logement propre ({photos.length} image{photos.length > 1 ? "s" : ""})</CardTitle></CardHeader>
        <div className="space-y-4 px-5 pb-5">
          <p className="text-sm text-muted-foreground">Passez dans chaque pièce : lit fait, cuisine, salle de bain, sols. 20 images au plus ; une vidéo en donne 10.</p>
          <RefUpload listing={k.id} />
          {photos.length > 0 && <div className="flex flex-wrap gap-2">{photos.map((p) => <a key={p.id} href={`/api/conciergerie/reference/${p.id}`} target="_blank" rel="noreferrer"><img src={`/api/conciergerie/reference/${p.id}`} alt="Référence du logement" className="h-24 w-24 rounded-lg border object-cover" /></a>)}</div>}
          <div className="flex flex-wrap items-center gap-3">
            <form action={analyzeListingAction.bind(null, k.id)}><Button disabled={!photos.length}>{g ? "Refaire le guide avec l'IA" : "2. Faire rédiger le guide par l'IA"}</Button></form>
            {(photos.length > 0 || g) && <ConfirmAction action={clearListingReferenceAction.bind(null, k.id)} label="Tout effacer" size="sm" variant="ghost" title="Effacer la référence ?" description="Les photos de référence et le guide de ce logement sont supprimés." confirmLabel="Effacer" />}
            {!aiConfigured() && <span className="text-xs font-medium text-amber-700">Clé de l&apos;IA absente du serveur : l&apos;analyse ne peut pas tourner.</span>}
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Pièces à photographier</CardTitle></CardHeader>
        <form action={setListingRoomsAction.bind(null, k.id)} className="space-y-3 px-5 pb-5">
          <p className="text-sm text-muted-foreground">Le nettoyeur prend une photo avant et une photo après de chaque pièce de cette liste. Une pièce par ligne (« Chambre 1 », « Chambre 2 », « Douche »…). Laissez vide pour reprendre les pièces du guide, sinon la liste standard.</p>
          <textarea name="rooms" rows={6} defaultValue={((k.rooms ?? []) as string[]).join("\n")} placeholder={(g?.rooms ?? []).map((r) => r.room).join("\n") || "Cuisine\nSalon / séjour\nChambre\nSalle de bain / douche\nWC"} className="w-full rounded-md border p-3 text-sm" />
          <Button variant="outline">Enregistrer les pièces</Button>
        </form>
      </Card>

      <Card>
        <CardHeader><CardTitle>Guide de ménage{k.ref_at ? ` · mis à jour le ${formatDate(k.ref_at)}` : ""}</CardTitle></CardHeader>
        {!g ? <Empty>Pas encore de guide. Ajoutez des images puis lancez l&apos;analyse, ou écrivez-le ci-dessous.</Empty> : (
          <div className="space-y-3 px-5 pb-2 text-sm">
            {g.summary && <p className="text-muted-foreground">{g.summary}</p>}
            {g.rooms.map((r) => <div key={r.room}><b className="font-medium">{r.room}</b><ul className="mt-1 list-disc pl-5">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ul></div>)}
            {g.attention.length > 0 && <div className="rounded-md bg-amber-50 p-3 text-amber-900"><b className="font-medium">Points d&apos;attention</b><ul className="mt-1 list-disc pl-5">{g.attention.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          </div>
        )}
        <details className="px-5 pb-5 pt-2">
          <summary className="cursor-pointer text-sm font-medium text-primary">Corriger ou écrire le guide à la main</summary>
          <form action={saveListingGuideAction.bind(null, k.id)} className="mt-3 space-y-3">
            <input name="summary" defaultValue={g?.summary ?? ""} placeholder="Le logement en une phrase" className="h-10 w-full rounded-md border px-3 text-sm" />
            <textarea name="guide" rows={10} defaultValue={(g?.rooms ?? []).flatMap((r) => r.steps.map((s) => `${r.room} : ${s}`)).join("\n")} placeholder={"Cuisine : dégraisser la plaque\nCuisine : vider le lave-vaisselle\nChambre : refaire le lit avec les draps propres"} className="w-full rounded-md border p-3 font-mono text-sm" />
            <textarea name="attention" rows={3} defaultValue={(g?.attention ?? []).join("\n")} placeholder="Points d'attention, un par ligne" className="w-full rounded-md border p-3 text-sm" />
            <Button variant="outline">Enregistrer le guide</Button>
          </form>
        </details>
      </Card>
    </>
  );
}

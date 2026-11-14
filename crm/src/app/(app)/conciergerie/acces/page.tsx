import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { createPartnerAccessAction, setPartnerActiveAction } from "@/app/actions/nettoyeurs";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espaces conciergerie" };

/** Accès des conciergeries partenaires : un lien privé par client. Elles y relient leurs calendriers, ajoutent leurs logements et suivent leurs ménages. */
export default async function PartnerAccessPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const sb = createClient();
  const [acc, clients, lst] = await Promise.all([
    sb.from("partner_access").select("*, clients(name, email)").order("created_at", { ascending: false }),
    sb.from("clients").select("id, name, is_reserved").neq("status", "inactif").order("name"),
    sb.from("concierge_listings").select("client_id, cleaning_price_ht")
  ]);
  const rows = (acc.error ? [] : (acc.data ?? [])) as any[], listings = (lst.data ?? []) as any[];
  let fresh: { name: string; url: string; mailed: boolean } | null = null;
  try { fresh = JSON.parse(decodeURIComponent(cookies().get("partner_link")?.value ?? "null")); } catch { fresh = null; }
  return (
    <>
      <PageHeader title="Espaces conciergerie" subtitle="Chaque conciergerie (ou propriétaire) reçoit un lien privé : elle relie ses calendriers elle-même, ajoute ses logements, fait leur référence, suit ses ménages et son linge. Vous gardez la main sur le tarif." />
      <p className="mb-4 text-sm"><Link href="/conciergerie" className="text-primary hover:underline">← Retour à la conciergerie</Link></p>
      {searchParams.error && <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{searchParams.ok}</div>}
      {fresh && (
        <div className="mb-4 space-y-2 rounded-xl bg-secondary p-4 text-sm">
          <div className="font-medium text-foreground">Lien de {fresh.name} : affiché une seule fois{fresh.mailed ? " (envoyé aussi par e-mail)" : " (à transmettre vous-même)"}</div>
          <input readOnly value={fresh.url} aria-label="Lien de l'espace conciergerie" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-xs" />
        </div>
      )}
      <Card className="mb-4">
        <CardHeader><CardTitle>Donner un accès</CardTitle></CardHeader>
        <form action={createPartnerAccessAction} className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
          <Field label="Client (conciergerie ou propriétaire)"><Select name="client_id" required defaultValue=""><option value="" disabled>Choisir…</option>{((clients.data ?? []) as any[]).filter((c) => !c.is_reserved).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="send_mail" /> Envoyer le lien par e-mail au client</label>
          <div className="flex items-end"><Button>Créer le lien</Button></div>
        </form>
        <p className="px-5 pb-5 text-xs text-muted-foreground">Si ce client a déjà un accès, un nouveau lien remplace l&apos;ancien. Par défaut le lien n&apos;est pas envoyé : vous le transmettez vous-même.</p>
      </Card>
      <Card>
        <CardHeader><CardTitle>Accès existants ({rows.length})</CardTitle></CardHeader>
        {!rows.length ? <Empty>Aucun accès pour l&apos;instant.</Empty> : (
          <ul className="divide-y text-sm">{rows.map((r) => { const mine = listings.filter((l) => l.client_id === r.client_id), noPrice = mine.filter((l) => l.cleaning_price_ht == null).length; return (
            <li key={r.client_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1"><b className="font-medium">{r.clients?.name}</b><span className="block text-xs text-muted-foreground">{mine.length} logement{mine.length > 1 ? "s" : ""}{noPrice ? ` · ${noPrice} sans tarif (rien n'est publié sans tarif)` : ""}{r.token_set_at ? ` · lien du ${formatDate(r.token_set_at)}` : ""}{r.api_key_hash ? " · clé d'API créée" : ""}</span></span>
              <Badge tone={r.active ? "green" : "red"}>{r.active ? "Actif" : "Coupé"}</Badge>
              {r.active ? <ConfirmAction action={setPartnerActiveAction.bind(null, r.client_id, false)} label="Couper l'accès" size="sm" variant="ghost" title="Couper cet accès ?" description="Le lien et la clé d'API cessent de fonctionner tout de suite. Les logements et les ménages restent." confirmLabel="Couper" /> : <form action={setPartnerActiveAction.bind(null, r.client_id, true)}><Button size="sm" variant="outline">Réactiver</Button></form>}
            </li>); })}</ul>
        )}
      </Card>
    </>
  );
}

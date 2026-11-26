import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accès et droits" };

type Row = { who: string; sub?: string; sees: string; state: "actif" | "invité" | "révoqué" | "expiré"; since?: string | null; last?: string | null };

const tone: Record<Row["state"], string> = {
  actif: "bg-[#e3efe6] text-[#1f5e33]",
  invité: "bg-[#f7ecd3] text-[#7a5410]",
  expiré: "bg-[#f6e4e1] text-[#7d261d]",
  révoqué: "bg-secondary text-muted-foreground"
};

function Block({ title, hint, rows }: { title: string; hint: string; rows: Row[] }) {
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader><CardTitle>{title}</CardTitle><span className="text-xs text-muted-foreground">{hint}</span></CardHeader>
      {!rows.length ? <Empty>Personne pour le moment.</Empty> : (
        <ul className="divide-y divide-border/60">
          {rows.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 text-[14.5px]">
              <span className="min-w-[200px] flex-1">
                <b className="font-medium text-foreground">{r.who}</b>
                {r.sub && <span className="block text-[13px] text-muted-foreground">{r.sub}</span>}
              </span>
              <span className="min-w-[220px] flex-[1.4] text-[13.5px] text-secondary-foreground">{r.sees}</span>
              <span className="text-[12.5px] text-muted-foreground">{r.last ? `vu le ${formatDate(r.last)}` : r.since ? `depuis le ${formatDate(r.since)}` : "jamais connecté"}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${tone[r.state]}`}>{r.state}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const status = (revoked?: string | null, claimed?: string | null, expires?: string | null): Row["state"] =>
  revoked ? "révoqué" : claimed ? "actif" : expires && new Date(expires) < new Date() ? "expiré" : "invité";

/** Vue unique : qui peut entrer dans quoi, et ce qu'il y voit. */
export default async function AccessPage() {
  await requireOwner();
  const s = createClient();
  const [acc, team, staff, cleaners, conns, partners] = await Promise.all([
    s.from("accountants").select("email, label, created_at, claimed_at, revoked_at, code_expires_at").order("created_at"),
    s.from("team_members").select("email, label, role, created_at, claimed_at, revoked_at, code_expires_at").order("created_at"),
    s.from("staff").select("full_name, email, role, active, app_opened_at, agent_token_set_at, created_at").order("full_name"),
    s.from("cleaners").select("full_name, email, status, approved_at, token_set_at, last_seen_at, created_at").order("full_name"),
    s.from("agent_connectors").select("label, agent_key, created_at, last_used_at, revoked_at").order("created_at"),
    s.from("partner_access").select("created_at, active, token_set_at, clients(name)")
  ]);

  const accountants: Row[] = ((acc.data ?? []) as any[]).map((a) => ({
    who: a.label || a.email, sub: a.email,
    sees: "Espace comptable en lecture seule : factures émises (PDF), TVA, virements, paiements, exports.",
    state: status(a.revoked_at, a.claimed_at, a.code_expires_at), since: a.claimed_at ?? a.created_at, last: null
  }));
  const members: Row[] = ((team.data ?? []) as any[]).map((t) => ({
    who: t.label || t.email, sub: `${t.email}${t.role ? " · " + t.role : ""}`,
    sees: "Le CRM, selon les droits donnés à l'invitation.",
    state: status(t.revoked_at, t.claimed_at, t.code_expires_at), since: t.claimed_at ?? t.created_at
  }));
  const agents: Row[] = ((staff.data ?? []) as any[]).map((a) => ({
    who: a.full_name, sub: [a.role, a.email].filter(Boolean).join(" · "),
    sees: "Application agent : ses missions, son planning, le pointage.",
    state: a.active === false ? "révoqué" : a.agent_token_set_at ? "actif" : "invité", since: a.agent_token_set_at ?? a.created_at, last: a.app_opened_at
  }));
  const independents: Row[] = ((cleaners.data ?? []) as any[]).map((c) => ({
    who: c.full_name, sub: [c.status, c.email].filter(Boolean).join(" · "),
    sees: "Application indépendant : missions proposées, ses gains, son profil.",
    state: c.status === "refuse" || c.status === "suspendu" ? "révoqué" : c.approved_at && c.token_set_at ? "actif" : "invité", since: c.approved_at ?? c.created_at, last: c.last_seen_at
  }));
  const connectors: Row[] = ((conns.data ?? []) as any[]).map((c) => ({
    who: c.label || c.agent_key, sub: "Connecteur d'agent (JARVIS)",
    sees: "Lit les données du CRM et propose des actions : rien n'est envoyé sans ta validation.",
    state: c.revoked_at ? "révoqué" : "actif", since: c.created_at, last: c.last_used_at
  }));
  const parts: Row[] = ((partners.data ?? []) as any[]).map((p) => ({
    who: p.clients?.name ?? "Partenaire", sub: "Accès partenaire",
    sees: "Suivi des prestations de son compte uniquement.",
    state: p.active ? "actif" : "révoqué", since: p.token_set_at ?? p.created_at
  }));

  const accountantOk = accountants.some((a) => a.state === "actif");
  return (
    <>
      <PageHeader title="Accès et droits" subtitle="Toutes les personnes qui peuvent entrer dans tes applications, et ce qu'elles y voient." />
      {!accountantOk && <p className="mb-4 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">Aucun comptable n&apos;a encore activé son accès. <Link href="/parametres" className="font-medium text-primary hover:underline">Inviter ou renvoyer un code</Link></p>}
      <Block title="Comptable" hint="lecture seule · espace /compta" rows={accountants} />
      <Block title="Équipe du CRM" hint="invités avec des droits" rows={members} />
      <Block title="Agents (salariés)" hint="app /agent" rows={agents} />
      <Block title="Indépendants" hint="app /nettoyeur" rows={independents} />
      <Block title="Agents IA" hint="connecteurs" rows={connectors} />
      <Block title="Partenaires" hint="accès limité" rows={parts} />
      <p className="mt-2 text-[13px] text-muted-foreground">Pour inviter ou révoquer quelqu&apos;un : <Link href="/parametres" className="font-medium text-primary hover:underline">Paramètres</Link>.</p>
    </>
  );
}

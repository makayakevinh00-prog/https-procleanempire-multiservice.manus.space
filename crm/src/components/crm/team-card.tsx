import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { TeamPerms } from "@/components/crm/team-perms";
import { inviteTeamAction, updateTeamMemberAction, revokeTeamMemberAction, reinviteTeamMemberAction } from "@/app/actions/team";
import { ROLES, SECTIONS, sanitizePerms, type RoleKey } from "@/lib/team";

type Member = { id: string; email: string; label: string | null; role: string; perms: unknown; created_at: string; claimed_at: string | null; revoked_at: string | null; code_expires_at: string | null };
const fr = (d: string) => new Date(d).toLocaleDateString("fr-FR");

/** Équipe et accès (Paramètres) : le patron invite, règle les droits section par section et retire un accès à tout moment. */
export function TeamCard({ members, fresh }: { members: Member[]; fresh: { email: string; code: string; url: string; mailed?: boolean } | null }) {
  const active = members.filter((m) => !m.revoked_at);
  return (
    <Card className="mb-4">
      <CardHeader><CardTitle>Équipe et accès</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm text-secondary-foreground">
        <p>Invitez un collaborateur (RH, commercial, alternant, stagiaire…) et choisissez ce qu&apos;il peut faire, section par section : <b className="font-medium text-foreground">aucun accès</b>, <b className="font-medium text-foreground">lecture seule</b> ou <b className="font-medium text-foreground">lecture et modification</b>. Il crée son compte avec l&apos;adresse invitée ; vous modifiez ou retirez ses accès à tout moment, et c&apos;est immédiat. Les paramètres, l&apos;équipe, JARVIS et les connecteurs restent à vous seul, et l&apos;envoi d&apos;e-mails aux clients reste soumis à votre validation.</p>
        {fresh && (
          <div className="space-y-2 rounded-xl bg-secondary p-4">
            <div className="font-medium text-foreground">Invitation pour {fresh.email} : affichée une seule fois{fresh.mailed ? " (e-mail envoyé)" : " (e-mail non envoyé : transmettez-la vous-même)"}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><div className="mb-1 text-[12px] text-muted-foreground">Adresse d&apos;inscription</div><input readOnly value={fresh.url} aria-label="Adresse d'inscription" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-xs" /></div>
              <div><div className="mb-1 text-[12px] text-muted-foreground">Code d&apos;invitation (valable 7 jours)</div><input readOnly value={fresh.code} aria-label="Code d'invitation" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-sm tracking-widest" /></div>
            </div>
            <p className="text-[13px] text-muted-foreground">La personne ouvre l&apos;adresse, crée son compte avec <b>{fresh.email}</b>, puis saisit le code. Transmettez le code par un autre canal que l&apos;adresse (SMS, téléphone).</p>
          </div>
        )}
        {active.length > 0 && (
          <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
            {active.map((m) => {
              const perms = sanitizePerms(m.perms);
              const roleLabel = (ROLES as Record<string, { label: string }>)[m.role]?.label ?? m.role;
              const granted = SECTIONS.filter((s) => perms[s.key]);
              return (
                <li key={m.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-foreground">{m.label || m.email}</span>
                    {m.label && <span className="text-muted-foreground">{m.email}</span>}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{roleLabel}</span>
                    <span className="text-[13px] text-muted-foreground">{m.claimed_at ? `actif depuis le ${fr(m.claimed_at)}` : `invitation en attente (jusqu'au ${m.code_expires_at ? fr(m.code_expires_at) : "?"})`}</span>
                    <span className="ml-auto flex gap-2">
                      {!m.claimed_at && <ConfirmAction action={reinviteTeamMemberAction.bind(null, m.id)} label="Nouveau code" variant="outline" size="sm" title="Créer un nouveau code ?" description="L'ancien code cesse de fonctionner. Le nouveau s'affiche une seule fois." confirmLabel="Créer" />}
                      <ConfirmAction action={revokeTeamMemberAction.bind(null, m.id)} label="Retirer l'accès" variant="outline" size="sm" title="Retirer l'accès ?" description={`${m.email} n'aura plus accès à rien. Vous pourrez l'inviter à nouveau.`} confirmLabel="Retirer" />
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">{granted.length ? granted.map((s) => `${s.label} : ${perms[s.key] === "write" ? "modification" : "lecture"}`).join(" · ") : "Aucune section ouverte pour l'instant."}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[13px] font-medium text-primary">Modifier les accès</summary>
                    <form action={updateTeamMemberAction.bind(null, m.id)} className="mt-3 space-y-3 rounded-xl border border-border/70 p-3">
                      <Field label="Nom (facultatif)"><Input name="label" defaultValue={m.label ?? ""} /></Field>
                      <TeamPerms role={m.role} perms={perms} idPrefix={`m${m.id.slice(0, 8)}`} />
                      <Button type="submit" size="sm">Enregistrer les accès</Button>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <ConfirmAction action={inviteTeamAction} label="Inviter une personne" variant="outline" size="sm" title="Inviter une personne" confirmLabel="Créer l'invitation"
          description="Un code est généré (et envoyé par e-mail si la messagerie est configurée). Une nouvelle invitation remplace la précédente pour la même adresse."
          extra={<div className="space-y-3"><Field label="Adresse e-mail"><Input name="email" type="email" required placeholder="prenom@exemple.fr" /></Field><Field label="Nom (facultatif)"><Input name="label" placeholder="ex. Camille, alternante" /></Field><TeamPerms idPrefix="new" /></div>} />
      </CardContent>
    </Card>
  );
}
export type { RoleKey };

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setStageAction, validateMissionsAction } from "@/app/actions/missions";
import { cn } from "@/lib/utils";

export type VerifyItem = {
  id: string;
  client: string;
  line: string;
  summary: string;
  metrics: string;
  verdict: "conforme" | "a_verifier" | "non_conforme" | "en_attente";
  verdictLabel: string;
  thumbs: { id: string; kind: string }[];
};

const VERDICT = { conforme: "bg-[#e6f1ea] text-[#2f7a55]", a_verifier: "bg-[#f7ecdb] text-[#8f5a12]", non_conforme: "bg-[#f6e4e1] text-[#b3382c]", en_attente: "bg-secondary text-muted-foreground" } as const;
const BACK = "/missions/a-verifier";

/**
 * File de contrôle en un geste : les missions conformes sont cochées d'avance, un seul bouton les valide toutes.
 * Une mission non conforme ne peut pas être cochée : elle se traite dans sa fiche ou se renvoie à l'agent.
 */
export function VerifyList({ items }: { items: VerifyItem[] }) {
  const selectable = useMemo(() => items.filter((i) => i.verdict !== "non_conforme").map((i) => i.id), [items]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(items.filter((i) => i.verdict === "conforme").map((i) => i.id)));
  const toggle = (id: string) => setPicked((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const count = [...picked].filter((id) => selectable.includes(id)).length;
  const all = count === selectable.length && selectable.length > 0;

  return (
    <div>
      <form action={validateMissionsAction} className="sticky top-[4.25rem] z-10 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-[0_8px_24px_rgba(17,18,20,0.06)] backdrop-blur md:top-16">
        <input type="hidden" name="back" value={BACK} />
        {[...picked].filter((id) => selectable.includes(id)).map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
          <input type="checkbox" className="h-5 w-5 rounded border-border accent-[hsl(var(--primary))]" checked={all} onChange={() => setPicked(all ? new Set() : new Set(selectable))} />
          Tout cocher
        </label>
        <span className="text-sm text-muted-foreground">
          <b className="num font-medium text-foreground">{count}</b> sur {items.length} cochée{count > 1 ? "s" : ""}. Les missions conformes le sont d&apos;avance.
        </span>
        <Button className="ml-auto" disabled={!count}>
          <CheckCheck className="h-4 w-4" /> Valider {count > 1 ? `les ${count} missions` : count === 1 ? "la mission" : "la sélection"}
        </Button>
      </form>

      <ul className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(17,18,20,0.04),0_8px_24px_rgba(17,18,20,0.04)]">
        {items.map((it) => {
          const locked = it.verdict === "non_conforme";
          const on = picked.has(it.id) && !locked;
          return (
            <li key={it.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border/70 px-4 py-3.5 transition-colors first:border-t-0", on && "bg-secondary/50")}>
              <label className={cn("flex h-11 w-9 shrink-0 items-center justify-center", locked ? "cursor-not-allowed" : "cursor-pointer")} title={locked ? "Non conforme : à traiter dans la fiche" : undefined}>
                <input type="checkbox" className="h-5 w-5 rounded border-border accent-[hsl(var(--primary))] disabled:opacity-40" checked={on} disabled={locked} onChange={() => toggle(it.id)} aria-label={`Cocher la mission ${it.client}`} />
              </label>
              <div className="flex shrink-0 gap-1.5">
                {it.thumbs.length ? it.thumbs.map((p) => (
                  <Link key={p.id} href={`/missions/${it.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/missions/photo/${p.id}`} alt={`Photo ${p.kind}`} loading="lazy" className="h-14 w-14 rounded-lg border object-cover" />
                  </Link>
                )) : <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed text-center text-[10px] leading-tight text-muted-foreground">sans photo</div>}
              </div>
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/missions/${it.id}`} className="text-[15px] font-semibold text-foreground hover:underline">{it.client}</Link>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT[it.verdict]}`}>{it.verdictLabel}</span>
                </div>
                <div className="truncate text-[13px] text-muted-foreground">{it.line}</div>
                <div className="mt-0.5 text-[13px] text-secondary-foreground">{it.summary}</div>
                <div className="num text-[12px] text-muted-foreground">{it.metrics}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={setStageAction.bind(null, it.id)}><input type="hidden" name="stage" value="validee" /><input type="hidden" name="back" value={BACK} /><Button size="sm" variant="outline" disabled={locked}>Valider</Button></form>
                <form action={setStageAction.bind(null, it.id)}><input type="hidden" name="stage" value="en_cours" /><input type="hidden" name="back" value={BACK} /><Button size="sm" variant="ghost">Renvoyer</Button></form>
                <Link href={`/missions/${it.id}`} className="text-[13px] font-medium text-primary hover:underline">Détail</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

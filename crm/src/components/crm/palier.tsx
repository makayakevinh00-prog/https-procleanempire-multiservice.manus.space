import Link from "next/link";
import { Check, Flag } from "lucide-react";
import { PALIERS, palierState } from "@/lib/domain/palier";
import { cn } from "@/lib/utils";

const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/** Cap sur le prochain palier de chiffre récurrent signé. Le palier visé change tout seul dès que le précédent est atteint. */
export function PalierCard({ recurrent, contracts }: { recurrent: number; contracts: number }) {
  const s = palierState(recurrent);
  return (
    <section aria-label="Palier de croissance" className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground"><Flag className="h-4 w-4" aria-hidden /> {s.termine ? "Tous les paliers sont atteints" : `Palier ${s.rang} sur ${PALIERS.length}`}</div>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-foreground">
            {s.termine ? `Objectif atteint : ${eur0(s.cible.seuil)} de récurrent signé par mois` : `Cap sur ${eur0(s.cible.seuil)} de récurrent signé par mois`}
          </h2>
        </div>
        <div className="num whitespace-nowrap text-[clamp(26px,2.8vw,36px)] font-semibold leading-none tracking-[-0.03em] text-primary">{s.pct} %</div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.pct}
        aria-label={`Avancement vers ${eur0(s.cible.seuil)} de récurrent signé par mois`}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${Math.max(s.pct, recurrent > 0 ? 2 : 0)}%` }} />
      </div>

      <p className="num mt-3 text-sm text-foreground">
        <b className="font-semibold">{eur0(recurrent)}</b> signés aujourd&apos;hui ({contracts} contrat{contracts > 1 ? "s" : ""} actif{contracts > 1 ? "s" : ""}).{" "}
        {s.termine ? "Bravo." : <>Il manque <b className="font-semibold text-destructive">{eur0(s.reste)}</b> de contrats par mois.</>}
      </p>
      {!s.termine && <p className="mt-1 text-[13px] text-muted-foreground">À ce palier : {s.cible.action}</p>}

      <ol className="mt-4 flex flex-wrap gap-2 text-[13px]">
        {PALIERS.map((p) => {
          const done = recurrent >= p.seuil, current = !s.termine && p.seuil === s.cible.seuil;
          return (
            <li key={p.seuil} aria-current={current ? "step" : undefined}
              className={cn("num inline-flex items-center gap-1.5 rounded-full border px-3 py-1", done ? "border-transparent bg-success/15 text-success" : current ? "border-primary font-medium text-primary" : "border-border text-muted-foreground")}>
              {done && <Check className="h-3.5 w-3.5" aria-hidden />}{eur0(p.seuil)}{done ? " atteint" : current ? " en cours" : ""}
            </li>
          );
        })}
        <li className="ml-auto"><Link href="/contrats" className="text-[13px] font-medium text-primary hover:underline">Voir les contrats</Link></li>
      </ol>
    </section>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Courbe discrète : uniquement des valeurs réelles, pas de décor. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2 || Math.max(...values) <= 0) return null;
  const max = Math.max(...values), min = Math.min(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 22 - ((v - min) / span) * 18] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="mt-3 block h-6 w-full overflow-visible" role="img" aria-label={label}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/70" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r={2.2} className="fill-foreground" />
    </svg>
  );
}

/** Indicateur : grand chiffre, libellé discret, une ligne de contexte. Aucune boîte colorée. */
export function Stat({ label, value, unit, hint, tone, href, children }: {
  label: string; value: string; unit?: string; hint?: React.ReactNode; tone?: "ok" | "warn" | "err"; href: string; children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block min-w-0 rounded-lg px-1 py-5 transition-colors hover:bg-secondary/40 sm:px-5 sm:first:pl-0">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="num mt-1.5 whitespace-nowrap text-[clamp(26px,2.8vw,36px)] font-semibold leading-none tracking-[-0.03em] text-foreground">
        {value}{unit && <small className="ml-1 text-[0.5em] font-medium tracking-normal text-muted-foreground">{unit}</small>}
      </div>
      <div className={cn("num mt-2 text-[13px]", tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : tone === "err" ? "text-destructive" : "text-muted-foreground")}>{hint}</div>
      {children}
    </Link>
  );
}

export function Seg({ items }: { items: { href: string; label: string; count?: number; active: boolean; alert?: boolean }[] }) {
  return (
    <div role="tablist" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl bg-secondary p-[3px]">
      {items.map((t) => (
        <Link key={t.href} href={t.href} role="tab" aria-selected={t.active} scroll={false}
          className={cn("flex shrink-0 items-center gap-2 rounded-[9px] px-3.5 py-1.5 text-[14px] transition-colors",
            t.active ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(17,18,20,0.08)]" : "text-secondary-foreground/80 hover:text-foreground")}>
          {t.label}
          {t.count !== undefined && <span className={cn("num text-xs font-medium", t.alert && t.count > 0 ? "text-destructive" : "text-muted-foreground")}>{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

/** Ligne de liste : repère à gauche, texte principal + précision, action à droite. */
export function Row({ lead, title, sub, right, href, dot }: { lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; href?: string; dot?: "ok" | "warn" | "err" }) {
  const body = (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 border-b border-border/70 px-6 py-3.5 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
      <span className="num text-[15px] font-semibold text-foreground">{lead}</span>
      <div className="min-w-0 text-foreground">
        {dot && <span className={cn("mr-2 inline-block h-[7px] w-[7px] rounded-full align-[1px]", dot === "ok" ? "bg-success" : dot === "warn" ? "bg-warning" : "bg-destructive")} aria-hidden />}
        {title}
        {sub && <small className="mt-0.5 block text-[13px] text-muted-foreground">{sub}</small>}
      </div>
      <span className="whitespace-nowrap text-[13px] text-muted-foreground">{right}</span>
    </div>
  );
  return href ? <Link href={href} className="block transition-colors hover:bg-secondary/40">{body}</Link> : body;
}

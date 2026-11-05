import Link from "next/link";
import { cn } from "@/lib/utils";

const TONES = {
  blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700", violet: "bg-violet-50 text-violet-700", slate: "bg-slate-100 text-slate-700"
};

/** Petite carte de chiffre placée au-dessus des listes (comme un tableau de bord miniature). */
export function Stat({ label, value, sub, tone = "slate", href, icon: Icon }: { label: string; value: string | number; sub?: string; tone?: keyof typeof TONES; href?: string; icon?: React.ComponentType<{ className?: string }> }) {
  const body = (
    <div className="flex h-full items-center gap-3 rounded-2xl border border-slate-200/70 bg-card p-4 sm:gap-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-md">
      {Icon && <span className={cn("hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex", TONES[tone])}><Icon className="h-6 w-6" /></span>}
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-slate-500">{label}</div>
        <div className="truncate text-xl font-extrabold sm:text-2xl tracking-tight text-slate-900">{value}</div>
        {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

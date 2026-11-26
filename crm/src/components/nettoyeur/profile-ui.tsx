import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Titre de section, comme sur le profil des agents : petites capitales espacées. */
export const sectionLabel = "px-1 pb-2 pt-6 text-[14px] font-extrabold uppercase tracking-[0.14em] text-[var(--a-mute)]";

/** Ligne de liste : pastille d'icône, titre, précision, chevron. `warn` met la précision en orange (à compléter). */
export function Row({ href, icon: Icon, title, sub, warn = false, danger = false }: { href: string; icon: React.ElementType; title: string; sub?: string; warn?: boolean; danger?: boolean }) {
  return (
    <Link href={href} className="fx-press flex items-center gap-3 p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--a-bg)] text-[var(--a-pri)]"><Icon className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1"><b className="block text-[17px]">{title}</b>{sub && <span className={`block truncate text-[14px] ${warn ? "font-bold text-[var(--a-warn)]" : "text-[var(--a-mute)]"}`}>{sub}</span>}</span>
      <ChevronRight className={`h-5 w-5 shrink-0 ${danger ? "text-[var(--a-bad)]" : "text-[var(--a-mute)]"}`} />
    </Link>
  );
}

/** Liste de lignes dans une carte, séparées par un filet. */
export const RowList = ({ children }: { children: React.ReactNode }) => <section className="divide-y divide-[var(--a-line)] overflow-hidden rounded-3xl bg-[var(--a-card)]">{children}</section>;

/** Retour vers le profil, en haut des sous-pages. */
export const BackToProfile = ({ token }: { token: string }) => <Link href={`/nettoyeur/${token}/profil`} className="mb-3 inline-flex items-center gap-1 text-[15px] font-extrabold text-[var(--a-pri)]"><ChevronLeft className="h-5 w-5" />Profil</Link>;

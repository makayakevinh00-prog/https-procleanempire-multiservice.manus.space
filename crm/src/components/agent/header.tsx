import Link from "next/link";
import { initials } from "@/lib/field-ui";

/** En-tête : nom de l'entreprise à gauche, initiales de l'agent à droite (mène au profil). */
export function AgentHeader({ token, name, title, sub }: { token: string; name: string; title: string; sub?: string }) {
  return (
    <header className="mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">ProClean</span>
        <Link href={`/agent/${token}/profil`} aria-label="Profil" className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--a-soft)] bg-[var(--a-card)] text-[15px] font-extrabold text-[var(--a-pri)]">{initials(name)}</Link>
      </div>
      <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight">{title}</h1>
      {sub && <p className="text-[15px] text-[var(--a-mute)]">{sub}</p>}
    </header>
  );
}

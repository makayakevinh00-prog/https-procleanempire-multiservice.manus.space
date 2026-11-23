import Image from "next/image";
import Link from "next/link";
import { FIELD_CSS } from "@/components/agent/theme";
import { agentPrefs } from "@/lib/agent";
import { LegalLinks } from "@/components/legal/links";
import { LEGAL_UPDATED } from "@/lib/legal";

/** Mise en page commune des pages légales : même thème que l'application de terrain, lisible sur téléphone. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string;
  sections: { h: string; p: React.ReactNode[] }[];
}) {
  return (
    <div
      className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]"
      data-theme={agentPrefs().theme}
      lang="fr"
    >
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/nettoyeur" aria-label="ProClean Empire — accueil">
          <Image
            src="/logo.png"
            alt="ProClean Empire"
            width={187}
            height={344}
            className="mb-3 h-16 w-auto"
            priority
          />
        </Link>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">
          {title}
        </h1>
        {intro && (
          <p className="mt-2 text-[15px] text-[var(--a-mute)]">{intro}</p>
        )}
        <div className="mt-5 space-y-3">
          {sections.map(({ h, p }) => (
            <section key={h} className="rounded-2xl bg-[var(--a-card)] p-4">
              <h2 className="text-[17px] font-extrabold">{h}</h2>
              {p.map((text, i) => (
                <p
                  key={i}
                  className="mt-2 text-[15px] leading-relaxed text-[var(--a-mute)]"
                >
                  {text}
                </p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-5 text-center text-[13px] text-[var(--a-mute)]">
          Dernière mise à jour : {LEGAL_UPDATED}.
        </p>
        <LegalLinks className="mt-3" />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/reserver"
            className="flex h-12 items-center justify-center rounded-2xl border border-[var(--a-pri)] px-5 text-[15px] font-extrabold text-[var(--a-pri)]"
          >
            Réserver un ménage
          </Link>
          <Link
            href="/nettoyeur"
            className="flex h-12 items-center justify-center rounded-2xl border border-[var(--a-pri)] px-5 text-[15px] font-extrabold text-[var(--a-pri)]"
          >
            Devenir nettoyeur
          </Link>
        </div>
      </main>
    </div>
  );
}

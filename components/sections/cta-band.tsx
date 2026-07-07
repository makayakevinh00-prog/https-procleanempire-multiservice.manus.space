import Link from "next/link";

export function CtaBand() {
  return (
    <section className="section">
      <div className="rounded-3xl bg-slate-950 p-8 text-white md:p-12">
        <div className="grid gap-8 md:grid-cols-[2fr,1fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Prochaine étape
            </p>
            <h2 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Recevez un protocole d&apos;intervention clair et chiffré
            </h2>
            <p className="mt-4 max-w-2xl text-slate-300">
              Décrivez votre activité en 2 minutes. Nous vous proposons une organisation adaptée à
              vos locaux, vos horaires et vos standards d&apos;exploitation.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/contact" className="btn-secondary border-slate-500 bg-transparent text-white">
              Être rappelé
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

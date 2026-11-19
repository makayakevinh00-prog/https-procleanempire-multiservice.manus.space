import "@/components/landing/landing.css";
import Link from "next/link";
import { Cta } from "@/components/landing/ui";

export function CtaBand() {
  return (
    <section className="section">
      <div className="rounded-[32px] bg-[#dbe6fc] p-8 md:p-14">
        <div className="grid gap-8 md:grid-cols-[2fr,1fr] md:items-center">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#1e3a6e]">
              Prochaine étape
            </p>
            <h2 className="lp-serif mt-3 text-3xl leading-[1.05] text-[#101828] [text-wrap:balance] md:text-5xl">
              Recevez un protocole d&apos;intervention <em>clair et chiffré</em>
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#475467]">
              Décrivez votre activité en 2 minutes. Nous vous proposons une organisation adaptée à
              vos locaux, vos horaires et vos standards d&apos;exploitation.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <Cta href="/devis">Demander un devis</Cta>
            <Link href="/contact" className="inline-flex min-h-11 items-center border-b border-current pb-0.5 text-base font-semibold text-[#1e3a6e] hover:opacity-70">
              Être rappelé
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

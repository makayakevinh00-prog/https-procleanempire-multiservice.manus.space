import Link from "next/link";
import { teamPageContent } from "@/lib/content/phase2";
import { VisualPlaceholder } from "@/components/ui/visual-placeholder";

export function TeamPremiumSection() {
  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#c9a227]">
          {teamPageContent.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-bold text-[#14213d] md:text-5xl">{teamPageContent.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          {teamPageContent.description}
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-[#14213d]">{teamPageContent.founderBlock.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {teamPageContent.founderBlock.text}
            </p>
            <div className="mt-4">
              <VisualPlaceholder label="PHOTO FONDATEUR" ratio="wide" />
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-[#14213d]">{teamPageContent.teamsBlock.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {teamPageContent.teamsBlock.text}
            </p>
            <div className="mt-4">
              <VisualPlaceholder label="PHOTO EQUIPES" ratio="wide" />
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-[#14213d]">{teamPageContent.valuesBlock.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {teamPageContent.valuesBlock.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="text-[#c9a227]" aria-hidden>
                    ✓
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-[#14213d]">{teamPageContent.toolsBlock.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{teamPageContent.toolsBlock.text}</p>
            <div className="mt-4">
              <VisualPlaceholder label="PHOTO MATERIEL ET PROCESS" ratio="wide" />
            </div>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/devis" className="btn-primary">
            Demander un devis
          </Link>
          <Link href="/contact" className="btn-secondary">
            Organiser une visite
          </Link>
        </div>
      </div>
    </section>
  );
}

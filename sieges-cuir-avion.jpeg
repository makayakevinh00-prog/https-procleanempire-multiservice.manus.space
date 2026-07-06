"use client";

import { useMemo, useState } from "react";
import { faqs } from "@/lib/data";
import { faqThemes } from "@/lib/content/phase3";

type Theme = (typeof faqThemes)[number] | "Tous";

const themeKeywordMap: Record<(typeof faqThemes)[number], string[]> = {
  Tarifs: ["devis", "estimation", "prix", "tarif"],
  Interventions: ["intervention", "demarrer", "horaires", "week-end"],
  Qualite: ["qualite", "controle", "produits", "hygiene"],
  Contrat: ["contrat", "flexible", "ponctuelle"],
  Zone: ["ile-de-france", "zone", "sites"],
  Technique: ["vitrerie", "desinfection", "chantier"]
};

function inferTheme(text: string): (typeof faqThemes)[number] {
  const normalized = text.toLowerCase();
  for (const theme of faqThemes) {
    if (themeKeywordMap[theme].some((keyword) => normalized.includes(keyword))) {
      return theme;
    }
  }
  return "Technique";
}

export function FaqAdvanced() {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<Theme>("Tous");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const enrichedFaq = useMemo(
    () =>
      faqs.map((faq) => ({
        ...faq,
        theme: inferTheme(`${faq.question} ${faq.answer}`)
      })),
    []
  );

  const filteredFaq = useMemo(() => {
    return enrichedFaq.filter((faq) => {
      const matchesTheme = theme === "Tous" ? true : faq.theme === theme;
      const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
      const matchesQuery = query.trim() ? haystack.includes(query.toLowerCase()) : true;
      return matchesTheme && matchesQuery;
    });
  }, [enrichedFaq, query, theme]);

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <div className="grid gap-4 lg:grid-cols-[1fr,auto] lg:items-end">
          <label className="block text-sm font-semibold text-slate-700">
            Recherche dans la FAQ
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex: delai d'intervention, contrat, prix..."
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-[#14213d] focus:outline-none focus:ring-1 focus:ring-[#14213d]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["Tous", ...faqThemes] as Theme[]).map((item) => {
              const active = item === theme;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTheme(item)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    active
                      ? "bg-[#14213d] text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:border-[#c9a227]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredFaq.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Aucun resultat pour cette recherche.
            </p>
          ) : (
            filteredFaq.map((item, index) => {
              const isOpen = index === openIndex;
              return (
                <article key={item.question} className="overflow-hidden rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span>
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                        {item.theme}
                      </span>
                      <span className="font-semibold text-[#14213d]">{item.question}</span>
                    </span>
                    <span className="text-xl text-[#14213d]" aria-hidden>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-slate-200 px-5 py-4 text-sm leading-relaxed text-slate-700">
                      {item.answer}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

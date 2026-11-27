"use client";

import { useMemo, useState } from "react";
import { faqs } from "@/lib/data";
import { faqThemes } from "@/lib/content/phase3";

type Theme = (typeof faqThemes)[number] | "Tous";

const themeKeywordMap: Record<(typeof faqThemes)[number], string[]> = {
  Tarifs: ["devis", "estimation", "prix", "tarif"],
  Interventions: ["intervention", "démarrer", "horaires", "week-end"],
  Qualité: ["qualité", "contrôle", "produits", "hygiène"],
  Contrat: ["contrat", "flexible", "ponctuelle"],
  Zone: ["île-de-france", "zone", "sites"],
  Technique: ["vitrerie", "désinfection", "chantier"]
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
      <div className="rounded-[28px] border border-[#dbe6fc] bg-white p-6 md:p-10">
        <div className="grid gap-4 lg:grid-cols-[1fr,auto] lg:items-end">
          <label className="block text-sm font-semibold text-[#475467]">
            Recherche dans la FAQ
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex : délai d'intervention, contrat, prix..."
              className="mt-2 w-full rounded-xl border border-[#c9d8f5] px-4 py-3 text-sm text-[#101828] focus:border-[#1e3a6e] focus:outline-none focus:ring-1 focus:ring-[#1e3a6e]"
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
                      ? "bg-[#1e3a6e] text-white"
                      : "border border-[#c9d8f5] bg-white text-[#475467] hover:border-[#1d6fe0]"
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
            <p className="rounded-xl border border-dashed border-[#c9d8f5] bg-[#f7f9fd] p-4 text-sm text-[#475467]">
              Aucun résultat pour cette recherche.
            </p>
          ) : (
            filteredFaq.map((item, index) => {
              const isOpen = index === openIndex;
              return (
                <article key={item.question} className="overflow-hidden rounded-[24px] border border-[#dbe6fc]">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span>
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#1d6fe0]">
                        {item.theme}
                      </span>
                      <span className="font-semibold text-[#101828]">{item.question}</span>
                    </span>
                    <span className="text-xl text-[#101828]" aria-hidden>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-[#dbe6fc] px-5 py-4 text-sm leading-relaxed text-[#475467]">
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

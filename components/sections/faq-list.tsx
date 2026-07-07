"use client";

import { useState } from "react";
import { faqs } from "@/lib/data";

export function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mt-10 space-y-3">
      {faqs.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article key={item.question} className="card overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span className="font-semibold text-slate-900">{item.question}</span>
              <span aria-hidden className="text-lg text-brand-700">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-slate-200 px-6 py-4 text-sm leading-relaxed text-slate-600">
                {item.answer}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

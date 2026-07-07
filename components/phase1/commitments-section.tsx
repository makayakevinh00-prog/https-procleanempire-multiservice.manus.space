"use client";

import { motion } from "framer-motion";
import { commitments } from "@/lib/content/phase1";

const icons = [
  "✓",
  "⏱",
  "🎓",
  "🧴",
  "🔍",
  "⚡",
  "🤝"
] as const;

export function CommitmentsSection() {
  return (
    <section className="section pt-0">
      <h2 className="text-3xl font-bold text-[#14213d] md:text-4xl">Nos engagements</h2>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
        Chaque engagement est pense pour garantir un service fiable, mesurable et rassurant pour
        vos equipes comme pour vos clients.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commitments.map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.28, delay: index * 0.04 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#14213d]/10 text-lg text-[#14213d]">
              {icons[index % icons.length]}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-[#14213d]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

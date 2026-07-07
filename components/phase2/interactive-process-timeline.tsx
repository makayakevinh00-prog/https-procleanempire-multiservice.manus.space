"use client";

import { motion } from "framer-motion";
import { interactiveProcessSteps } from "@/lib/content/phase2";

export function InteractiveProcessTimeline() {
  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <h2 className="text-3xl font-bold text-[#14213d] md:text-4xl">Processus interactif</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          Une timeline claire pour montrer a vos prospects comment la prestation est pilotee de
          bout en bout.
        </p>
        <div className="mt-8 space-y-4">
          {interactiveProcessSteps.map((item, index) => (
            <motion.article
              key={item.step}
              initial={{ opacity: 0, x: index % 2 === 0 ? -14 : 14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[90px,1fr]"
            >
              <p className="text-2xl font-bold text-[#c9a227]">{item.step}</p>
              <div>
                <h3 className="text-xl font-semibold text-[#14213d]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

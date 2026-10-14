"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

/** Révèle son contenu au défilement (fondu + légère montée). */
export function Reveal({
  children,
  delay = 0,
  y = 40,
  className,
  as = "div"
}: {
  children: ReactNode;
  /** « li » quand l'élément est l'enfant direct d'une liste (accessibilité). */
  as?: "div" | "li";
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </Tag>
  );
}

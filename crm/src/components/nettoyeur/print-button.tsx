"use client";

export function PrintButton() {
  return <button onClick={() => window.print()} className="h-12 rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Imprimer ou enregistrer en PDF</button>;
}

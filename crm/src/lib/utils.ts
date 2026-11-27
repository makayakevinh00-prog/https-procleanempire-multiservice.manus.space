import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const formatEUR = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === "" ? "—" : eur.format(Number(n));

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const formatHours = (h: number | null | undefined) =>
  h === null || h === undefined ? "—" : `${h.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function daysBetween(from: string | Date, to: Date = new Date()) {
  const a = typeof from === "string" ? new Date(from.length === 10 ? `${from}T12:00:00` : from) : from;
  return Math.floor((to.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Lit un nombre saisi à la main : « 1 200,50 », « 1200.5 », « 12,5 € ».
 * Avant, « 1 200,50 » devenait NaN puis 0 : la ligne passait à 0 € et le total du devis était faux sans message.
 * Renvoie null si la saisie n'est pas un nombre (à signaler, jamais à transformer en 0).
 */
export function parseDecimal(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const t = String(input ?? "").replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  if (t === "") return null;
  if (!/^-?\d*\.?\d+$/.test(t) && !/^-?\d+\.$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

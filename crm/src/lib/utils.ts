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

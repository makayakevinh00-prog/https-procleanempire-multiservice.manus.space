import { cn } from "@/lib/utils";

const PALETTE = ["bg-secondary text-foreground"];

/** Pastille d'initiales : couleur stable pour un même nom, repère visuel rapide dans les listes. */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? "?") + (words.length > 1 ? words[words.length - 1][0] : words[0]?.[1] ?? "")).toUpperCase();
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const dim = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base", xl: "h-16 w-16 text-xl" }[size];
  return <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium", dim, PALETTE[h % PALETTE.length], className)}>{initials}</span>;
}

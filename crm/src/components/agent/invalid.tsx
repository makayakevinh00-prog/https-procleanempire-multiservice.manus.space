import type { Dict } from "@/lib/field-ui";

export function Invalid({ text, t }: { text: string; t: Dict }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-extrabold">{t.invalid}</h1>
      <p className="max-w-xs text-[var(--a-mute)]">{text}</p>
    </main>
  );
}

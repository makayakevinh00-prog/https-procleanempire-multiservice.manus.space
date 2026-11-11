/** Message plein écran quand un lien est invalide, expiré ou désactivé. */
export function Gate({ text, back }: { text: string; back?: { href: string; label: string } }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-extrabold">Accès impossible</h1>
      <p className="max-w-xs text-[var(--a-mute)]">{text}</p>
      {back && <a href={back.href} className="mt-2 rounded-2xl bg-[var(--a-pri)] px-6 py-3 font-extrabold text-white">{back.label}</a>}
    </main>
  );
}

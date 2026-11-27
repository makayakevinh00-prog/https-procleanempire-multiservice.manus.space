export type Msg = { role: "nettoyeur" | "conciergerie" | "admin"; author: string | null; body: string; at: string };
const LABEL: Record<Msg["role"], string> = { nettoyeur: "Nettoyeur", conciergerie: "Conciergerie", admin: "ProClean" };

/** Fil de messages d'un ménage ; `me` = le rôle de celui qui regarde (ses messages à droite). */
export function Thread({ messages, me }: { messages: Msg[]; me: Msg["role"] }) {
  if (!messages.length) return <p className="rounded-3xl bg-[var(--a-card)] p-6 text-center text-[15px] text-[var(--a-mute)]">Aucun message pour l&apos;instant.</p>;
  return (
    <ul className="space-y-2">
      {messages.map((m, i) => {
        const mine = m.role === me;
        return (
          <li key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-[15px] ${mine ? "bg-[var(--a-pri)] text-white" : "bg-[var(--a-card)]"}`}>
              <div className={`text-[11px] font-extrabold uppercase tracking-wider ${mine ? "text-white/80" : "text-[var(--a-mute)]"}`}>{m.author ?? LABEL[m.role]} · {LABEL[m.role]}</div>
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
              <div className={`mt-0.5 text-[11px] ${mine ? "text-white/70" : "text-[var(--a-mute)]"}`}>{new Date(m.at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

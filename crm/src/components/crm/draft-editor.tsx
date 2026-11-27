"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";

interface Props {
  kind: "reponse" | "mise_en_demeure";
  generatedBy: "ia" | "modele" | "manuel";
  subject: string;
  body: string;
  to: string | null;
  /** Nom du contact réservé : la case de confirmation est alors obligatoire (règle 1). */
  reservedName?: string | null;
  save: (fd: FormData) => void | Promise<void>;
  send: (fd: FormData) => void | Promise<void>;
  dismiss: (fd: FormData) => void | Promise<void>;
}

/** Brouillon à relire : on modifie, on enregistre, ou on valide — l'envoi demande une confirmation explicite. */
export function DraftEditor({ kind, generatedBy, subject, body, to, reservedName, save, send, dismiss }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [ack, setAck] = useState(false);
  const notice = kind === "mise_en_demeure";
  return (
    <form action={save} className="space-y-3 rounded-xl border border-slate-200 border-l-4 border-l-amber-400 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <b>{notice ? "Mise en demeure préparée" : "Réponse préparée"}</b>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{generatedBy === "ia" ? "rédigée par l'IA" : generatedBy === "modele" ? "modèle" : "manuelle"}</span>
        <span className="text-slate-500">— rien n&apos;est parti. Relisez, modifiez, puis validez.</span>
      </div>
      <label className="block text-sm font-medium text-slate-700">À<Input name="to_email" type="email" defaultValue={to ?? ""} required className="mt-1" /></label>
      <label className="block text-sm font-medium text-slate-700">Objet<Input name="subject" defaultValue={subject} required className="mt-1" /></label>
      <label className="block text-sm font-medium text-slate-700">Texte<Textarea name="body" defaultValue={body} required rows={notice ? 16 : 11} className="mt-1 font-sans" /></label>
      {notice && <p className="text-xs text-slate-500">Modèle à faire relire (comptable ou conseil). Pour la valeur probante, envoyez-le aussi en recommandé avec avis de réception.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline">Enregistrer mes modifications</Button>
        <Button type="button" onClick={() => dlg.current?.showModal()}>Valider et envoyer</Button>
        <Button type="submit" variant="ghost" formAction={dismiss} formNoValidate className="text-slate-500">Écarter</Button>
      </div>
      <dialog ref={dlg} className="w-[min(92vw,28rem)] rounded-lg border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50">
        <div className="space-y-4 p-5">
          <h3 className="text-base font-semibold">{notice ? "Envoyer cette mise en demeure ?" : "Envoyer cette réponse ?"}</h3>
          <p className="text-sm text-muted-foreground">Le message part immédiatement avec le texte affiché dans le formulaire.</p>
          {reservedName && (
            <label className="flex cursor-pointer gap-2 rounded-md border-2 border-destructive bg-red-50 p-3 text-sm text-red-900">
              <input type="checkbox" name="ack_reserved" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span><b>Contact réservé : {reservedName}.</b> Je confirme expressément cet envoi.</span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dlg.current?.close()}>Annuler</Button>
            <Button type="submit" formAction={send} disabled={!!reservedName && !ack}>Oui, envoyer</Button>
          </div>
        </div>
      </dialog>
    </form>
  );
}

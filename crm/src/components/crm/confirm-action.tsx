"use client";

import { useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  hidden?: Record<string, string>;
  /** Règle 1 : contact réservé → case de confirmation explicite du patron */
  reservedName?: string | null;
  /** Règle 4 : montant HT dépassant le seuil → case de confirmation explicite */
  largeAmount?: { totalHt: string; threshold: string } | null;
  /** Case supplémentaire éventuelle (ex. « envoyer par e-mail ») */
  extra?: React.ReactNode;
  className?: string;
}

/**
 * Bouton + fenêtre de confirmation explicite. Le formulaire n'est soumis que si
 * toutes les alertes affichées ont été cochées. (Le serveur et la base re-vérifient.)
 */
export function ConfirmAction({
  action, label, title, description, confirmLabel = "Confirmer", variant = "default", size,
  hidden = {}, reservedName, largeAmount, extra, className
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reservedOk, setReservedOk] = useState(false);
  const [largeOk, setLargeOk] = useState(false);
  const blocked = (!!reservedName && !reservedOk) || (!!largeAmount && !largeOk);

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </Button>
      <dialog ref={ref} className="w-[min(92vw,30rem)] rounded-lg border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50">
        <form action={action} className="space-y-4 p-5">
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}

          {reservedName && (
            <label className="flex cursor-pointer gap-2 rounded-md border-2 border-destructive bg-red-50 p-3 text-sm text-red-900">
              <input type="checkbox" name="ack_reserved" className="mt-1" checked={reservedOk} onChange={(e) => setReservedOk(e.target.checked)} />
              <span><b>🔒 Contact réservé : {reservedName}.</b> Traitement patron uniquement. Je confirme agir moi-même, en connaissance de cause.</span>
            </label>
          )}
          {largeAmount && (
            <label className="flex cursor-pointer gap-2 rounded-md border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" name="ack_large" className="mt-1" checked={largeOk} onChange={(e) => setLargeOk(e.target.checked)} />
              <span><b>⚠️ Montant élevé : {largeAmount.totalHt} HT</b> (seuil d&apos;alerte {largeAmount.threshold}). Je confirme avoir vérifié ce montant.</span>
            </label>
          )}
          {extra}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => ref.current?.close()}>Annuler</Button>
            <Button type="submit" variant={variant === "outline" ? "default" : variant} disabled={blocked}>{confirmLabel}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

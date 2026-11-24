"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VideoCapture } from "@/components/nettoyeur/video-capture";
import { leftLabel, type StockItem } from "@/lib/domain/stock";

export type StockStatus = { kind?: string; due: boolean; last: { counted_at: string; items: StockItem[]; summary: string | null; next_due: string | null } | null } | null;
const fr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
const qty = (n: number) => String(n).replace(".", ",");

/**
 * Stock de produits : quand c'est le moment (jamais compté, ou date prévue atteinte), on demande à la personne de filmer ses produits.
 * L'IA compte ce qui reste, dit quoi racheter et dans combien de temps ; le résultat reste consultable ici.
 */
export function StockCard({ space, token, refId, status }: { space: "agent" | "nettoyeur"; token: string; refId: string; status: StockStatus }) {
  const router = useRouter();
  const [cam, setCam] = useState(false);
  const [later, setLater] = useState(false);
  if (!status) return null; // base pas encore à jour : rien ne s'affiche
  if (cam) return (
    <VideoCapture
      token={token} job={refId} kind="apres" endpoint={`/api/stock/${space}`}
      title="Filmez vos produits" lastLabel="L'IA compte le stock…"
      hint="Ouvrez le placard ou la caisse et filmez lentement chaque produit, étiquette visible. Soulevez les bidons opaques pour montrer ce qu'il reste."
      minHint="Filmez un peu plus longtemps : passez sur chaque produit (au moins 10 secondes)."
      onDone={() => { setCam(false); router.refresh(); }}
      onCancel={() => setCam(false)}
    />
  );
  const last = status.last, buy = (last?.items ?? []).filter((i) => i.buy), rest = (last?.items ?? []).filter((i) => !i.buy);
  const where = status.kind === "site" ? "du site" : "de votre matériel";
  return (
    <div className="space-y-3">
      {status.due && !later && (
        <section className="rounded-2xl border-2 border-[var(--a-pri)] p-4">
          <b className="block text-[17px]">Avant de partir : le stock de produits</b>
          <p className="mb-3 mt-1 text-[14px] text-[var(--a-mute)]">Filmez les produits {where}. L&apos;IA compte ce qui reste, dit quoi racheter et dans combien de temps.</p>
          <button type="button" onClick={() => setCam(true)} className="h-12 w-full rounded-full bg-[var(--a-pri)] text-[16px] font-extrabold text-white">● Filmer le stock</button>
          <button type="button" onClick={() => setLater(true)} className="mx-auto mt-2 block text-[13px] font-bold text-[var(--a-mute)] underline">Plus tard</button>
        </section>
      )}
      {last && (
        <details className="rounded-2xl bg-[var(--a-card)] p-4 text-[15px]" open={buy.length > 0 && !status.due}>
          <summary className="cursor-pointer font-extrabold text-[var(--a-pri)]">Stock de produits · compté le {fr(last.counted_at)}{buy.length ? ` · ${buy.length} à racheter` : ""}</summary>
          {last.summary && <p className="mt-2 text-[14px] text-[var(--a-mute)]">{last.summary}</p>}
          {buy.length > 0 && (
            <div className="mt-2 rounded-xl bg-[var(--a-warnbg)] p-3">
              <b className="block text-[var(--a-warn)]">À racheter</b>
              <ul className="mt-1 space-y-1">{buy.map((i) => <li key={i.name}><b>{i.name}</b> — reste {qty(i.left)} {i.unit} · {leftLabel(i)}</li>)}</ul>
            </div>
          )}
          {rest.length > 0 && <ul className="mt-2 space-y-1 text-[14px]">{rest.map((i) => <li key={i.name}><b>{i.name}</b> — {qty(i.left)} {i.unit} · {leftLabel(i)}</li>)}</ul>}
          {last.next_due && <p className="mt-2 text-[13px] text-[var(--a-mute)]">Prochain comptage : vers le {fr(last.next_due)}.</p>}
          {!status.due && <button type="button" onClick={() => setCam(true)} className="mt-2 text-[13px] font-bold text-[var(--a-pri)] underline">Recompter maintenant</button>}
        </details>
      )}
    </div>
  );
}

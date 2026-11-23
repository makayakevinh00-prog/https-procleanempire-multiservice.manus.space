"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanerAvatarAction } from "@/app/actions/nettoyeur";

/** Recadre au carré et réduit à 320 px dans le téléphone : seule une petite image part vers le serveur. */
async function square(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error("Photo illisible.")); i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas");
    c.width = c.height = 320;
    c.getContext("2d")!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 320, 320);
    const blob = await new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("Photo illisible."))), "image/jpeg", 0.82));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  } finally { URL.revokeObjectURL(url); }
}

export function AvatarPicker({ token, initials, current }: { token: string; initials: string; current: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [src, setSrc] = useState(current ? `data:image/jpeg;base64,${current}` : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const save = async (b64: string) => {
    setBusy(true); setMsg("");
    const r = await cleanerAvatarAction(token, b64);
    setBusy(false);
    if (!r.ok) { setMsg(r.error ?? "Photo non enregistrée."); return false; }
    router.refresh();
    return true;
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try { const b64 = await square(f); if (await save(b64)) setSrc(`data:image/jpeg;base64,${b64}`); }
    catch (e) { setMsg((e as Error).message); }
    if (input.current) input.current.value = "";
  };
  return (
    <div className="mx-auto w-fit text-center">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="Changer ma photo" className="relative block h-24 w-24 overflow-hidden rounded-full border-4 border-[var(--a-soft)] bg-[var(--a-card)] text-[34px] font-extrabold text-[var(--a-pri)]">
        {src ? <img src={src} alt="Ma photo" className="h-full w-full object-cover" /> : initials}
        <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[11px] font-bold text-white">{busy ? "…" : "Modifier"}</span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      <div className="mt-2 flex justify-center gap-4 text-[13px] font-extrabold">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="text-[var(--a-pri)]">{src ? "Changer la photo" : "Ajouter ma photo"}</button>
        {src && <button type="button" disabled={busy} onClick={async () => { if (await save("")) setSrc(""); }} className="text-[var(--a-mute)]">Retirer</button>}
      </div>
      {msg && <p role="alert" className="mt-1 text-[13px] font-semibold text-[var(--a-bad)]">{msg}</p>}
    </div>
  );
}

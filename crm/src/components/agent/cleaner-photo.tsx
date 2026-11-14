"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

/** Réduit la photo sur le téléphone (1280 px, JPEG) avant envoi : rapide, léger, sous la limite du serveur. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error("Photo illisible"))), "image/jpeg", 0.72));
}

/** Bouton photo du nettoyeur : avant ou après le ménage. Plusieurs photos possibles ; le compteur vient du serveur. */
export function CleanerPhotoButton({ token, job, kind, label, count, room, compact }: { token: string; job: string; kind: "avant" | "apres"; label: string; count: number; room?: string; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function onFile(f: File | undefined) {
    if (!f) return;
    setState("busy"); setMsg("");
    try {
      const fd = new FormData();
      fd.set("token", token); fd.set("job", job); fd.set("kind", kind); if (room) fd.set("room", room); fd.set("file", await shrink(f), "photo.jpg");
      const r = await fetch("/api/nettoyeur/photo", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Envoi impossible.");
      setState("idle"); router.refresh();
    } catch (e: any) { setState("error"); setMsg(e.message ?? "Envoi impossible, réessayez."); }
    finally { if (input.current) input.current.value = ""; }
  }
  return (
    <div>
      <button type="button" disabled={state === "busy"} onClick={() => input.current?.click()} className={compact ? `flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border-2 text-[14px] font-extrabold active:opacity-80 disabled:opacity-60 ${count > 0 ? "border-[var(--a-ok)] bg-[var(--a-okbg)] text-[var(--a-ok)]" : "border-[var(--a-line)] bg-[var(--a-bg)] text-[var(--a-ink)]"}` : "flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--a-line)] bg-[var(--a-bg)] text-[16px] font-extrabold text-[var(--a-ink)] active:opacity-80 disabled:opacity-60"}>
        <Camera className={compact ? "h-4 w-4" : "h-5 w-5"} /> {state === "busy" ? "Envoi…" : label}{count > 0 ? (compact ? ` ✓${count > 1 ? ` ${count}` : ""}` : ` (${count})`) : ""}
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && <p role="alert" className="mt-1 text-sm font-semibold text-[var(--a-bad)]">{msg}</p>}
    </div>
  );
}

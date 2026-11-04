"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

/** Réduit la photo sur le téléphone (1280 px, JPEG) avant envoi : rapide, léger, et sous la limite du serveur. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error("Photo illisible"))), "image/jpeg", 0.72));
}

export function PhotoButton({ token, mission, kind, label }: { token: string; mission: string; kind: "avant" | "apres" | "anomalie"; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onFile(f: File | undefined) {
    if (!f) return;
    setState("busy"); setMsg("");
    try {
      const blob = await shrink(f);
      const fd = new FormData();
      fd.set("token", token); fd.set("mission", mission); fd.set("kind", kind); fd.set("file", blob, "photo.jpg");
      const r = await fetch("/api/agent/photo", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Envoi impossible.");
      setState("ok"); setMsg("Photo envoyée ✓");
      router.refresh();
    } catch (e: any) {
      setState("error"); setMsg(e.message ?? "Envoi impossible, réessayez.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <button type="button" disabled={state === "busy"} onClick={() => input.current?.click()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white text-base font-semibold text-slate-800 active:bg-slate-100 disabled:opacity-60">
        <Camera className="h-5 w-5" /> {state === "busy" ? "Envoi…" : label}
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && <p role={state === "error" ? "alert" : "status"} className={`mt-1 text-sm ${state === "error" ? "text-red-700" : "text-emerald-700"}`}>{msg}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/** Photo du nettoyeur par-dessus ses initiales : chargée à part et gardée en cache ; sans photo, les initiales restent. */
export function AvatarImg({ token, base = "nettoyeur" }: { token: string; base?: "nettoyeur" | "agent" }) {
  const [v, setV] = useState("");
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try { setV(localStorage.getItem("pce:photo:v") ?? "0"); } catch { setV("0"); }
  }, []);
  if (!v) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/${base}/${token}/photo?v=${v}`} alt="" onLoad={() => setOk(true)} onError={() => setOk(false)} className={`absolute inset-0 h-full w-full rounded-full object-cover ${ok ? "" : "hidden"}`} />;
}

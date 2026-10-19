"use client";

import { useEffect } from "react";
import { captureLeadSource } from "@/lib/lead-source";

/** Mémorise l'origine du visiteur pour l'attacher à sa future demande de devis. */
export function SourceTracker() {
  useEffect(() => {
    captureLeadSource();
  }, []);
  return null;
}

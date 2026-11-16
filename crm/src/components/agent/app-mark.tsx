"use client";
import { useEffect } from "react";
import { agentMarkAppAction } from "@/app/actions/agent";

/** Note que l'application a été ouverte, et si elle l'a été depuis l'écran d'accueil du téléphone (= installée) : les rappels par e-mail s'arrêtent alors. */
export function AppMark({ token }: { token: string }) {
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    void agentMarkAppAction(token, !!standalone).catch(() => undefined);
  }, [token]);
  return null;
}

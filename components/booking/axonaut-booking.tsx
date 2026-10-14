"use client";

import { useEffect, useRef } from "react";

export const AXONAUT_BOOKING_URL =
  "https://axonaut.com/public/booking/cc8f49/pageShow/procleanempire-7962cc";

export function AxonautBooking() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://axonaut.com") return;
      const data = event.data as { type?: string; height?: number } | null;
      if (!data || data.type !== "axonaut:resize" || !data.height) return;
      if (frameRef.current && frameRef.current.contentWindow === event.source) {
        frameRef.current.style.height = `${data.height}px`;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={frameRef}
      src={AXONAUT_BOOKING_URL}
      title="Prendre rendez-vous avec ProClean Empire"
      width="100%"
      height="700"
      loading="lazy"
      style={{ border: "none", borderRadius: 12 }}
    />
  );
}

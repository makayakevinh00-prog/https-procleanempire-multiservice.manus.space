"use client";

import { useEffect, useState } from "react";
import { HeroConversion } from "@/components/phase1/hero-conversion";
import { PartnersMarquee } from "@/components/phase1/partners-marquee";
import {
  PresentationVideoModal,
  PresentationVideoSection
} from "@/components/phase1/presentation-video-section";
import { ReviewsPremiumSection } from "@/components/phase1/reviews-premium-section";
import { CommitmentsSection } from "@/components/phase1/commitments-section";
import { ContactPhase1Section } from "@/components/phase1/contact-phase1-section";

export function HomeConversionPhase1() {
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setVideoOpen(false);
      }
    }

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <>
      <HeroConversion onOpenVideo={() => setVideoOpen(true)} />
      <PartnersMarquee />
      <PresentationVideoSection onOpenVideo={() => setVideoOpen(true)} />
      <ReviewsPremiumSection />
      <CommitmentsSection />
      <ContactPhase1Section />
      <PresentationVideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </>
  );
}

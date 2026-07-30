import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, company, fontFamily, headline } from "../brand";
import { useLayout } from "../layout";
import { Logo } from "../components/Logo";

/**
 * A single static frame — no time-based animation — so it renders correctly as
 * a still for video thumbnails and Open Graph images.
 */
export const SocialCard: React.FC = () => {
  const { u } = useLayout();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.brand900,
        backgroundImage: `radial-gradient(circle at 18% 20%, ${colors.brand500} 0%, transparent 60%), radial-gradient(circle at 88% 85%, rgba(201, 162, 39, 0.25) 0%, transparent 55%)`,
        justifyContent: "center",
        padding: u(9),
        fontFamily,
      }}
    >
      <Logo height={13} style={{ alignSelf: "flex-start" }} />
      <div
        style={{
          width: u(20),
          height: Math.max(3, u(0.7)),
          backgroundColor: colors.accent500,
          marginTop: u(4),
          marginBottom: u(4),
        }}
      />
      <div
        style={{
          color: colors.white,
          fontSize: u(6.5),
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: u(88),
        }}
      >
        {headline.title}
      </div>
      <div
        style={{
          color: colors.brand100,
          fontSize: u(3.2),
          marginTop: u(3.5),
        }}
      >
        {company.zone} · Devis sous 24h · {company.phone}
      </div>
    </AbsoluteFill>
  );
};

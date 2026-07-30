import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { company } from "../../brand";
import { Logo } from "../../components/Logo";
import { DecoDivider, Letterbox, Sunburst } from "../Deco";
import { GoldShimmer, LetterReveal } from "../Kinetic";
import { script } from "../script";
import { beat, gold, ink, sans } from "../theme";

const PLATE = beat(3);

/** Hauteur des bandes noires cinéma, en haut comme en bas. */
const BAR = 300;

/**
 * Photo en bandes cinéma, avec un lent rapprochement. Les bandes noires
 * cadrent l'image et signalent « film », pas « diaporama ».
 */
const Plate: React.FC<{ src: string; label: string; index: number }> = ({
  src,
  label,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoom = interpolate(frame, [0, PLATE], [1.12, 1.24]);
  const drift = interpolate(frame, [0, PLATE], [0, index % 2 === 0 ? -30 : 30]);
  const fade = interpolate(frame, [0, 10, PLATE - 8, PLATE], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelEntry = spring({
    frame: frame - 8,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ opacity: fade, backgroundColor: ink.black }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom}) translateX(${drift}px)`,
          filter: "saturate(0.85) contrast(1.08)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(5,7,13,0.55) 0%, transparent 30%, transparent 65%, rgba(5,7,13,0.85) 100%)`,
        }}
      />
      <Letterbox height={BAR} />

      {/* Le libellé est posé dans la bande noire : contraste garanti quelle que
          soit la photo, et l'effet « carton de film » vient tout seul. */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: BAR,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: sans,
          fontSize: 40,
          letterSpacing: 16,
          textTransform: "uppercase",
          color: gold.light,
          opacity: labelEntry,
          transform: `translateY(${interpolate(labelEntry, [0, 1], [18, 0])}px)`,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

export const Showcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: ink.black }}>
    {script.showcase.map((plate, index) => (
      <Sequence key={plate.src} from={index * PLATE} durationInFrames={PLATE}>
        <Plate src={plate.src} label={plate.label} index={index} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

/**
 * Final : l'éventail s'ouvre en grand, la marque revient gravée, l'appel à
 * l'action reste court. On termine sur le noir pour que la boucle reparte net.
 */
export const Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const rays = interpolate(frame, [0, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const divider = interpolate(frame, [50, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cta = spring({
    frame: frame - 62,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: ink.black,
        backgroundImage: `radial-gradient(ellipse at 50% 45%, #16233f 0%, ${ink.black} 72%)`,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        opacity: fadeOut,
      }}
    >
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", opacity: 0.32 }}
      >
        <Sunburst progress={rays} size={1700} rays={40} opacity={0.6} />
      </AbsoluteFill>

      <div style={{ zIndex: 1, paddingLeft: 90, paddingRight: 90 }}>
        <Logo height={11} style={{ marginBottom: 44 }} />

        <GoldShimmer delay={40} duration={46}>
          <LetterReveal text={script.brand} fontSize={84} delay={8} />
        </GoldShimmer>

        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <DecoDivider width={380} progress={divider} />
        </div>

        <div
          style={{
            fontFamily: sans,
            fontSize: 54,
            fontWeight: 700,
            color: ink.white,
            opacity: cta,
            transform: `translateY(${interpolate(cta, [0, 1], [24, 0])}px)`,
          }}
        >
          {script.finale.line}
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: sans,
            fontSize: 34,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: gold.base,
            opacity: cta,
          }}
        >
          {script.finale.delay} · {company.website}
        </div>
      </div>
    </AbsoluteFill>
  );
};

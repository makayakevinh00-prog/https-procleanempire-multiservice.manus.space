import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, company, fontFamily } from "../brand";
import { endCard, hook } from "./edit";
import { SAFE } from "./safeZones";

/**
 * Accroche de la première seconde. C'est le seul élément qui décide si la vidéo
 * est regardée : elle arrive immédiatement, en gros, et disparaît avant que le
 * spectateur ait le temps de s'ennuyer.
 */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entry = spring({
    frame,
    fps,
    config: { damping: 11, mass: 0.5 },
    durationInFrames: 14,
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: SAFE.left,
        paddingRight: SAFE.right,
        opacity: exit,
        fontFamily,
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(entry, [0, 1], [0.7, 1])}) rotate(-3deg)`,
          backgroundColor: colors.accent500,
          color: colors.brand900,
          // 74px : le mot le plus long tient dans la largeur utile (1080 moins
          // les zones de sécurité), sinon il déborde du cartouche.
          fontSize: 74,
          fontWeight: 900,
          lineHeight: 1.05,
          textTransform: "uppercase",
          padding: "26px 34px",
          borderRadius: 18,
          textAlign: "center",
          maxWidth: "100%",
          overflowWrap: "break-word",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        {hook.line1}
        <br />
        {hook.line2}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Barre de progression : montrer au spectateur que la vidéo est courte réduit
 * nettement l'abandon dans les premières secondes.
 */
export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top - 40,
        left: SAFE.left,
        right: SAFE.left,
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.25)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          backgroundColor: colors.accent500,
        }}
      />
    </div>
  );
};

/**
 * Carte de fin volontairement courte : sur TikTok, un long écran de marque
 * casse la boucle et fait chuter le taux de replay.
 */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame,
    fps,
    config: { damping: 13, mass: 0.5 },
    durationInFrames: 16,
  });
  // Fondu vers le noir sur la fin pour que la boucle reparte proprement.
  const fadeOut = interpolate(
    frame,
    [endCard.durationInFrames - 12, endCard.durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.brand900,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingLeft: SAFE.left,
        paddingRight: SAFE.right,
        paddingBottom: SAFE.bottom,
        fontFamily,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          color: colors.white,
          fontSize: 96,
          fontWeight: 900,
          textTransform: "uppercase",
          opacity: entry,
          transform: `translateY(${interpolate(entry, [0, 1], [40, 0])}px)`,
        }}
      >
        {endCard.line}
      </div>
      <div
        style={{
          marginTop: 28,
          color: colors.accent500,
          fontSize: 52,
          fontWeight: 700,
          opacity: entry,
        }}
      >
        {company.website}
      </div>
    </AbsoluteFill>
  );
};

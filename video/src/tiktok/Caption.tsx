import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fontFamily } from "../brand";

/**
 * Sous-titres incrustés mot par mot : ~85 % des vues TikTok démarrent sans le
 * son, donc le texte doit porter le message seul. Le mot en cours est mis en
 * avant (style "karaoké") pour garder l'œil accroché.
 */
export const Caption: React.FC<{ text: string; durationInFrames: number }> = ({
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ").filter(Boolean);

  if (words.length === 0) {
    return null;
  }

  const perWord = durationInFrames / words.length;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 18px",
        fontFamily,
        fontSize: 76,
        fontWeight: 800,
        lineHeight: 1.2,
        textTransform: "uppercase",
        textAlign: "center",
      }}
    >
      {words.map((word, index) => {
        const start = index * perWord;
        const entry = spring({
          frame: frame - start,
          fps,
          config: { damping: 12, mass: 0.4 },
          durationInFrames: 12,
        });
        const isActive = frame >= start && frame < start + perWord;

        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              opacity: entry,
              transform: `scale(${interpolate(entry, [0, 1], [0.6, 1])})`,
              color: isActive ? colors.accent500 : colors.white,
              // Contour épais : lisible sur n'importe quelle image.
              textShadow:
                "0 0 6px rgba(0,0,0,0.9), 4px 4px 0 rgba(0,0,0,0.85), -3px -3px 0 rgba(0,0,0,0.85), 3px -3px 0 rgba(0,0,0,0.85), -3px 3px 0 rgba(0,0,0,0.85)",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

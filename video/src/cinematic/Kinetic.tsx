import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { goldTextStyle, ink, serif } from "./theme";

/**
 * Titre révélé lettre par lettre. Chaque lettre monte et se déflouten décalé :
 * l'œil suit le mot en train de s'écrire au lieu de lire un bloc déjà posé.
 */
export const LetterReveal: React.FC<{
  text: string;
  fontSize: number;
  delay?: number;
  letterSpacing?: number;
  gold?: boolean;
  stagger?: number;
}> = ({
  text,
  fontSize,
  delay = 0,
  letterSpacing = 0.18,
  gold = true,
  stagger = 2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  // Index global de la lettre, pour que le décalage continue d'un mot à l'autre.
  let letterIndex = -1;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: `0 ${fontSize * 0.34}px`,
        fontFamily: serif,
        fontSize,
        fontWeight: 700,
        letterSpacing: fontSize * letterSpacing,
        textTransform: "uppercase",
        lineHeight: 1.1,
      }}
    >
      {words.map((word, wordIndex) => (
        // Les lettres d'un même mot ne se séparent jamais : le retour à la
        // ligne ne peut tomber qu'entre deux mots.
        <span
          key={`${word}-${wordIndex}`}
          style={{
            display: "inline-flex",
            whiteSpace: "nowrap",
            // Compense l'espacement après la dernière lettre du mot.
            marginRight: -fontSize * letterSpacing,
          }}
        >
          {word.split("").map((char, index) => {
            letterIndex += 1;
            const entry = spring({
              frame: frame - delay - letterIndex * stagger,
              fps,
              config: { damping: 200 },
              durationInFrames: 22,
            });

            return (
              <span
                key={`${char}-${index}`}
                style={{
                  display: "inline-block",
                  opacity: entry,
                  transform: `translateY(${interpolate(entry, [0, 1], [26, 0])}px)`,
                  filter: `blur(${interpolate(entry, [0, 1], [8, 0])}px)`,
                  ...(gold ? goldTextStyle : { color: ink.white }),
                }}
              >
                {char}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

/**
 * Reflet doré qui balaie un texte, comme une lumière sur du métal gravé.
 * À utiliser une fois par scène : c'est un accent, pas un effet permanent.
 */
export const GoldShimmer: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}> = ({ children, delay = 0, duration = 40 }) => {
  const frame = useCurrentFrame();
  const position = interpolate(frame - delay, [0, duration], [-140, 240], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(105deg, transparent ${position - 18}%, rgba(255,255,255,0.85) ${position}%, transparent ${position + 18}%)`,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/**
 * Phrase révélée mot par mot. Sert aux écrans « une idée à la fois » : le texte
 * arrive au rythme de la lecture, pas d'un coup.
 */
export const WordReveal: React.FC<{
  text: string;
  fontSize: number;
  delay?: number;
  color?: string;
  weight?: number;
  stagger?: number;
}> = ({
  text,
  fontSize,
  delay = 0,
  color = ink.white,
  weight = 400,
  stagger = 4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${fontSize * 0.28}px`,
        fontFamily: serif,
        fontSize,
        fontWeight: weight,
        color,
        lineHeight: 1.25,
        textAlign: "center",
      }}
    >
      {text.split(" ").map((word, index) => {
        const entry = spring({
          frame: frame - delay - index * stagger,
          fps,
          config: { damping: 200 },
          durationInFrames: 26,
        });

        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              opacity: entry,
              transform: `translateY(${interpolate(entry, [0, 1], [30, 0])}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

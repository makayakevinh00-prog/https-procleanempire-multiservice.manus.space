import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DecoDivider, DecoFrame, Sunburst } from "../Deco";
import { GoldShimmer, LetterReveal, WordReveal } from "../Kinetic";
import { script } from "../script";
import { gold, ink, sans } from "../theme";

/**
 * Ouverture : noir, puis une seule ligne de texte. Rien d'autre à regarder,
 * donc rien d'autre à lire. L'accroche doit tomber dans la première seconde.
 */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const rays = interpolate(frame, [10, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Fondu au noir sur la fin : la coupe vers le titre doit être franche.
  const exit = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: ink.black,
        justifyContent: "center",
        alignItems: "center",
        opacity: exit,
      }}
    >
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", opacity: 0.35 }}
      >
        <Sunburst progress={rays} size={1500} opacity={0.6} />
      </AbsoluteFill>

      <div style={{ paddingLeft: 90, paddingRight: 90, zIndex: 1 }}>
        <WordReveal
          text={script.hook}
          fontSize={92}
          delay={6}
          color={ink.white}
          weight={700}
          stagger={3}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Carte de titre : le nom se grave lettre par lettre dans un cadre art déco,
 * puis un reflet doré passe dessus. C'est le moment « marque ».
 */
export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const frameDraw = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const divider = interpolate(frame, [40, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Très léger rapprochement : l'image ne doit jamais être totalement fixe.
  const push = interpolate(frame, [0, durationInFrames], [1, 1.05]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: ink.navy,
        backgroundImage: `radial-gradient(ellipse at 50% 35%, #16233f 0%, ${ink.black} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        opacity: exit,
        transform: `scale(${push})`,
      }}
    >
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", opacity: 0.28 }}
      >
        <Sunburst progress={1} size={1300} rays={36} opacity={0.5} />
      </AbsoluteFill>

      <DecoFrame progress={frameDraw} inset={70} />

      <div
        style={{
          zIndex: 1,
          paddingLeft: 110,
          paddingRight: 110,
          textAlign: "center",
        }}
      >
        <GoldShimmer delay={46} duration={44}>
          <LetterReveal text={script.brand} fontSize={104} delay={12} />
        </GoldShimmer>

        <div style={{ marginTop: 26, marginBottom: 26 }}>
          <DecoDivider width={420} progress={divider} />
        </div>

        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            letterSpacing: 12,
            textTransform: "uppercase",
            color: gold.base,
            opacity: divider,
          }}
        >
          {script.subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

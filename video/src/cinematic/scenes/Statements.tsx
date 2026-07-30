import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DecoDivider, Sunburst } from "../Deco";
import { WordReveal } from "../Kinetic";
import { script } from "../script";
import { beat, gold, goldTextStyle, ink, sans, serif } from "../theme";

const STATEMENT = beat(5);

/** Un écran, une phrase. Le vide autour du texte fait la moitié du travail. */
const Statement: React.FC<{ text: string; index: number }> = ({
  text,
  index,
}) => {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [STATEMENT - 12, STATEMENT], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const push = interpolate(frame, [0, STATEMENT], [1.06, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 100,
        paddingRight: 100,
        opacity: exit,
        transform: `scale(${push})`,
      }}
    >
      <WordReveal
        text={text}
        fontSize={index === 2 ? 82 : 94}
        color={index === 2 ? gold.light : ink.white}
        weight={index === 2 ? 700 : 400}
        stagger={3}
      />
    </AbsoluteFill>
  );
};

export const Manifesto: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: ink.black }}>
    {script.manifesto.map((line, index) => (
      <Sequence
        key={line}
        from={index * STATEMENT}
        durationInFrames={STATEMENT}
      >
        <Statement text={line} index={index} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const PROOF = beat(4);

/** Un chiffre plein écran, en doré. Trois d'affilée, sur le tempo. */
const ProofCard: React.FC<{ value: string; label: string }> = ({
  value,
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });
  const exit = interpolate(frame, [PROOF - 10, PROOF], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const divider = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 90,
        paddingRight: 90,
        textAlign: "center",
        opacity: exit,
      }}
    >
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", opacity: 0.2 }}
      >
        <Sunburst progress={entry} size={1100} rays={30} opacity={0.55} />
      </AbsoluteFill>

      <div
        style={{
          zIndex: 1,
          fontFamily: serif,
          fontSize: 230,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: 6,
          opacity: entry,
          transform: `scale(${interpolate(entry, [0, 1], [0.82, 1])})`,
          ...goldTextStyle,
        }}
      >
        {value}
      </div>

      <div style={{ zIndex: 1, marginTop: 18, marginBottom: 18 }}>
        <DecoDivider width={340} progress={divider} />
      </div>

      <div
        style={{
          zIndex: 1,
          fontFamily: sans,
          fontSize: 36,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: ink.white,
          opacity: divider,
          maxWidth: 760,
          lineHeight: 1.45,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

export const Proof: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: ink.black }}>
    {script.proof.map((item, index) => (
      <Sequence key={item.value} from={index * PROOF} durationInFrames={PROOF}>
        <ProofCard value={item.value} label={item.label} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

/**
 * Liste des métiers, un par temps. Le rythme rapide dit « on couvre tout »
 * sans avoir à l'écrire.
 */
export const Services: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
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
      {script.services.map((service, index) => {
        const entry = spring({
          frame: frame - index * beat(0.5),
          fps,
          config: { damping: 200 },
          durationInFrames: 18,
        });

        return (
          <div
            key={service}
            style={{
              fontFamily: serif,
              fontSize: 76,
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: 10,
              lineHeight: 1.55,
              opacity: entry,
              transform: `translateX(${interpolate(entry, [0, 1], [index % 2 === 0 ? -60 : 60, 0])}px)`,
              ...(index % 2 === 0 ? goldTextStyle : { color: ink.white }),
            }}
          >
            {service}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { endCard, music, shots } from "./edit";
import { Shot } from "./Shot";
import { Caption } from "./Caption";
import { EndCard, Hook, ProgressBar } from "./Overlays";
import { SAFE } from "./safeZones";

/** Durée totale : tous les plans bout à bout, plus la carte de fin. */
export const TIKTOK_DURATION =
  shots.reduce((total, shot) => total + shot.durationInFrames, 0) +
  endCard.durationInFrames;

/** Image de départ de chaque plan dans le montage. */
const offsets = shots.reduce<number[]>((acc, shot, index) => {
  acc.push(index === 0 ? 0 : acc[index - 1] + shots[index - 1].durationInFrames);
  return acc;
}, []);

/**
 * Flash blanc très bref sur chaque coupe. Le changement brutal de luminosité
 * relance l'attention et masque la transition entre deux rushes qui n'ont ni la
 * même lumière ni le même cadrage.
 */
const CutFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 3], [0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", opacity }} />
  );
};

export const TikTokEdit: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {shots.map((shot, index) => (
        <Sequence
          key={`${shot.src}-${index}`}
          from={offsets[index]}
          durationInFrames={shot.durationInFrames}
        >
          <Shot shot={shot} />

          {/* Les sous-titres restent au-dessus de l'interface TikTok. */}
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              paddingBottom: SAFE.bottom,
              paddingLeft: SAFE.left,
              paddingRight: SAFE.right,
            }}
          >
            <Caption
              text={shot.caption}
              durationInFrames={shot.durationInFrames}
            />
          </AbsoluteFill>

          {index > 0 ? <CutFlash /> : null}
        </Sequence>
      ))}

      {/* L'accroche couvre exactement le premier plan : elle porte seule le
          message de la première seconde, sans se disputer l'écran avec un
          sous-titre (le premier plan a donc une légende vide). */}
      <Sequence durationInFrames={shots[0].durationInFrames}>
        <Hook />
      </Sequence>

      <Sequence
        from={TIKTOK_DURATION - endCard.durationInFrames}
        durationInFrames={endCard.durationInFrames}
      >
        <EndCard />
      </Sequence>

      <ProgressBar />

      {music.src === null ? null : (
        <Audio
          src={staticFile(music.src)}
          // Fondu d'entrée court, fondu de sortie sur la carte de fin, pour que
          // la boucle ne coupe pas net sur un accord.
          volume={(f) =>
            interpolate(
              f,
              [0, 12, TIKTOK_DURATION - 20, TIKTOK_DURATION],
              [0, music.volume, music.volume, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          }
        />
      )}
    </AbsoluteFill>
  );
};

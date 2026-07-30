import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontFamily, media } from "../brand";
import { useLayout } from "../layout";
import { riseIn, sceneFade } from "../components/animations";

/**
 * One full-bleed photo with a slow Ken Burns push. Slides only fade *in*: the
 * previous slide stays mounted underneath during the overlap, so the cut never
 * dips to black.
 */
const Slide: React.FC<{ src: string; caption: string; fadeIn: number }> = ({
  src,
  caption,
  fadeIn,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const { u } = useLayout();
  const zoom = interpolate(frame, [0, durationInFrames], [1.06, 1.16]);

  return (
    <AbsoluteFill
      style={{
        opacity:
          fadeIn === 0
            ? 1
            : interpolate(frame, [0, fadeIn], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom})`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to top, ${colors.brand900} 4%, rgba(11, 19, 38, 0.15) 55%, rgba(11, 19, 38, 0.55) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: u(7),
          fontFamily,
        }}
      >
        <div
          style={{
            ...riseIn({ frame, fps, delay: 8, distance: 24 }),
            color: colors.white,
            fontSize: u(4),
            fontWeight: 600,
            borderLeft: `${Math.max(3, u(0.6))}px solid ${colors.accent500}`,
            paddingLeft: u(3),
          }}
        >
          {caption}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const captions = [
  "Aéronautique : intérieurs et cockpits",
  "Textiles et mobilier remis à neuf",
  "Logements courte durée prêts à louer",
  "Automobile : finition premium",
];

/** Frames during which two consecutive slides are both on screen. */
const CROSSFADE = 14;

export const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const count = media.showcase.length;
  const step = Math.floor(durationInFrames / count);

  return (
    <AbsoluteFill
      style={{ opacity: sceneFade({ frame, durationInFrames, fadeIn: 8 }) }}
    >
      {media.showcase.map((src, index) => {
        const from = index * step;
        const isLast = index === count - 1;

        return (
          <Sequence
            key={src}
            from={from}
            durationInFrames={
              isLast ? durationInFrames - from : step + CROSSFADE
            }
          >
            <Slide
              src={src}
              caption={captions[index] ?? ""}
              fadeIn={index === 0 ? 0 : CROSSFADE}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

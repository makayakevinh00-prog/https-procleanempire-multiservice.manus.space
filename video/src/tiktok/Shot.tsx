import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { Shot as ShotConfig } from "./edit";

/**
 * Un plan du montage.
 *
 * Deux techniques classiques du format vertical :
 * - un rush horizontal est posé sur une copie de lui-même agrandie et floutée,
 *   ce qui remplit le 9:16 sans bandes noires ni recadrage destructeur ;
 * - un léger zoom permanent (« punch in ») évite l'image figée, qui est ce qui
 *   fait décrocher le spectateur.
 */
export const Shot: React.FC<{ shot: ShotConfig }> = ({ shot }) => {
  const frame = useCurrentFrame();

  const scale =
    shot.zoom === "in"
      ? interpolate(frame, [0, shot.durationInFrames], [1, 1.14])
      : interpolate(frame, [0, shot.durationInFrames], [1.14, 1]);

  const src = staticFile(shot.src);
  const trimAfter = shot.trimBefore + shot.durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {shot.vertical ? null : (
        <AbsoluteFill>
          <OffthreadVideo
            src={src}
            trimBefore={shot.trimBefore}
            trimAfter={trimAfter}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(40px) brightness(0.55)",
              transform: "scale(1.3)",
            }}
          />
        </AbsoluteFill>
      )}

      <AbsoluteFill
        style={{
          justifyContent: "center",
          transform: `scale(${scale})`,
        }}
      >
        <OffthreadVideo
          src={src}
          trimBefore={shot.trimBefore}
          trimAfter={trimAfter}
          muted={!shot.sound}
          style={{
            width: "100%",
            height: shot.vertical ? "100%" : "auto",
            objectFit: shot.vertical ? "cover" : "contain",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

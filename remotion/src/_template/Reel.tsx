import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Files:  staticFile(`${project}/x.mp4`)  -> input/<project>/x.mp4
//         staticFile("general/music/x.mp3") -> input/general/music/x.mp3
export type ReelProps = {
  project: string;
  title: string;
  subtitle: string;
  clip?: string; // file in input/<project>/, e.g. "clip.mp4"
  music?: string; // path under input/, e.g. "general/music/track.mp3"
};

export const Reel: React.FC<ReelProps> = ({ project, title, subtitle, clip, music }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Remotion-native animation: pure functions of the frame number
  const zoom = interpolate(frame, [0, durationInFrames], [1.15, 1]);
  const pop = spring({ frame: frame - 9, fps, config: { damping: 14 } });

  // GSAP inside Remotion: build a PAUSED timeline once, then seek it to the
  // current frame's time on every frame. Never let GSAP play on its own clock.
  const subRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  useLayoutEffect(() => {
    if (!tl.current) {
      tl.current = gsap
        .timeline({ paused: true })
        .fromTo(subRef.current, { y: 40, opacity: 0, letterSpacing: "0.3em" },
          { y: 0, opacity: 0.85, letterSpacing: "0em", duration: 0.8, ease: "power3.out" }, 0.6)
        .to(subRef.current, { opacity: 0, duration: 0.4 }, durationInFrames / fps - 0.6);
    }
    tl.current.seek(frame / fps);
  }, [frame, fps, durationInFrames]);
  useLayoutEffect(() => () => { tl.current?.kill(); }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0f", fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`,
        background: "radial-gradient(circle at 30% 20%, #2a2a3a, #0b0b0f 70%)" }}>
        {clip ? (
          <OffthreadVideo src={staticFile(`${project}/${clip}`)} muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
      </AbsoluteFill>
      {music ? <Audio src={staticFile(music)} volume={0.4} /> : null}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.75))" }} />
      <div
        style={{
          position: "absolute", left: 80, right: 80, bottom: 360,
          color: "white", fontSize: 120, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.03em",
          transform: `translateY(${(1 - pop) * 80}px)`, opacity: pop,
        }}
      >
        {title}
      </div>
      <div ref={subRef} style={{ position: "absolute", left: 80, bottom: 260, color: "white", fontSize: 44, opacity: 0 }}>
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

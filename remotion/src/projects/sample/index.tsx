import { Composition } from "remotion";
import { Reel } from "./Reel";

// Project: sample  — render with:  ./scripts/render.sh sample remotion
export default function Project() {
  return (
    <Composition
      id="sample"
      component={Reel}
      durationInFrames={180} // 6s at 30fps
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        project: "sample",
        title: "Your reel title",
        subtitle: "Made with Remotion + GSAP",
        clip: "clip.mp4",                       // from input/sample/
        // music: "general/music/track.mp3",    // from input/general/
      }}
    />
  );
}

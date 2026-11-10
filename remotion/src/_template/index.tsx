import { Composition } from "remotion";
import { Reel } from "./Reel";

// Project: __PROJECT__  — render with:  ./scripts/render.sh __PROJECT__ remotion
export default function Project() {
  return (
    <Composition
      id="__PROJECT__"
      component={Reel}
      durationInFrames={180} // 6s at 30fps
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        project: "__PROJECT__",
        title: "__PROJECT__",
        subtitle: "New reel",
        // clip: "my-clip.mp4",                 // from input/__PROJECT__/
        // music: "general/music/track.mp3",    // from input/general/
      }}
    />
  );
}

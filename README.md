# vfx — code-based video editor

Two rendering engines + GSAP for motion + FFmpeg for the heavy lifting on raw footage.
Everything is per project, and reels are 1080×1920 (9:16) by default.

```
vfx/
├── setup.sh                     # one-time install (FFmpeg, Node 22, both engines, render browsers)
├── .env                         # ElevenLabs API key + default voice
├── input/
│   ├── general/                 # shared default resources for EVERY project
│   │   ├── music/  sfx/  fonts/  logos/  overlays/  voice/
│   │   └── my different reactions/ …   (add any folders you like)
│   └── <project>/               # that project's footage, music, images
├── output/
│   └── <project>/               # renders: <project>-hf-20261109-1230.mp4, <project>-remotion-….mp4
├── hyperframes/
│   ├── _template/               # starter for new projects
│   └── <project>/index.html     # the HyperFrames edit
│         assets/  → input/<project>     general/ → input/general
├── remotion/
│   └── src/projects/<project>/  # the Remotion edit (index.tsx + Reel.tsx), auto-registered
└── scripts/                     # project commands + FFmpeg helpers
```

You never copy footage into the engine folders. Each project reads straight from `input/<project>/` and `input/general/` through links.

## Setup (once)

```bash
cd ~/Desktop/vfx
./setup.sh              # add --skills to also install the HyperFrames skills for Claude Code
```

## Workflow

```bash
./scripts/new-project.sh "Rancho at Mula de Victoria"   # → rancho-at-mula-de-victoria (both engines)
./scripts/new-project.sh halloween hf                    # HyperFrames only   (or: remotion)

# drop footage into input/<project>/, shared stuff into input/general/

./scripts/preview.sh halloween            # live preview (HyperFrames studio)
./scripts/preview.sh halloween remotion   # Remotion Studio
./scripts/check.sh halloween              # lint a HyperFrames project
./scripts/render.sh halloween             # → output/halloween/halloween-hf-<timestamp>.mp4
./scripts/render.sh halloween remotion
./scripts/render.sh halloween both
./scripts/render.sh halloween hf -q delivery    # extra args go to the engine (single-engine renders)
```

Referencing files in an edit:

| | This project's footage | Shared resources |
|---|---|---|
| HyperFrames (`index.html`) | `src="assets/clip.mp4"` | `src="general/music/track.mp3"` |
| Remotion (`index.tsx` / `Reel.tsx`) | `clip: "clip.mp4"` → `staticFile("<project>/clip.mp4")` | `staticFile("general/logos/logo.png")` |

HyperFrames gotcha: every `<video>`, `<audio>` and `<img>` needs a unique `id`, otherwise it's silent or skipped in the render. Run `./scripts/check.sh <project>` to catch it.

## Voiceover (ElevenLabs)

Paste your API key into `.env` (`ELEVENLABS_API_KEY=…`) once. Optionally set a default `ELEVENLABS_VOICE_ID` and model there too. `.env` is git-ignored.

```bash
./scripts/voice.sh voices                                   # list your voices + ids → put one in .env
./scripts/voice.sh halloween "Working from home was scary enough…"   # → input/halloween/voice/<name>.mp3
./scripts/voice.sh halloween -f script.txt --name intro     # text from a file
./scripts/voice.sh general "Follow for more" --name outro-cta   # shared → input/general/voice/
./scripts/voice.sh halloween "[whispers] don't turn around" --model eleven_v3 --speed 1.1
```

Every clip also gets a `<name>.words.json` with per-word start/end times, ready for synced captions. The script prints the `<audio>` / `<Audio>` line to paste into your edit.

## FFmpeg helpers (no browser, fastest)

```bash
./scripts/probe.sh input/halloween/a.mov                       # resolution, fps, duration
./scripts/to-reel.sh input/halloween/a.mov input/halloween/a-9x16.mp4   # crop any clip to 1080x1920
./scripts/trim.sh in.mp4 00:00:03.5 00:00:09 out.mp4
./scripts/concat.sh out.mp4 a.mp4 b.mov c.mp4
./scripts/add-music.sh video.mp4 input/general/music/song.mp3 out.mp4   # MUSIC_VOL=0.6 KEEP_ORIG=0
./scripts/extract-audio.sh in.mp4 out.wav
./scripts/compress.sh in.mp4 small.mp4
```

## Why each piece is here

| Tool | Role | Why you need it |
|---|---|---|
| **FFmpeg** | The engine underneath | Every MP4 that comes out of HyperFrames or Remotion is encoded by FFmpeg. On its own it's also the fastest way to do edits that don't need a browser: trimming, cropping landscape → 9:16, joining clips, laying music under a video, compressing for upload. |
| **GSAP** | Motion / animation | Easing, staggers, timelines, text reveals, Ken Burns zooms. The timeline is always `paused` and the renderer seeks it to each frame's time, so animation is frame-perfect and repeatable. |
| **HyperFrames** | Renderer #1: HTML → video | A composition is an HTML page with `data-start` / `data-duration` on elements: plain HTML/CSS + GSAP, no build step. Ships video tooling (beat detection, captions, snapshots, lint/check, block catalog) and is built for AI agents to edit. Best for: fast reels, motion graphics, anything Claude writes for you. |
| **Remotion** | Renderer #2: React → video | Each video is a React component; the frame number is state. Strong for data-driven / templated videos (same template, many names/clips via props), TypeScript and components, or server rendering later. GSAP works inside it too. |

**Rule of thumb:** footage-only edits → `scripts/`. One-off reels and motion graphics → HyperFrames. Templated / data-driven / batch videos → Remotion.

> Licensing: Remotion is free for individuals and companies up to 3 people; bigger companies need a paid license. HyperFrames is Apache-2.0. GSAP is free (including commercial use).

`sample` is a demo project (test clip in `input/sample/`, one render per engine in `output/sample/`).

# vfx Studio

The Mac app for the Knowledge by Joe reel pipeline: a CapCut-style editor on top of `hyperframes/<project>`.

| Panel | What it does |
|---|---|
| **Media bin** (left) | Joe's stickers, the SFX library (search 1,000+ sounds, play to audition), backgrounds and the project's own files. **Drop files from Finder** → copied to `input/<project>/media/`. Drag anything onto the timeline. |
| **Preview** (center) | The real HyperFrames composition, seeked frame-accurately to the playhead, with voice + SFX playing in sync. Safe-zone overlay (REVIEW.md zones). "Rendered" switch plays the FINAL mp4. |
| **Timeline** (bottom) | Captions, Cards, Avatar, FX, Media, Voice (waveform), SFX, Background. Click/drag the ruler to scrub, drag clips to move them (snaps to words), drop media to add it, ⌫ removes media you added, zoom slider. |
| **Inspector** (right) | Start/duration of the selected clip, position + volume of added media, and a sticker picker that swaps the reaction for that script line. |
| **Chat** (right) | Claude Code running in the vfx folder (`claude -p`, your own login — no API key). Paste a new script, ask for changes, "review this reel". It follows CLAUDE.md, BRAND.md, REVIEW.md and `.claude/`. |
| **Make reel / Review** (title bar) | Runs `hyperframes/<p>/make.sh` (voice → build → render) and `scripts/review.sh <p>` with a live log. |

Keys: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> one frame · <kbd>⇧</kbd>+arrow one second.

## How edits are saved

`script.json` stays the source of truth. Timeline edits go to `hyperframes/<project>/overrides.json`
(`moves` = seconds to shift a generated element, `added` = media you dropped). Every `build.mjs` applies it through
`scripts/overrides.mjs` and the app rebuilds automatically after each edit. Swapping a reaction edits `script.json`.

## Run it

```bash
cd ~/Desktop/vfx/app
npm install          # once
npm run dev          # opens the app with hot reload
```

The app finds the vfx folder automatically (this repo, or `~/Desktop/vfx`); otherwise it asks once.
Chat needs Claude Code installed and signed in: `npm install -g @anthropic-ai/claude-code`, then `claude` once.

## Build the Mac app (Apple Silicon + Intel)

```bash
npm run dist:mac          # both → dist/vfx Studio-0.1.0-arm64.dmg and dist/vfx Studio-0.1.0-x64.dmg
npm run dist:mac:arm64    # only Apple Silicon
npm run dist:mac:x64      # only Intel
```

Open the `.dmg`, drag **vfx Studio** to Applications. The app isn't signed with an Apple Developer ID, so the first
time: right-click the app → **Open**. If macOS says it's damaged: `xattr -cr "/Applications/vfx Studio.app"`.

## Code map

```
src/main/            Electron main process
  index.ts           window (hiddenInset title bar), vfx:// protocol, IPC
  ipc.ts             all IPC handlers + file watching (reloads after builds/chat edits)
  services/
    protocol.ts      vfx://root/<path> → files in the vfx folder (Range support) + preview bridge injection
    previewBridge.ts script injected into index.html so the app can seek the composition
    timeline.ts      index.html → timeline clips (tested: npm test)
    projects.ts      list/read projects, swap a line's reaction, git branch
    media.ts         stickers / sfx / backgrounds / project files, Finder import
    overrides.ts     overrides.json read/write
    runner.ts        make / build / render / review via the login shell
    chat.ts          Claude Code (stream-json) bridge
src/preload/         typed window.api
src/shared/types.ts  types shared by main + renderer
src/renderer/src/
  App.tsx            layout + wiring
  components/ui/     shadcn/ui
  components/editor/ TitleBar, MediaBin, Preview, Timeline, Waveform, Inspector, Chat, RightPanel, RunConsole
  hooks/             useVfx, usePlayback, useAudioEngine, useEdits, useRuns
```

Checks before committing: `npm run typecheck && npm test && npm run build`.

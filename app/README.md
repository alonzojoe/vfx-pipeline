# vfx Studio

The Mac app for the Knowledge by Joe reel pipeline: a CapCut-style editor on top of `hyperframes/<project>`.

| Panel | What it does |
|---|---|
| **Media bin** (left) | Joe's stickers, the SFX library (search 1,000+ sounds, play to audition), backgrounds and the project's own files. **Drop files from Finder** → copied to `input/<project>/media/`. Drag anything onto the timeline. |
| **Preview** (center) | The real HyperFrames composition, seeked frame-accurately to the playhead, with voice + SFX playing in sync. Safe-zone overlay (REVIEW.md zones). "Rendered" switch plays the FINAL mp4. |
| **Timeline** (bottom) | Captions, Cards, Avatar, FX, Media, Voice (waveform), SFX, Background. Click/drag the ruler to scrub, drag clips to move them (snaps to words), drop media to add it, ⌫ removes media you added, zoom slider. |
| **Inspector** (right) | Start/duration of the selected clip, position + volume of added media, and a sticker picker that swaps the reaction for that script line. |
| **Chat** (right) | Claude Code running in the vfx folder (`claude -p`, your own login — no API key). Paste a new script, ask for changes, "review this reel". It follows CLAUDE.md, BRAND.md, REVIEW.md and `.claude/`. |
| **+ New reel** (title bar, media bin tile, reel picker) | Creates and opens `new-reel` right away (drop files into it), then you paste a script in the chat: Claude renames the reel from the topic, writes the script + cards, the app builds the preview and makes the **ElevenLabs voice by itself** — no Terminal. |
| **Reel picker** (title bar) | Every reel with its state (draft / no voice / voice ready / FINAL); switch between them. |
| **Export / Review** (title bar) | Export renders `<p>-FINAL.mp4` and then runs `scripts/review.sh <p>`; Review runs the review alone. Live log for every run. |

**Appearance:** the System / Light / Dark switch in the title bar. Saved in the app's `settings.json` (userData,
next to the vfx-folder choice), applied with Electron's `nativeTheme` before the window opens and tagged on `<html>`
by the preload before the first paint — no flash on launch. System follows macOS live.

Keys: <kbd>Space</kbd> play/pause · <kbd>Home</kbd>/<kbd>End</kbd> start/end · <kbd>←</kbd>/<kbd>→</kbd> one frame · <kbd>⇧</kbd>+arrow one second.

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
The voice needs the ElevenLabs key in the vfx folder's `.env` (same as `MAKE-REEL.command`).

## New reel flow (spec 0003)
`+ New reel` → `new-reel` (draft) → paste script → chat runs `scripts/rename-project.sh new-reel <topic>` and writes
`script.json` + cards + the TOPICS row (`bg: auto · cta: auto`) → app runs `build.mjs` (preview) → app runs
`make.sh --no-render` (ElevenLabs voice + synced build) and fills the TOPICS row → tweak → Export.
The chat runs headless with only the commands in `ALLOWED` (`src/main/services/chat.ts`).

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
    protocol.ts      vfx://root/<path> → hyperframes/, input/, output/ only (no dotfiles, Range support) + preview bridge
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

Config (all TypeScript): `electron.vite.config.ts` (Vite + PostCSS/Tailwind), `tailwind.config.ts`,
`electron-builder.yml`, `scripts/ensure-deps.ts` (installs new packages before `dev`/`build`; needs Node ≥ 22.6).

Checks before committing: `npm run typecheck && npm test && npm run build`. The app is TypeScript-only — no `.js` files.

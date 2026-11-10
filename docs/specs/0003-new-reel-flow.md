# Spec 0003 — vfx Studio: New reel flow (paste a script → reel, no terminal)

Status: in progress · Branch: `develop` · Design: Claude Design canvas "vfx-pipeline Studio UI" → "New reel flow"
(0002 is reserved for the code-review fixes.)

## Problem
The app can only open reels that already exist. Making a new one still means pasting the script to Claude in chat,
then running `MAKE-REEL.command` in Terminal for the ElevenLabs voice.

## Flow (approved design)
1. **+ New reel** (orange, title bar — replaces "Make reel"; also a big tile with Joe's `chill` sticker at the top
   of the media bin; also first item in the reel picker).
2. Pressing it **immediately creates and opens `new-reel`** (`new-reel-2`, … if taken): `input/`, `hyperframes/`,
   `output/` folders, a draft `script.json` (no lines) and the newest project's `build.mjs` + `make.sh`.
   Files can be dropped in right away. Preview shows "Your reel appears here"; timeline is empty.
3. The chat opens focused: "Created new-reel · paste your script". Joe pastes his script (or a topic).
4. Claude (chat) **auto-renames** the reel from the topic first (`./scripts/rename-project.sh new-reel <slug>`),
   then writes `script.json` + the cards (Joe's words verbatim, BRAND.md rules, CTA auto) and builds a preview.
   The app follows the rename and switches to the new folder.
5. When the script is in and there's no voice yet, the app **generates the ElevenLabs voice by itself**
   (`make.sh --no-render`: voice → synced build). A checklist in the chat shows each step; the stepper in the
   title bar shows Script · Voice · Build · Render.
6. Ready: full timeline + waveform, preview playable. **Export** renders the FINAL mp4 and then runs the review.
7. The reel picker lists every reel (FINAL / no voice / draft) so Joe can switch between them.

## Changes
| Area | Change |
|---|---|
| `scripts/rename-project.sh` | rename a reel's folders (+ fix the `assets` symlink, meta.json, remotion link); unique slug |
| `app/src/main/services/projects.ts` | `createProject()` (new-reel draft), `renameProject()`; draft detection |
| `app/src/main/services/runner.ts` | run kind `voice` = `make.sh --no-render` |
| `app/src/main/services/chat.ts` | "new reel" mode prompt (rename first, script + cards, build, no voice) |
| renderer | TitleBar (+ New reel, Export, Review, stepper, reel picker), MediaBin tile, empty preview/timeline, chat progress, auto-voice, follow rename, Export → render → review |
| `.claude/settings.json` | allow the chat to run `make.sh` and `rename-project.sh` |

## Out of scope
"Look first" frames checkpoint, export pack (captions/hashtags), script-check warnings — next specs.

## Acceptance
- [ ] + New reel creates and opens `new-reel` (or `new-reel-N`) with empty preview/timeline; drops land in it.
- [ ] Pasting a script renames the reel from its topic and the app switches to the renamed folder.
- [ ] The voice is generated from the app (no Terminal), then the timeline shows captions/cards/avatar/voice.
- [ ] Export renders `<slug>-FINAL.mp4` and runs the review.
- [ ] `npm run typecheck && npm test && npm run build` pass; one commit per step, `type: message`, no attribution.

# Spec 0002 — vfx Studio: security and bug fixes from the code review

Status: done · Branch: `develop` · Area: `app/`, `scripts/`, `.claude/`

## Problem
The review of specs 0001 and 0003 found holes that matter on a machine holding the ElevenLabs key, and bugs Joe hits
while editing:
- `vfx://` served **any** file under the vfx folder (`.env`, `.git/`, `.claude/`) with `Access-Control-Allow-Origin: *`.
- The preload exposed the raw `electronAPI` (every IPC channel), `shell:open` opened any file, links opened any
  scheme, `media:import` copied any path and project names weren't checked (`..` passed the runner's regex).
- `overrides.json` values went into the generated HTML/JS unescaped.
- Closing the window and clicking the dock icon registered every IPC handler again → crash.
- Moving a clip saved `overrides.json` but the preview never reloaded (nothing it keyed on changed); a move made while
  a build ran was never built; two quick edits could overwrite each other; a tween shared by both cards of a pair
  moved twice.
- `html { font-size: 14px }` shrank every rem text size (`text-xs` = 10.5 px).
- Claude permissions: `Bash(./scripts/*)` let a session run `pr.sh` (push + merge) unasked; `cat *`/`grep *` could read
  `.env`. `ship.sh` with no paths staged untracked reels in progress; `pr.sh` said "merged" while auto-merge was pending.

## Changes
| Area | Change |
|---|---|
| `protocol.ts` | serve only `hyperframes/`, `input/`, `output/`; refuse any dot segment; CORS only for the app's own origins; Range: clamp end, suffix ranges, 416 on garbage |
| `paths.ts` | `projectName()` (slug, no dots) and `servable()` |
| `preload`, `ipc.ts`, `index.ts` | drop raw `electronAPI` + `shell:open`; `reveal` only under `output/`/`hyperframes/`; https-only external links; block in-app navigation; check project names on every channel; register IPC once and target the current window |
| `media.ts` | import refuses hidden paths and > 2 GB files |
| `overrides.ts`, `scripts/overrides.mjs` | validate ids/kind/src/numbers on write and on build; a tween line shifts once |
| `useEdits.ts`, `App.tsx`, `projects.ts`, `Preview.tsx` | edits run one at a time; an edit during a build re-builds after it; preview reloads on every new build (`builtAt`) |
| `tailwind.config.ts`, `globals.css` | px font scale (xs 12, sm 13, base 14, lg 16); root stays 14 px so spacing is unchanged |
| `.claude/settings.json`, `chat.ts` | named scripts only (no `pr.sh`, no `voice.sh`), no `cat`/`grep`/`find`; chat can't read or edit `.env` |
| `ship.sh`, `pr.sh` | no paths = tracked files only; ≤ 72-char message; `pr.sh` exits when nothing to merge, reports auto-merge honestly, `--no-merge` anywhere |

## Out of scope
Undo/redo, in-app review panel, topic/background/CTA repeat check (next spec).

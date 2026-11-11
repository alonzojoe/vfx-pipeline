# Engineering rules

- **Smallest complete change** (Ponytail): reuse what exists (helpers in `scripts/`, the newest project's `build.mjs`,
  shadcn components in `app/src/renderer/src/components/ui`) before writing new code. No abstractions "for later".
- **App stack** (`app/`): Electron + electron-vite + React + TypeScript + Tailwind + shadcn/ui. Main process owns the
  filesystem and child processes; the renderer only talks to it through the typed `window.api` from `src/preload`.
  Files are served to the renderer through the `vfx://` protocol — never `file://`, never `nodeIntegration`.
- **TypeScript only in `app/`** — every source, config and script is `.ts`/`.tsx` (no `.js`/`.cjs`/`.mjs`, configs
  included: `electron.vite.config.ts` holds PostCSS, `tailwind.config.ts`, `scripts/ensure-deps.ts` runs on plain Node
  with type stripping). Strict mode + `noUnusedLocals`/`noUnusedParameters`/`noImplicitReturns`; no `any` — type
  external data (e.g. Claude Code's stream-json) with small local types.
- **Mac only**: builds target macOS Apple Silicon (arm64) and Intel (x64) via `npm run dist:mac`.
- **Reels**: `script.json` → `build.mjs` → `index.html` (HyperFrames) is the source of truth. The app edits
  `script.json` / `overrides.json`, never the generated `index.html` by hand.
- Bugs: reproduce first (`/diagnosing-bugs`), fix the root cause once, then commit the fix on its own.
- Skills available in `.claude/skills/`: Matt Pocock's engineering set (`/tdd`, `/diagnosing-bugs`, `/code-review`,
  `/codebase-design`, `/prototype`, `/to-spec`, `/to-tickets`, `/pr`, …) and Ponytail (`/ponytail`, `/ponytail-review`,
  `/ponytail-audit`, …). Use them for app/engineering work.

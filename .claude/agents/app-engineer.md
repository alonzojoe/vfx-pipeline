---
name: app-engineer
description: Builds and fixes the vfx Studio desktop app in app/ (Electron + electron-vite + React + TypeScript + Tailwind + shadcn/ui, macOS arm64 + x64). Use for any UI, IPC, timeline, preview, chat or packaging work in app/.
tools: Read, Glob, Grep, Write, Edit, Bash
---

You work in `app/`. Read `app/README.md` and `.claude/rules/engineering.md` first.

- Main process (`src/main`) owns files, the `vfx://` protocol and child processes (make.sh, review.sh, claude CLI).
  Renderer (`src/renderer`) only uses the typed `window.api` (`src/preload`). Shared types in `src/shared`.
- UI: shadcn components in `src/renderer/src/components/ui`, dark zinc theme, brand orange `#ff4d2e` as the primary.
- Smallest complete change (use `/ponytail`); reproduce bugs first (`/diagnosing-bugs`); TDD for logic with real
  branches (`/tdd`) — e.g. timeline parsing, overrides.
- Before every commit: `npm run typecheck && npm run build`. Commit each step (`feat: …`, `style: …`, `config: …` — see .claude/rules/git.md), no Claude attribution.
- Packaging: `npm run dist:mac` (dmg for arm64 + x64, unsigned — first launch: right-click → Open).

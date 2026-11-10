# Spec 0001 — vfx Studio: readable UI, Poppins, dark scrollbars

Status: in progress · Branch: `develop` · Area: `app/` (renderer only)

## Problem
- Text across the app is small (10–13 px) and the muted gray is low-contrast on the dark panels, so labels,
  timeline clips and the media bin are hard to read.
- Scrollbars render as the light macOS/Chromium default (bright gutters at the bottom of the timeline and in lists),
  which looks broken on the dark theme.
- The UI font is the system font; Joe wants **Poppins** for the app.

## Goals
1. **Poppins** everywhere in the app UI (400/500/600/700), bundled locally (no network, works offline, CSP-safe).
2. **Dark scrollbars** everywhere: native ones (timeline, logs, lists) and the shadcn ScrollArea — thin, zinc
   thumb, transparent track, brighter on hover; dark corner where both bars meet.
3. **Readable**: base text 14 px; nothing below 12 px; muted text contrast ≥ 4.5:1 on the panel color;
   timeline clip labels 12 px, ruler 11 px; track names 13 px.

## Changes
| File | Change |
|---|---|
| `app/package.json` | add `@fontsource/poppins@5.2.7` |
| `app/src/renderer/src/main.tsx` | import Poppins 400/500/600/700 |
| `app/tailwind.config.js` | `font-sans` = Poppins first |
| `app/src/renderer/src/styles/globals.css` | `color-scheme: dark`; `::-webkit-scrollbar*` dark styles; base 14 px; brighter `--muted-foreground` |
| `app/src/renderer/src/components/ui/scroll-area.tsx` | thinner, darker thumb with hover state |
| editor components | bump `text-[10px]`/`text-[10.5px]`/`text-[11px]` to ≥ 12 px where it's real content |

## Out of scope
- Layout changes, new features, light theme. The reel's own fonts (Patrick Hand / Fredoka) are untouched.

## Acceptance
- [ ] Screenshot of the app: every panel in Poppins, no light scrollbars or white gutters anywhere.
- [ ] No text smaller than 12 px except the timeline ruler (11 px).
- [ ] `npm run typecheck && npm test && npm run build` pass.
- [ ] One commit per step: `docs:` spec → `style:` Poppins → `style:` scrollbars → `style:` readability.

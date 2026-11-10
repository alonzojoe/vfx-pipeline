---
description: Make a new reel from a pasted script or a topic (same flow as vfx Studio's "+ New reel")
argument-hint: <Joe's script, or a topic>
---

New reel from: $ARGUMENTS

1. If there's no draft yet, create one the way the app does: `./scripts/new-project.sh new-reel hf`, copy the newest
   finished reel's `build.mjs`, `make.sh` and its `script.json` settings (voice, sfx) with `lines: []`.
2. Name it from the topic: `./scripts/rename-project.sh new-reel <short-kebab-name>` (use the name it prints).
3. Write `hyperframes/<name>/script.json` (Joe's words verbatim, BRAND.md §2, `.claude/agents/script-writer.md`),
   update the CARDS in `build.mjs` (Joe's name in every mock UI), run `node hyperframes/<name>/build.mjs`, add the
   TOPICS.md row.
4. Voice: in the app it's automatic; from the terminal run `./hyperframes/<name>/make.sh` on the Mac
   (ElevenLabs → synced build → render), then `./scripts/review.sh <name>`.

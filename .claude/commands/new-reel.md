---
description: Make a new reel from a pasted script or a topic (same flow as vfx Studio's "+ New reel")
argument-hint: <Joe's script, or a topic>
---

New reel from: $ARGUMENTS

1. If there's no draft yet, create one the way the app does: `./scripts/new-project.sh new-reel hf` (copies the builder
   from `hyperframes/_template/`) and the newest finished reel's `script.json` settings (voice) with `lines: []`.
2. Name it from the topic: `./scripts/rename-project.sh new-reel <short-kebab-name>` (use the name it prints).
3. Write `hyperframes/<name>/script.json` in the two-comparison format (Joe's words verbatim, BRAND.md §2,
   `.claude/agents/script-writer.md`): 2 comparisons, a real example each, one Joe line, CTA; the 4 cards go in its
   `cards` (checked facts). Run `node hyperframes/<name>/build.mjs`, add the TOPICS.md row.
4. Voice: in the app it's automatic; from the terminal run `./hyperframes/<name>/make.sh` on the Mac
   (ElevenLabs → synced build → render), then `./scripts/review.sh <name>`.

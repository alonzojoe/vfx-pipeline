---
name: script-writer
description: Turns a topic or Joe's raw script into a reel script.json (lines, pairs, cards, reactions, actions, recap, CTA) that follows BRAND.md. Use when Joe sends new content for a reel.
tools: Read, Glob, Grep, Write, Edit
---

You write reel scripts for the Knowledge by Joe channel.

Read first: `BRAND.md` (§1 topics, §2 how we write, §6 avatar, §7 mock UIs), `TOPICS.md` (never repeat a topic,
hook, background or CTA type), and the newest `hyperframes/*/script.json` as the format reference.

Output: `hyperframes/<project>/script.json` (create the project with `./scripts/new-project.sh <name> hf` and copy the
newest project's `build.mjs` + `make.sh` if it doesn't exist).

Rules:
- If Joe gave his own script, keep his words verbatim; only split into lines and add structure.
- Short lines (3–9 words), hook in the first 2 seconds, pauses only on big beats (`pause` = total silence).
- Two X-vs-Y pairs, a worked example with real numbers that add up, a 2×2 `recap`, CTA line `{"text": "auto", "cta": true}`.
- One `react` sticker per line picked by meaning (BRAND.md §6); pointing stickers + `show`/`focus` when a line explains a card.
- `actions` (`pop`, `swap`, `pulse`, optional `delay`) fire on the spoken word; every element they target must exist
  in the CARDS map in `build.mjs` — add new cards there with Joe's name in every mock UI.
- SFX: Joe's own sounds lead, library sounds as variants/layers; vary the palette from the previous reel.
- Finish by running `node hyperframes/<project>/build.mjs` and report the printed line (length, bg, cta). Add the
  TOPICS.md row.

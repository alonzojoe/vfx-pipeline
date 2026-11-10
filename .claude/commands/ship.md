---
description: Build the planned steps one by one, checking and committing after each
argument-hint: [optional: which steps / what to ship]
---

Ship $ARGUMENTS step by step:

For each step of the current plan (or the change described):
1. Make the change (smallest complete diff).
2. Commit it with `./scripts/ship.sh "<type>: <message>" <paths>` — it runs only the checks the step touches
   (app → typecheck + tests, reel → build + lint) and commits. If a check fails, fix it and run ship again.
3. One line to Joe per step: `✓ <hash> <message>`. No long summaries between steps.

Rules: `.claude/rules/git.md` (no Claude attribution, `type: message`, stay on the current branch, never push
unless asked). At the end: the list of commits and one line on anything left.

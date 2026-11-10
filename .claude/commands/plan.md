---
description: Fast plan — break a task into small steps, one commit each, then start
argument-hint: <what to build or fix>
---

Plan this, fast: $ARGUMENTS

1. Read only what you need (≤ 5 files): the relevant CLAUDE.md section, then the files the change touches.
   Use the `planner` agent if the task spans app + reels or > 5 files.
2. Reply with a numbered plan, max 8 steps. Each step = one commit, written as its commit message
   (`feat: …`, `fix: …`, `style: …`, `config: …`, `perf: …`, `refactor: …`, `docs: …`, `test: …`, `chore: …`)
   plus the files it touches. Smallest complete change (Ponytail). No questions unless something is truly ambiguous.
3. Then immediately start step 1 — don't wait for approval unless a step deletes data or changes `main`.

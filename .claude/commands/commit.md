---
description: Commit the current changes as small logical commits (type: message, no co-author)
---

Look at `git status` and `git diff`. Group the changes into logical steps (one feature/fix/style/config each) and
commit each group with `./scripts/ship.sh "<type>: <message>" <paths of that group>`, smallest group first.
Types: feat fix chore config style perf refactor docs test. Never include `.env`, outputs or build folders.
Print one `✓ <hash> <message>` line per commit, nothing else.

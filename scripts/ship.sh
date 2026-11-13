#!/usr/bin/env bash
# Fast check + commit for one logical step.
#   ./scripts/ship.sh "feat: add timeline zoom"            # stage changed TRACKED files, check what they touch, commit
#   ./scripts/ship.sh "fix: arrow lands on card" app/src     # only these paths (new files: name them here)
# Checks run only for the areas you touched: app/ → typecheck + tests (+ build with SHIP_BUILD=1);
# hyperframes/<p>/ → build.mjs + hyperframes lint. Never adds Claude attribution. Message must be "type: message".
set -euo pipefail
cd "$(dirname "$0")/.."
MSG="${1:-}"; shift || true
[[ "$MSG" =~ ^(feat|fix|chore|config|style|perf|refactor|docs|test):\ .+ ]] || {
  echo "✗ message must look like 'feat: …' (types: feat fix chore config style perf refactor docs test)"; exit 1; }
[ "${#MSG}" -le 72 ] || { echo "✗ message is ${#MSG} chars — keep it ≤ 72"; exit 1; }

# no paths = tracked files only, so a reel in progress (new, untracked folders) never sneaks into a commit
if [ $# -gt 0 ]; then git add -A -- "$@"; else git add -u; fi
git reset -q -- .env '*.env' 2>/dev/null || true
FILES="$(git diff --cached --name-only)"
[ -n "$FILES" ] || { echo "✗ nothing staged"; exit 1; }
if echo "$FILES" | grep -qE '(^|/)\.env($|\.)'; then echo "✗ refusing to commit a .env file"; exit 1; fi

if echo "$FILES" | grep -q '^app/'; then
  echo "▸ app: typecheck + tests"
  (cd app && npm run -s typecheck && npm test --silent)
  [ "${SHIP_BUILD:-0}" = 1 ] && (cd app && npm run -s build >/dev/null && echo "  build ✓")
fi
for p in $(echo "$FILES" | grep -oE '^hyperframes/[^/_][^/]*' | sort -u | cut -d/ -f2); do
  [ -f "hyperframes/$p/build.mjs" ] || continue
  echo "▸ reel $p: build + lint"
  node "hyperframes/$p/build.mjs" | tail -1
  git add "hyperframes/$p/index.html" 2>/dev/null || true
  (cd hyperframes && npx --no-install hyperframes lint "$p" 2>&1 | tail -1)
done

git commit -q -m "$MSG"
git log --format='✓ %h %s' -1

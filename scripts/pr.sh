#!/usr/bin/env bash
# Push the current branch, open a PR into main and merge it (one command).
#   ./scripts/pr.sh                          # title from the branch, merges right after opening
#   ./scripts/pr.sh "vfx Studio app"         # custom title
#   ./scripts/pr.sh "vfx Studio app" --no-merge
# Needs the GitHub CLI once: brew install gh && gh auth login. No Claude attribution in the PR.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=main
HEAD="$(git branch --show-current)"
[ "$HEAD" != "$BASE" ] || { echo "✗ you're on $BASE — switch to develop first"; exit 1; }
command -v gh >/dev/null || { echo "✗ GitHub CLI missing: brew install gh && gh auth login"; exit 1; }
# only commits go into the PR; uncommitted work (e.g. a reel in progress) stays on your Mac untouched
[ -z "$(git status --porcelain)" ] || echo "• note: uncommitted changes stay local and are NOT in this PR (commit them first if they should be)"
TITLE="${1:-$(git log -1 --format=%s "$HEAD")}"
MERGE=1; [ "${2:-}" = "--no-merge" ] && MERGE=0

git fetch -q origin "$BASE"
BODY="$(mktemp)"
{
  echo "## Commits"; echo
  git log --reverse --format='- %s' "origin/$BASE..$HEAD"
  echo; echo "## Checks"; echo
  echo "- app: \`npm run typecheck && npm test && npm run build\`"
  echo "- reels: \`node hyperframes/<p>/build.mjs\` + \`npx hyperframes lint <p>\`"
} > "$BODY"

git push -u origin "$HEAD"
URL="$(gh pr list --head "$HEAD" --base "$BASE" --state open --json url -q '.[0].url')"
[ -n "$URL" ] || URL="$(gh pr create --base "$BASE" --head "$HEAD" --title "$TITLE" --body-file "$BODY")"
echo "PR: $URL"
if [ "$MERGE" = 1 ]; then
  # auto-merge waits for required checks when the repo has them; otherwise merge now. develop is kept.
  gh pr merge "$URL" --merge --auto 2>/dev/null || gh pr merge "$URL" --merge
  git fetch -q origin "$BASE" && echo "✓ merged into $BASE ($(git rev-parse --short origin/$BASE))"
fi

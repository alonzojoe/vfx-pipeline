#!/usr/bin/env bash
# Rename a reel everywhere it lives: hyperframes/<old>, input/<old>, output/<old> (+ remotion link, meta.json).
#   ./scripts/rename-project.sh new-reel "Revenue vs Profit"      → revenue-vs-profit (or revenue-vs-profit-2 if taken)
# Prints the final name on the last line: "renamed <old> → <new>".
source "$(dirname "$0")/_project.sh"
[ $# -ge 2 ] || { echo "usage: rename-project.sh <old> <new name>"; exit 1; }
OLD="$1"; NEW="$(slugify "$2")"
[ -n "$NEW" ] && [ "$NEW" != "general" ] || { echo "✗ invalid name: $2"; exit 1; }
[ -d "$ROOT/hyperframes/$OLD" ] || { echo "✗ no project hyperframes/$OLD"; exit 1; }
[ "$OLD" != "$NEW" ] || { echo "renamed $OLD → $NEW"; exit 0; }
BASE="$NEW"; n=2
while [ -e "$ROOT/hyperframes/$NEW" ] || [ -e "$ROOT/input/$NEW" ] || [ -e "$ROOT/output/$NEW" ]; do NEW="$BASE-$n"; n=$((n+1)); done

for d in hyperframes input output; do
  [ -e "$ROOT/$d/$OLD" ] && mv "$ROOT/$d/$OLD" "$ROOT/$d/$NEW"
done
mkdir -p "$ROOT/input/$NEW" "$ROOT/output/$NEW"
D="$ROOT/hyperframes/$NEW"
rm -f "$D/assets" && ln -s "../../input/$NEW" "$D/assets"
[ -f "$D/meta.json" ] && sed -i.bak "s/\"$OLD\"/\"$NEW\"/g" "$D/meta.json" && rm -f "$D/meta.json.bak"
if [ -L "$ROOT/remotion/public/$OLD" ]; then rm -f "$ROOT/remotion/public/$OLD"; ln -s "../../input/$NEW" "$ROOT/remotion/public/$NEW"; fi
if [ -d "$ROOT/remotion/src/projects/$OLD" ]; then mv "$ROOT/remotion/src/projects/$OLD" "$ROOT/remotion/src/projects/$NEW"; fi
# renders/reviews named after the old project
for f in "$ROOT/output/$NEW/$OLD"*; do [ -e "$f" ] && mv "$f" "${f/\/$OLD/\/$NEW}"; done
echo "renamed $OLD → $NEW"

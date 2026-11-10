#!/usr/bin/env bash
# Open a live preview of a project.
#   ./scripts/preview.sh halloween            # HyperFrames studio (or Remotion if that's all it has)
#   ./scripts/preview.sh halloween remotion   # Remotion Studio, opened on this project
source "$(dirname "$0")/_project.sh"
[ $# -ge 1 ] || { echo "usage: preview.sh <name> [hf|remotion]"; exit 1; }
NAME="$(slugify "$1")"; ENGINE="${2:-auto}"
if [ "$ENGINE" = auto ]; then
  if has_hf "$NAME"; then ENGINE=hf; elif has_rm "$NAME"; then ENGINE=remotion
  else echo "No project '$NAME'. Create it: ./scripts/new-project.sh $NAME"; exit 1; fi
fi
if [ "$ENGINE" = hf ]; then
  cd "$ROOT/hyperframes" && exec $HF preview "$NAME"
else
  echo "Remotion Studio → http://localhost:3000/$NAME"
  cd "$ROOT/remotion" && exec npx remotion studio
fi

#!/usr/bin/env bash
# After a revision passes review: keep ONE video per project, named <project>-FINAL.mp4, delete every other render
# and old review folder in output/<project>/ (avoids confusion about which file is current), then re-run the review.
#   ./scripts/finalize.sh <project>               # keeps the newest .mp4
#   ./scripts/finalize.sh <project> <video.mp4>   # keeps that one
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
P="${1:?usage: finalize.sh <project> [video.mp4]}"; DIR="$ROOT/output/$P"
[ -d "$DIR" ] || { echo "no output/$P"; exit 1; }
if [ -n "${2:-}" ]; then KEEP="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"; else KEEP="$(ls -t "$DIR"/*.mp4 | head -1)"; fi
[ -f "$KEEP" ] || { echo "video not found: $KEEP"; exit 1; }
FINAL="$DIR/$P-FINAL.mp4"
if [ "$KEEP" != "$FINAL" ]; then mv -f "$KEEP" "$FINAL"; fi
for f in "$DIR"/*.mp4; do [ "$f" = "$FINAL" ] || { rm -f "$f"; echo "  deleted $(basename "$f")"; }; done
rm -rf "$DIR/review"
"$ROOT/scripts/review.sh" "$P" "$FINAL" >/dev/null
echo "✓ output/$P now has one video: $P-FINAL.mp4  (+ review/$P-FINAL/)"

#!/usr/bin/env bash
# Render a project into output/<name>/<name>-FINAL.mp4 (the ONLY video kept in that folder)
#   ./scripts/render.sh halloween            # whichever engine the project has (HyperFrames first)
#   ./scripts/render.sh halloween remotion
#   ./scripts/render.sh halloween hf -q draft          # extra args go to the engine's CLI
source "$(dirname "$0")/_project.sh"
[ $# -ge 1 ] || { echo "usage: render.sh <name> [hf|remotion] [engine args...]"; exit 1; }
NAME="$(slugify "$1")"; shift
ENGINE="auto"
case "${1:-}" in hf|remotion|both) ENGINE="$1"; shift;; esac
if [ "$ENGINE" = auto ]; then
  if has_hf "$NAME"; then ENGINE=hf; elif has_rm "$NAME"; then ENGINE=remotion
  else echo "No project '$NAME'. Create it: ./scripts/new-project.sh $NAME"; exit 1; fi
fi
mkdir -p "$ROOT/output/$NAME"
STAMP="$(date +%Y%m%d-%H%M%S)"


# Loudness: normalize every render to YouTube's -14 LUFS / -1.5 dBTP (2-pass loudnorm, video stream copied)
normalize(){
  local f="$1" tmp="${1%.mp4}.norm.mp4" stats
  [ "${NO_NORMALIZE:-0}" = 1 ] && return 0
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q . || return 0
  stats=$(ffmpeg -hide_banner -nostats -i "$f" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  local mi mtp mlra mth off
  mi=$(echo "$stats" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log([j.input_i,j.input_tp,j.input_lra,j.input_thresh,j.target_offset].join(" "))')
  read -r mi mtp mlra mth off <<< "$mi"
  ffmpeg -loglevel error -y -i "$f" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true" -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$tmp" && mv "$tmp" "$f"
  echo "  loudness: ${mi} LUFS → -14 LUFS"
}

# ONE video per project, always: the new render becomes output/<project>/<project>-FINAL.mp4 and every other
# video + old review folder in that project's output is deleted (KEEP_OLD=1 to skip, e.g. for A/B tests).
keep_only(){
  local f="$1" dir final
  [ "${KEEP_OLD:-0}" = 1 ] && return 0
  dir="$(dirname "$f")"; final="$dir/$NAME-FINAL.mp4"
  [ "$f" != "$final" ] && mv -f "$f" "$final"
  for g in "$dir"/*.mp4; do [ "$g" = "$final" ] || { rm -f "$g" && echo "  removed old $(basename "$g")"; }; done
  rm -rf "$dir/review"
  OUT="$final"
}

render_hf(){
  has_hf "$NAME" || { echo "hyperframes/$NAME doesn't exist"; return 1; }
  OUT="$ROOT/output/$NAME/$NAME-hf-$STAMP.mp4"
  (cd "$ROOT/hyperframes" && $HF render "$NAME" -o "$OUT" "$@")
  normalize "$OUT"
  keep_only "$OUT"
  echo "→ output/$NAME/$(basename "$OUT")"
}
render_rm(){
  has_rm "$NAME" || { echo "remotion/src/projects/$NAME doesn't exist"; return 1; }
  OUT="$ROOT/output/$NAME/$NAME-remotion-$STAMP.mp4"
  (cd "$ROOT/remotion" && npx remotion render "$NAME" "$OUT" "$@")
  normalize "$OUT"
  keep_only "$OUT"
  echo "→ output/$NAME/$(basename "$OUT")"
}
case "$ENGINE" in
  hf) render_hf "$@";;
  remotion) render_rm "$@";;
  both) echo "Pick ONE engine (hf or remotion): each project keeps exactly one video in output/<project>/."; exit 1;;
esac

#!/usr/bin/env bash
# Render a project into output/<name>/<name>-final_edit.mp4 or -final-edit.mp4 (random; the ONLY video kept there),
# encoded small (H.264 CRF 23, same 1080×1920) with the voice normalized to −14 LUFS
#   ./scripts/render.sh halloween            # whichever engine the project has (HyperFrames first)
#   ./scripts/render.sh halloween remotion
#   ./scripts/render.sh halloween hf -q draft          # extra args go to the engine's CLI
#   FPS=60 ./scripts/render.sh halloween               # 30 (default) or 60 fps — HyperFrames; the app's 30/60 switch sets it
#   CRF=18 ./scripts/render.sh halloween               # bigger file, closer to the raw render (default 23 ≈ 4–6 MB per 40s)
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
FPS="${FPS:-30}"
case "$FPS" in 30|60) ;; *) echo "FPS must be 30 or 60 (got $FPS)"; exit 1;; esac


# Finish every render in ONE ffmpeg pass:
#  - video re-encoded small: H.264 CRF 23 (veryfast), same resolution/fps — ~5 MB instead of ~22 MB for a 40s reel,
#    no visible difference (SSIM 0.986 vs the raw render). CRF=18 for a bigger, closer file.
#  - audio normalized to YouTube's -14 LUFS / -1.5 dBTP (2-pass loudnorm; NO_NORMALIZE=1 keeps it as rendered)
finish(){
  local f="$1" tmp="${1%.mp4}.finish.mp4" stats mi mtp mlra mth off
  local venc=(-c:v libx264 -preset "${PRESET:-veryfast}" -crf "${CRF:-23}" -pix_fmt yuv420p) aenc=(-c:a copy)
  if [ "${NO_NORMALIZE:-0}" != 1 ] && ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
    stats=$(ffmpeg -hide_banner -nostats -i "$f" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
    mi=$(echo "$stats" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log([j.input_i,j.input_tp,j.input_lra,j.input_thresh,j.target_offset].join(" "))')
    read -r mi mtp mlra mth off <<< "$mi"
    aenc=(-af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true" -ar 48000 -c:a aac -b:a 160k)
    echo "  loudness: ${mi} LUFS → -14 LUFS"
  fi
  local before; before=$(du -h "$f" | cut -f1)
  ffmpeg -loglevel error -y -i "$f" "${venc[@]}" "${aenc[@]}" -movflags +faststart "$tmp" && mv "$tmp" "$f"
  echo "  size: $before → $(du -h "$f" | cut -f1) (CRF ${CRF:-23}, same resolution)"
}

# ONE video per project, always: the new render becomes output/<project>/<project>-final_edit.mp4 or -final-edit.mp4
# (random, see final_name in _project.sh) and every other video + old review folder there is deleted
# (KEEP_OLD=1 to skip, e.g. for A/B tests).
keep_only(){
  local f="$1" dir final
  [ "${KEEP_OLD:-0}" = 1 ] && return 0
  dir="$(dirname "$f")"; final="$dir/$(final_name "$NAME")"
  mv -f "$f" "$final"
  for g in "$dir"/*.mp4; do [ "$g" = "$final" ] || { rm -f "$g" && echo "  removed old $(basename "$g")"; }; done
  rm -rf "$dir/review"
  OUT="$final"
}

render_hf(){
  has_hf "$NAME" || { echo "hyperframes/$NAME doesn't exist"; return 1; }
  OUT="$ROOT/output/$NAME/$NAME-hf-$STAMP.mp4"
  echo "  frame rate: $FPS fps"
  (cd "$ROOT/hyperframes" && $HF render "$NAME" -o "$OUT" --fps "$FPS" "$@")
  finish "$OUT"
  keep_only "$OUT"
  echo "→ output/$NAME/$(basename "$OUT")"
}
render_rm(){
  has_rm "$NAME" || { echo "remotion/src/projects/$NAME doesn't exist"; return 1; }
  OUT="$ROOT/output/$NAME/$NAME-remotion-$STAMP.mp4"
  (cd "$ROOT/remotion" && npx remotion render "$NAME" "$OUT" "$@")
  finish "$OUT"
  keep_only "$OUT"
  echo "→ output/$NAME/$(basename "$OUT")"
}
case "$ENGINE" in
  hf) render_hf "$@";;
  remotion) render_rm "$@";;
  both) echo "Pick ONE engine (hf or remotion): each project keeps exactly one video in output/<project>/."; exit 1;;
esac

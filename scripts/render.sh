#!/usr/bin/env bash
# Render a project into output/<name>/<name>-final_edit.mp4 or -final-edit.mp4 (random; the ONLY video kept there),
# encoded once, small (H.264 CRF 25, same 1080×1920), with the voice normalized to −14 LUFS
#   ./scripts/render.sh halloween            # whichever engine the project has (HyperFrames first)
#   ./scripts/render.sh halloween remotion
#   ./scripts/render.sh halloween hf -q draft          # extra args go to the engine's CLI
#   FPS=60 ./scripts/render.sh halloween               # 30 (default) or 60 fps — HyperFrames; the app's 30/60 switch sets it
#   CRF=20 ./scripts/render.sh halloween               # bigger file (default 25 for HyperFrames ≈ 5.5 MB per 40s, 23 for Remotion)
#   VERBOSE=1 ./scripts/render.sh halloween            # the full engine log instead of progress lines
#   ORIGINALITY=off ./scripts/render.sh halloween      # skip the originality check (YouTube's repetitive-content rules)
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
#  - video: HyperFrames already encodes it at our quality (--crf, see render_hf) → copied as is (fast, no second
#    generation). Remotion renders are re-encoded small: H.264 CRF 23 (veryfast), same resolution/fps.
#  - audio normalized to YouTube's -14 LUFS / -1.5 dBTP (2-pass loudnorm; NO_NORMALIZE=1 keeps it as rendered)
finish(){
  local f="$1" copy_video="${2:-0}" tmp="${1%.mp4}.finish.mp4" stats mi mtp mlra mth off
  local venc=(-c:v libx264 -preset "${PRESET:-veryfast}" -crf "${CRF:-23}" -pix_fmt yuv420p) aenc=(-c:a copy)
  [ "$copy_video" = 1 ] && venc=(-c:v copy)
  echo "progress: 100% Balancing loudness"
  if [ "${NO_NORMALIZE:-0}" != 1 ] && ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
    # -vn: the loudness pass only needs the audio (decoding the video too made it ~3× slower)
    stats=$(ffmpeg -hide_banner -nostats -i "$f" -vn -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
    mi=$(echo "$stats" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log([j.input_i,j.input_tp,j.input_lra,j.input_thresh,j.target_offset].join(" "))')
    read -r mi mtp mlra mth off <<< "$mi"
    aenc=(-af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true" -ar 48000 -c:a aac -b:a 160k)
    echo "  loudness: ${mi} LUFS → -14 LUFS"
  fi
  local before; before=$(du -h "$f" | cut -f1)
  ffmpeg -loglevel error -y -i "$f" "${venc[@]}" "${aenc[@]}" -movflags +faststart "$tmp" && mv "$tmp" "$f"
  if [ "$copy_video" = 1 ]; then echo "  size: $(du -h "$f" | cut -f1) (CRF ${CRF:-$HF_CRF}, 1080×1920)"
  else echo "  size: $before → $(du -h "$f" | cut -f1) (CRF ${CRF:-23}, same resolution)"; fi
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

# HyperFrames encodes straight at the final quality (one encode instead of two). Its output is very chatty (trace
# JSON, lint notes, redrawn progress bars): render-progress.mjs keeps "progress: 45% Rendering frames" lines + errors,
# the full log goes to $LOG (its last lines are printed if the render fails). VERBOSE=1 shows everything.
HF_CRF=25   # HyperFrames x264 at 25 ≈ the old CRF 23 re-encode (SSIM 0.986 both, ~5.5 MB per 40s)
render_hf(){
  has_hf "$NAME" || { echo "hyperframes/$NAME doesn't exist"; return 1; }
  OUT="$ROOT/output/$NAME/$NAME-hf-$STAMP.mp4"
  LOG="${TMPDIR:-/tmp}/vfx-render-$NAME.log"
  local q=(--crf "${CRF:-$HF_CRF}") a
  for a in "$@"; do case "$a" in -q|--quality|--quality=*|--crf|--crf=*|--video-bitrate*) q=();; esac; done
  # YouTube's repetitive / mass-produced rules (scripts/originality.mjs): a ✗ stops the export, ! only warns.
  # ORIGINALITY=off skips it (e.g. re-exporting an old reel).
  if [ "${ORIGINALITY:-on}" != off ] && [ -f "$ROOT/hyperframes/$NAME/script.json" ]; then
    node "$ROOT/scripts/originality.mjs" "$NAME" || { [ $? = 1 ] && { echo "✖ export stopped: fix the ✗ lines above (or ORIGINALITY=off)"; return 1; }; }
  fi
  echo "Exporting $NAME · 1080×1920 · $FPS fps"
  if [ "${VERBOSE:-0}" = 1 ]; then
    (cd "$ROOT/hyperframes" && $HF render "$NAME" -o "$OUT" --fps "$FPS" ${q[@]+"${q[@]}"} "$@") || return 1
  else
    if ! (cd "$ROOT/hyperframes" && $HF render "$NAME" -o "$OUT" --fps "$FPS" ${q[@]+"${q[@]}"} "$@" 2>&1 | node "$ROOT/scripts/render-progress.mjs" "$LOG"); then
      echo "✖ render failed — last lines of $LOG:"; tail -n 25 "$LOG"; return 1
    fi
  fi
  finish "$OUT" 1
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

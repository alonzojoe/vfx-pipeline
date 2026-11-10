#!/usr/bin/env bash
# Join clips end-to-end (normalises each to 1080x1920@30 first; clips without audio get silence).
#   ./scripts/concat.sh out.mp4 a.mp4 b.mov c.mp4
source "$(dirname "$0")/_common.sh"
[ $# -ge 3 ] || { echo "usage: concat.sh <out> <in1> <in2> [...]"; exit 1; }
OUT="$1"; shift
FPS="${FPS:-30}"; W="${W:-1080}"; H="${H:-1920}"
inputs=(); filters=""; n=0
for f in "$@"; do
  inputs+=(-i "$f")
  if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
    a="[$n:a:0]aresample=48000,aformat=channel_layouts=stereo[a$n];"
  else
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
    a="anullsrc=r=48000:cl=stereo,atrim=0:$d[a$n];"
  fi
  filters+="[$n:v:0]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,setsar=1,fps=$FPS[v$n];$a"
  n=$((n+1))
done
chain=""; for i in $(seq 0 $((n-1))); do chain+="[v$i][a$i]"; done
ffmpeg -y "${inputs[@]}" -filter_complex "${filters}${chain}concat=n=$n:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" "${VENC[@]}" "${AENC[@]}" "$OUT"

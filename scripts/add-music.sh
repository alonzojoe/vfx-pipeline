#!/usr/bin/env bash
# Lay a music track under a video (keeps original audio, ducks music to MUSIC_VOL, fades out last 1.5s).
#   ./scripts/add-music.sh video.mp4 song.mp3 out.mp4      MUSIC_VOL=0.6 KEEP_ORIG=0 ./scripts/add-music.sh ...
source "$(dirname "$0")/_common.sh"
[ $# -eq 3 ] || { echo "usage: add-music.sh <video> <music> <out>"; exit 1; }
VOL="${MUSIC_VOL:-0.35}"; KEEP="${KEEP_ORIG:-1}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
FADE=$(awk "BEGIN{d=$DUR-1.5; print (d<0?0:d)}")
HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1" | head -1)
if [ "$KEEP" = "1" ] && [ -n "$HAS_A" ]; then
  FC="[1:a]volume=$VOL,afade=t=out:st=$FADE:d=1.5[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]"
else
  FC="[1:a]volume=$VOL,afade=t=out:st=$FADE:d=1.5,atrim=0:$DUR[a]"
fi
ffmpeg -y -i "$1" -i "$2" -filter_complex "$FC" -map 0:v -map "[a]" -c:v copy "${AENC[@]}" -shortest "$3"

#!/usr/bin/env bash
# Any clip -> 1080x1920 @30fps vertical (center-crops, never stretches).
#   ./scripts/to-reel.sh in.mov out.mp4        FPS=60 ./scripts/to-reel.sh in.mov out.mp4
source "$(dirname "$0")/_common.sh"
[ $# -eq 2 ] || { echo "usage: to-reel.sh <in> <out>"; exit 1; }
FPS="${FPS:-30}"
ffmpeg -y -i "$1" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=$FPS" \
  "${VENC[@]}" "${AENC[@]}" "$2"

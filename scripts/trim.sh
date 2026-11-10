#!/usr/bin/env bash
# Cut a section (frame-accurate, re-encodes).   ./scripts/trim.sh in.mp4 00:00:03.5 00:00:09 out.mp4
source "$(dirname "$0")/_common.sh"
[ $# -eq 4 ] || { echo "usage: trim.sh <in> <start> <end> <out>"; exit 1; }
ffmpeg -y -ss "$2" -to "$3" -i "$1" "${VENC[@]}" "${AENC[@]}" "$4"

#!/usr/bin/env bash
# Smaller file for upload/sharing (CRF 23).   ./scripts/compress.sh in.mp4 out.mp4
export CRF="${CRF:-23}"
source "$(dirname "$0")/_common.sh"
[ $# -eq 2 ] || { echo "usage: compress.sh <in> <out>"; exit 1; }
ffmpeg -y -i "$1" "${VENC[@]}" "${AENC[@]}" "$2"

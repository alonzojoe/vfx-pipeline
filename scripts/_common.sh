#!/usr/bin/env bash
# Shared helpers for the ffmpeg scripts. Encodes are H.264 + AAC, yuv420p, +faststart
# so they play everywhere (IG/TikTok/FB/QuickTime).
set -euo pipefail
command -v ffmpeg >/dev/null || { echo "ffmpeg not found — run ./setup.sh first"; exit 1; }
PRESET="${PRESET:-veryfast}"   # PRESET=slow ./scripts/... for smaller/better files
CRF="${CRF:-18}"
VENC=(-c:v libx264 -preset "$PRESET" -crf "$CRF" -pix_fmt yuv420p -movflags +faststart)
AENC=(-c:a aac -b:a 192k -ar 48000)

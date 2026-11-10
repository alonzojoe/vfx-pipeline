#!/usr/bin/env bash
# Pull the audio out of a video as WAV.   ./scripts/extract-audio.sh in.mp4 out.wav
set -euo pipefail
ffmpeg -y -i "$1" -vn -ac 2 -ar 48000 "${2:-${1%.*}.wav}"

#!/usr/bin/env bash
# Double-click me in Finder.
# First run: installs everything (setup.sh). Then: ElevenLabs voice → sync edit to voice → render.
cd "$(dirname "$0")"
PROJECT="${1:-$(ls -t hyperframes/*/script.json 2>/dev/null | head -1 | cut -d/ -f2)}"
echo "▸ Project: $PROJECT   (run ./MAKE-REEL.command <project> for another one)"
fail(){ echo; echo "❌ Something failed above. Screenshot this window and send it to Claude."; read -n1 -p "Press any key to close…"; exit 1; }
trap fail ERR
set -eE

if [ ! -d hyperframes/node_modules ] || [ ! -d remotion/node_modules ] || ! command -v ffmpeg >/dev/null; then
  echo "▸ First run — installing FFmpeg, Node packages and render browsers (a few minutes)…"
  ./setup.sh
fi

echo "▸ Testing ElevenLabs key…"
./scripts/voice.sh voices | head -5

./hyperframes/"$PROJECT"/make.sh
open "output/$PROJECT"
echo; echo "✅ Done! Your reel is in output/$PROJECT (Finder window opened)."
read -n1 -p "Press any key to close…"

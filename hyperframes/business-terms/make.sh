#!/usr/bin/env bash
# One command: ElevenLabs voice → sync edit to the voice → render.
#   ./make.sh              # generates the voice only if it doesn't exist yet
#   ./make.sh --revoice    # regenerate the voice (after editing script.json lines or voice settings)
#   ./make.sh --no-render  # just voice + build (then: ../../scripts/preview.sh money-terms)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."; P="$(basename "$HERE")"
VOICE_DIR="$ROOT/input/$P/voice"
REVOICE=0; RENDER=1
for a in "$@"; do case "$a" in --revoice) REVOICE=1;; --no-render) RENDER=0;; esac; done

# auto-revoice when the voice/model in script.json differs from the one that made the current file
if [ -f "$VOICE_DIR/script.words.json" ] && ! node -e '
  const s=require(process.argv[1]).voice, w=require(process.argv[2]); const txt=process.argv[3].trim();
  process.exit(s.id===w.voice && s.model===w.model && (w.text||"").trim()===txt ? 0 : 1)' "$HERE/script.json" "$VOICE_DIR/script.words.json" "$(node "$HERE/build.mjs" --print-text)"; then
  echo "▸ Script or voice changed in script.json → regenerating voice"; REVOICE=1
fi
if [ "$REVOICE" = 1 ]; then rm -f "$VOICE_DIR/script.mp3" "$VOICE_DIR/script.words.json"; fi
if [ ! -f "$VOICE_DIR/script.mp3" ]; then
  echo "▸ Generating voiceover with ElevenLabs…"
  node "$HERE/build.mjs" --print-text > "$ROOT/input/$P/script.txt"
  # voice settings live in script.json → "voice"
  read -r VID MODEL STAB SIM STYLE SPEED < <(node -e '
    const v=require(process.argv[1]).voice;
    console.log([v.id,v.model,v.stability,v.similarity,v.style,v.speed].join(" "))' "$HERE/script.json")
  "$ROOT/scripts/voice.sh" "$P" -f "$ROOT/input/$P/script.txt" --name script \
    --voice "$VID" --model "$MODEL" --stability "$STAB" --similarity "$SIM" --style "$STYLE" --speed "$SPEED"
fi

echo "▸ Building edit synced to the voice…"
node "$HERE/build.mjs"

if [ "$RENDER" = 1 ]; then
  echo "▸ Rendering…"
  "$ROOT/scripts/render.sh" "$P" hf
fi

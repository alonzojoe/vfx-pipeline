#!/usr/bin/env bash
# One-time setup for the vfx workspace on macOS (Apple Silicon or Intel).
# Run from Terminal:   cd ~/Desktop/vfx && ./setup.sh            (add --earshot and/or --skills for extras)
set -euo pipefail
cd "$(dirname "$0")"
ok(){ printf "\033[32m✓\033[0m %s\n" "$*"; }; step(){ printf "\n\033[1m▸ %s\033[0m\n" "$*"; }

step "Homebrew"
if ! command -v brew >/dev/null; then
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew "$HOME/.homebrew/bin/brew"; do
    [ -x "$b" ] && eval "$("$b" shellenv)" && break
  done
fi
command -v brew >/dev/null || { echo "Homebrew not found. Install it from https://brew.sh then re-run."; exit 1; }
ok "brew $(brew --version | head -1 | awk '{print $2}')"

step "FFmpeg"
command -v ffmpeg >/dev/null || brew install ffmpeg
ok "$(ffmpeg -version | head -1)"

step "Node.js (need 22+)"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
major(){ node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/'; }
if [ "$(major || echo 0)" -lt 22 ] 2>/dev/null || ! command -v node >/dev/null; then
  if command -v nvm >/dev/null; then nvm install 22 && nvm use 22
  else brew install node; fi
fi
ok "node $(node -v)"
echo 22 > .nvmrc

step "HyperFrames project (installs GSAP, vendors it locally)"
(cd hyperframes && npm install)
(cd hyperframes && npx --yes hyperframes@0.9.26 browser ensure)
ok "HyperFrames ready"

step "Remotion project"
(cd remotion && npm install)
(cd remotion && npx remotion browser ensure)
ok "Remotion ready"

step "ElevenLabs .env"
if [ ! -f .env ]; then cp .env.example .env; ok "created .env, paste your key after ELEVENLABS_API_KEY="
else ok ".env already exists"; fi

step "Sound-effects tools (Real SFX index of input/general/sfx)"
if command -v python3 >/dev/null; then
  (cd tools/real-sfx && python3 scripts/setup.py init --library main="$PWD/../../input/general/sfx" --index --force >/dev/null && python3 scripts/setup.py check | grep -E "library|index") || echo "  (Real SFX index skipped)"
else echo "  python3 not found — skipping Real SFX index"; fi

if [ "${1:-}" = "--earshot" ] || [ "${2:-}" = "--earshot" ]; then
  step "earshot (lets Claude hear/review/make sounds; ~1.1 GB models, one time)"
  command -v uv >/dev/null || brew install uv
  uv tool install --force "earshot[mcp] @ git+https://github.com/Leonxlnx/earshot"
  earshot doctor --fetch
  command -v claude >/dev/null && claude mcp add earshot --scope user -e EARSHOT_THREADS=3 -- earshot mcp || true
  ok "earshot ready"
fi

step "Health check"
(cd hyperframes && npx --yes hyperframes@0.9.26 doctor) || true

if [ "${1:-}" = "--skills" ] || [ "${2:-}" = "--skills" ]; then
  step "HyperFrames AI skills for Claude Code"
  (cd hyperframes && npx --yes hyperframes@0.9.26 skills update)
fi

printf "\n\033[1mAll set.\033[0m Try:\n  ./scripts/new-project.sh my-reel\n  ./scripts/preview.sh sample\n  ./scripts/render.sh sample\n"

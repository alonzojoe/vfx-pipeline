#!/usr/bin/env bash
# Create a project:  input/<name>/ (your footage)  output/<name>/ (renders)
# plus an edit for HyperFrames and/or Remotion that reads straight from input/<name>
# and input/general.
#   ./scripts/new-project.sh "Rancho at Mula de Victoria"          # both engines
#   ./scripts/new-project.sh halloween hf                          # HyperFrames only
#   ./scripts/new-project.sh promo remotion                        # Remotion only
source "$(dirname "$0")/_project.sh"
[ $# -ge 1 ] || { echo "usage: new-project.sh <name> [both|hf|remotion]"; exit 1; }
NAME="$(slugify "$1")"; ENGINE="${2:-both}"
[ -n "$NAME" ] || { echo "invalid name"; exit 1; }
[ "$NAME" != "general" ] || { echo "'general' is reserved for shared resources"; exit 1; }

mkdir -p "$ROOT/input/$NAME" "$ROOT/output/$NAME" "$ROOT/input/general"

if [ "$ENGINE" = both ] || [ "$ENGINE" = hf ]; then
  D="$ROOT/hyperframes/$NAME"
  if [ -e "$D" ]; then echo "• hyperframes/$NAME already exists, skipped"; else
    mkdir -p "$D"
    for f in index.html meta.json hyperframes.json; do
      sed "s/__PROJECT__/$NAME/g" "$ROOT/hyperframes/_template/$f" > "$D/$f"
    done
    ln -s "../../input/$NAME" "$D/assets"      # assets/  -> input/<name>
    ln -s "../../input/general" "$D/general"   # general/ -> input/general
    ln -s "../vendor" "$D/vendor"              # local GSAP
    echo "✓ hyperframes/$NAME   (edit index.html)"
  fi
fi

if [ "$ENGINE" = both ] || [ "$ENGINE" = remotion ]; then
  D="$ROOT/remotion/src/projects/$NAME"
  if [ -e "$D" ]; then echo "• remotion/src/projects/$NAME already exists, skipped"; else
    mkdir -p "$D"
    for f in index.tsx Reel.tsx; do
      sed "s/__PROJECT__/$NAME/g" "$ROOT/remotion/src/_template/$f" > "$D/$f"
    done
    echo "✓ remotion/src/projects/$NAME   (edit Reel.tsx / index.tsx)"
  fi
  mkdir -p "$ROOT/remotion/public"
  [ -e "$ROOT/remotion/public/$NAME" ] || ln -s "../../input/$NAME" "$ROOT/remotion/public/$NAME"
  [ -e "$ROOT/remotion/public/general" ] || ln -s "../../input/general" "$ROOT/remotion/public/general"
fi

echo "✓ input/$NAME   ← drop footage here"
echo "✓ output/$NAME  ← renders land here"
echo
echo "Preview:  ./scripts/preview.sh $NAME [hf|remotion]"
echo "Render:   ./scripts/render.sh $NAME [hf|remotion|both]"

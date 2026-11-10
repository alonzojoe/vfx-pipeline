#!/usr/bin/env bash
# Lint + runtime-check a HyperFrames project.   ./scripts/check.sh halloween
source "$(dirname "$0")/_project.sh"
NAME="$(slugify "${1:?usage: check.sh <name>}")"
cd "$ROOT/hyperframes" && exec $HF check "$NAME"

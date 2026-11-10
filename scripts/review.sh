#!/usr/bin/env bash
# Pre-publish video review (see REVIEW.md). Usage: ./scripts/review.sh <project> [video.mp4]
exec node "$(dirname "$0")/review.mjs" "$@"

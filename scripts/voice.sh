#!/usr/bin/env bash
# ElevenLabs voiceover. Run with no args for help.
exec node "$(dirname "$0")/voice.mjs" "$@"

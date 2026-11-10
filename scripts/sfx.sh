#!/usr/bin/env bash
# Sound effects: search Openverse (commercial-safe), generate with ElevenLabs, or list the library. No args = help.
exec node "$(dirname "$0")/sfx.mjs" "$@"

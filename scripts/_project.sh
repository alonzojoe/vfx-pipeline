#!/usr/bin/env bash
# Shared bits for new-project / render / preview.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HF_VERSION="0.9.26"
HF="npx --yes hyperframes@$HF_VERSION"
# "Rancho at Mula de Victoria" -> "rancho-at-mula-de-victoria"
slugify(){ echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'; }
has_hf(){ [ -f "$ROOT/hyperframes/$1/index.html" ]; }
has_rm(){ [ -f "$ROOT/remotion/src/projects/$1/index.tsx" ]; }

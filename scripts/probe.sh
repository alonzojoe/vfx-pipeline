#!/usr/bin/env bash
# Show resolution, fps, duration, codecs of a file.   ./scripts/probe.sh input/x/clip.mov
set -euo pipefail
ffprobe -v error -show_entries format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,channels -of default=nw=1 "$1"

#!/usr/bin/env node
// Turns `hyperframes render` output into a few readable lines: render.sh pipes the engine through this filter.
//   - every line goes to the raw log file (argv[2]) for debugging
//   - `@hf-progress {...}` becomes "progress: 45% Rendering frames" (once per stage and every 5%) — the app draws its
//     progress bar from these lines
//   - errors stay visible; the trace JSON, lint chatter and redrawn progress bars are hidden
//   - the closing summary keeps only "rendered in 1m 52s"
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

const raw = createWriteStream(process.argv[2] || "/dev/null");
const STAGE = {
  compile: "Preparing", extract_video: "Preparing", process_audio: "Mixing audio", start_browsers: "Starting renderer",
  capture: "Rendering frames", encode: "Encoding video", assemble: "Finishing video",
};
let lastStage = "", lastPct = -1;
const show = (s) => process.stdout.write(s + "\n");

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  raw.write(line + "\n");
  for (const part of line.split("\r")) {
    const s = part.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").trim();
    if (!s) continue;
    const m = s.match(/^@hf-progress\s+(\{.*\})$/);
    if (m) {
      let p;
      try { p = JSON.parse(m[1]); } catch { continue; }
      const stage = STAGE[p.code] || "Rendering";
      const pct = Math.max(0, Math.min(100, Math.round(p.pct ?? 0)));
      if (stage !== lastStage || pct >= lastPct + 5 || (pct === 100 && lastPct !== 100)) {
        show(`progress: ${pct}% ${stage}`);
        lastStage = stage; lastPct = pct;
      }
      continue;
    }
    const done = s.match(/rendered in ([\dhms. ]+)/);
    if (done) { show(`  rendered in ${done[1].trim()}`); continue; }
    if (/^\[(INFO|WARN|DEBUG|non-blocking)\]|^\[hyperframes\]|^@hf-/.test(s)) continue;
    if (/^\[(ERROR|FATAL)\]|^error\b|^[✖✗]|\bfailed\b/i.test(s)) show(s);
  }
});
rl.on("close", () => raw.end());

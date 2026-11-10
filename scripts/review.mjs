#!/usr/bin/env node
// Pre-publish review: specs, loudness, silent gaps, voice seams + frame sheets for eyeballing graphics.
//   ./scripts/review.sh <project> [video.mp4]      (default: newest .mp4 in output/<project>/)
// Writes output/<project>/review/<video-name>/{REPORT.md, contact.jpg, beats.jpg}. See REVIEW.md.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [project, videoArg] = process.argv.slice(2);
if (!project) { console.log("usage: ./scripts/review.sh <project> [video.mp4]"); process.exit(1); }
const outDir = join(ROOT, "output", project);
let video = videoArg ? resolve(videoArg) : null;
if (!video) {
  const mp4s = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith(".mp4")).map((f) => join(outDir, f)) : [];
  if (!mp4s.length) { console.error(`No renders in output/${project}/`); process.exit(1); }
  video = mp4s.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}
const name = basename(video, ".mp4");
const revDir = join(outDir, "review", name); mkdirSync(revDir, { recursive: true });
const sh = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const rows = [];
const check = (ok, label, detail) => rows.push(`| ${ok === true ? "✅" : ok === "warn" ? "⚠️" : "❌"} | ${label} | ${detail} |`);

// ---- specs
const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", video], { encoding: "utf8" }));
const v = probe.streams.find((s) => s.codec_type === "video"), a = probe.streams.find((s) => s.codec_type === "audio");
const dur = Number(probe.format.duration);
const [fn, fd] = (v?.r_frame_rate || "0/1").split("/").map(Number); const fps = fd ? fn / fd : 0;
check(v?.width === 1080 && v?.height === 1920, "Resolution 1080×1920 (9:16)", `${v?.width}×${v?.height}`);
check(Math.abs(fps - 30) < 0.1 ? true : "warn", "Frame rate 30 fps", fps.toFixed(2));
check(v?.codec_name === "h264", "Video codec H.264", v?.codec_name);
check(!!a && a.codec_name === "aac", "Audio track AAC", a ? a.codec_name : "MISSING");
check(dur >= 15 && dur <= 60 ? true : "warn", "Length 15–60s (Shorts/Reels)", `${dur.toFixed(1)}s`);

// ---- loudness
const lr = sh("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
const I = Number((lr.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)?.[0]);
const TP = Number((lr.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop()?.match(/-?[\d.]+/)?.[0]);
check(Number.isFinite(I) ? (Math.abs(I + 14) <= 2 ? true : "warn") : "warn", "Loudness ≈ −14 LUFS (YouTube target)", Number.isFinite(I) ? `${I} LUFS` : "n/a");
check(Number.isFinite(TP) ? (TP <= -1 ? true : "warn") : "warn", "True peak ≤ −1 dBTP (no distortion)", Number.isFinite(TP) ? `${TP} dBTP` : "n/a");

// ---- silent gaps (dead air)
const sd = sh("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-af", "silencedetect=n=-40dB:d=0.8", "-f", "null", "-"]).stderr;
const starts = [...sd.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]));
const ends = [...sd.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const gaps = starts.map((s, i) => [s, ends[i]?.[1] ?? dur - s]).filter(([s, d]) => s > 0.3 && s + d < dur - 0.3);
check(gaps.length ? "warn" : true, "No dead air > 0.8s mid-video", gaps.length ? gaps.map(([s, d]) => `${s.toFixed(2)}s (${d.toFixed(2)}s)`).join(", ") : "none");

// ---- beats from the edit (line starts, actions) + voice seams
const html = join(ROOT, "hyperframes", project, "index.html");
let beats = [], seams = [];
if (existsSync(html)) {
  const h = readFileSync(html, "utf8");
  const attr = (re) => [...h.matchAll(re)].map((m) => Number(m[1]));
  beats = [...attr(/id="react-\d+"[^>]*data-start="([\d.]+)"/g).map((t) => t + 0.6),
           ...attr(/id="sfx-\d+-(?:ding|correct)"[^>]*data-start="([\d.]+)"/g).map((t) => t + 0.45)];
  seams = attr(/id="voice-(?:[2-9]|\d\d+)"[^>]*data-start="([\d.]+)"/g);
}
beats = [...new Set(beats.map((t) => Math.min(dur - 0.05, Math.round(t * 10) / 10)))].sort((x, y) => x - y);
check(seams.length ? "warn" : true, "Voice seams to listen to (pause cuts)", seams.length ? seams.map((t) => `${t.toFixed(2)}s`).join(", ") : "none (one continuous take)");

// ---- frame sheets
function sheet(times, file, cols) {
  if (!times.length) return false;
  const sel = times.map((t) => `eq(n\\,${Math.round(t * fps)})`).join("+");
  const n = times.length, r = Math.ceil(n / cols);
  const base = `select='${sel}',scale=270:-1`;
  const label = `,drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=6`;
  for (const lab of [label, ""]) {
    for (const sync of [["-fps_mode", "vfr"], ["-vsync", "vfr"]]) {   // new ffmpeg / old ffmpeg
      const res = sh("ffmpeg", ["-loglevel", "error", "-y", "-i", video, "-vf", `${base}${lab},tile=${cols}x${r}:padding=6:color=white`, ...sync, "-frames:v", "1", "-q:v", "3", file]);
      if (res.status === 0 && existsSync(file)) return true;
    }
  }
  return false;
}
const every = Array.from({ length: Math.floor(dur) }, (_, i) => i + 0.5);
const okC = sheet(every, join(revDir, "contact.jpg"), 8);
const okB = sheet(beats, join(revDir, "beats.jpg"), 6);

// ---- report
const checklist = existsSync(join(ROOT, "REVIEW.md"))
  ? readFileSync(join(ROOT, "REVIEW.md"), "utf8").split("\n## ").filter((s) => /^(Graphics|Motion|Audio|Content|Export)/.test(s)).map((s) => "### " + s.trim()).join("\n\n")
  : "";
const report = `# Review — ${name}

Video: \`${relative(ROOT, video)}\` · ${dur.toFixed(1)}s · reviewed ${new Date().toISOString().slice(0, 16).replace("T", " ")}

## Automatic checks
| | Check | Result |
|---|---|---|
${rows.join("\n")}

## Frames
- Every second: ${okC ? "`contact.jpg`" : "(failed to build)"}
- Every line start and action: ${okB ? "`beats.jpg`" : "(no beats found / failed)"} at ${beats.map((t) => t.toFixed(1) + "s").join(", ")}

## Manual checklist (tick every box before publishing)
${checklist}
`;
writeFileSync(join(revDir, "REPORT.md"), report);
console.log(rows.join("\n"));
console.log(`\n→ ${relative(ROOT, revDir)}/REPORT.md  (+ contact.jpg, beats.jpg) — now go through the manual checklist`);

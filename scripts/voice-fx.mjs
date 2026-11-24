#!/usr/bin/env node
// Voice enhancer — turns the raw ElevenLabs voice into the channel's own "Knowledge by Joe" sound.
// Runs after every voice generation (make.sh) and keeps the raw file next to it, so changing the preset never costs
// ElevenLabs credits:
//   input/<p>/voice/script.raw.mp3   ← what ElevenLabs made (kept)
//   input/<p>/voice/script.mp3       ← enhanced (what the reel plays)
//   input/<p>/voice/script.fx.json   ← which preset made it
// The length never changes (pitch is shifted without changing tempo), so script.words.json timings stay exact, and the
// level is matched to the raw voice, so the sound-effect mix stays balanced.
//
//   node scripts/voice-fx.mjs <project>                 # apply the preset from script.json "voice.fx" or brand.json
//   node scripts/voice-fx.mjs <project> --preset clear  # force one ("off" = raw voice)
//   node scripts/voice-fx.mjs --in a.mp3 --out b.mp3 --preset warm   # any file (samples, A/B tests)
//   node scripts/voice-fx.mjs --list
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each preset is an ffmpeg audio filter chain. Order: clean → shape → (pitch) → control → (room) → safety.
const CLEAN = "highpass=f=80,equalizer=f=250:t=q:w=1.2:g=-2";            // rumble + muddiness out
const DEESS = "deesser=i=0.35:m=0.5:f=0.5";                                // tame harsh "s"
const LIMIT = "alimiter=limit=0.89:attack=5:release=60:level=false";       // no clipping after the boosts
export const PRESETS = {
  clear: {
    about: "Clarity only — presence lift, less mud, soft compression. Closest to the raw voice.",
    chain: [CLEAN, "equalizer=f=3500:t=q:w=1:g=3", DEESS,
      "acompressor=threshold=-20dB:ratio=2.5:attack=10:release=120:makeup=1.5", LIMIT],
  },
  warm: {
    about: "Warm radio — fuller low-mids, clear presence, a little air, tighter compression.",
    chain: [CLEAN, "equalizer=f=170:t=q:w=1:g=2.5", "equalizer=f=450:t=q:w=1.5:g=-1.5",
      "equalizer=f=3000:t=q:w=1:g=3", "treble=g=2:f=9000", DEESS,
      "acompressor=threshold=-22dB:ratio=3.5:attack=8:release=110:makeup=2.5", LIMIT],
  },
  signature: {
    about: "The channel voice — Warm radio + 1 semitone deeper (same speed) + a very small room.",
    pitch: -1,
    chain: [CLEAN, "equalizer=f=170:t=q:w=1:g=2.5", "equalizer=f=450:t=q:w=1.5:g=-1.5",
      "equalizer=f=3000:t=q:w=1:g=3", "treble=g=2:f=9000", "@pitch", DEESS,
      "acompressor=threshold=-22dB:ratio=3.5:attack=8:release=110:makeup=2.5",
      "aecho=in_gain=1:out_gain=1:delays=17|29:decays=0.05|0.035", LIMIT],
  },
};

const sh = (args) => execFileSync("ffmpeg", ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
/** ffmpeg's log (stderr) — where analysis filters like ebur128 print their results */
const ffLog = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostdin", ...args], { encoding: "utf8" }).stderr || "";
let hasRubberband;
const rubberband = () => (hasRubberband ??= /\brubberband\b/.test(execFileSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" })));

/** Pitch shift without changing the length: rubberband when ffmpeg has it, else resample + tempo back. */
function pitchFilter(semitones, rate) {
  const k = Math.pow(2, semitones / 12);
  if (rubberband()) return `rubberband=pitch=${k.toFixed(5)}:transients=smooth:formant=shifted`;
  return `asetrate=${Math.round(rate * k)},aresample=${rate},atempo=${(1 / k).toFixed(5)}`;
}
const probe = (f, entry) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", entry, "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
/** Integrated loudness (LUFS) of a file. */
function lufs(f) {
  const m = [...ffLog(["-nostats", "-i", f, "-vn", "-af", "ebur128", "-f", "null", "-"]).matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  return m ? Number(m[1]) : null;
}

/** raw → out with a preset; same length, same loudness as the raw file. */
export function enhance(raw, out, presetName) {
  const p = PRESETS[presetName];
  if (!p) throw new Error(`unknown voice preset "${presetName}" (presets: ${Object.keys(PRESETS).join(", ")}, off)`);
  const rate = Number(probe(raw, "stream=sample_rate")) || 44100;
  const chain = p.chain.map((f) => (f === "@pitch" ? pitchFilter(p.pitch || 0, rate) : f)).join(",");
  const tmp = out.replace(/\.mp3$/, "") + ".fx-tmp.wav";
  sh(["-y", "-i", raw, "-af", chain, "-ar", String(rate), tmp]);
  const gain = (lufs(raw) ?? -20) - (lufs(tmp) ?? -20); // match the raw level so the SFX mix stays as tuned
  sh(["-y", "-i", tmp, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.94:level=false`, "-ar", String(rate),
    "-c:a", "libmp3lame", "-b:a", "192k", "-map_metadata", "-1", out]);
  rmSync(tmp, { force: true });
  const d0 = Number(probe(raw, "format=duration")), d1 = Number(probe(out, "format=duration"));
  if (Math.abs(d0 - d1) > 0.08) throw new Error(`voice length changed ${d0.toFixed(2)}s → ${d1.toFixed(2)}s — timings would drift`);
  return { gain, d0, d1, pitch: p.pitch ? (rubberband() ? "rubberband" : "resample") : null };
}

/** Which preset a project wants: script.json voice.fx → brand.json voiceFx → "off". */
export function presetFor(project) {
  const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; } };
  const s = read(join(ROOT, "hyperframes", project, "script.json"));
  const b = read(join(ROOT, "input/general/brand/brand.json"));
  return s.voice?.fx || b.voiceFx || "off";
}

/** Apply (or re-apply) the project's preset to input/<p>/voice/script.mp3, keeping the raw take. */
export function enhanceProject(project, force) {
  const dir = join(ROOT, "input", project, "voice");
  const mp3 = join(dir, "script.mp3"), raw = join(dir, "script.raw.mp3"), stamp = join(dir, "script.fx.json");
  if (!existsSync(mp3) && !existsSync(raw)) { console.log(`• voice fx: no voice yet for ${project}`); return; }
  const want = force || presetFor(project);
  const chain = want === "off" ? "off" : JSON.stringify(PRESETS[want]?.chain ?? want);
  let done = {};
  try { done = JSON.parse(readFileSync(stamp, "utf8")); } catch { /* not enhanced yet */ }
  // a fresh ElevenLabs take has no stamp: it IS the raw file
  if (!existsSync(raw) || !existsSync(stamp)) { if (existsSync(raw)) rmSync(raw); renameSync(mp3, raw); done = {}; }
  if (done.preset === want && done.chain === chain && existsSync(mp3)) { console.log(`✓ voice fx: ${want} (already applied)`); return; }
  if (want === "off") {
    copyFileSync(raw, mp3);
  } else {
    const r = enhance(raw, mp3, want);
    console.log(`✓ voice fx: ${want} · level matched (${r.gain >= 0 ? "+" : ""}${r.gain.toFixed(1)} dB) · ${r.d1.toFixed(2)}s, timings unchanged${r.pitch ? ` · pitch via ${r.pitch}` : ""}`);
  }
  writeFileSync(stamp, JSON.stringify({ preset: want, chain }, null, 2) + "\n");
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(`--${k}`); return i >= 0 ? a[i + 1] : undefined; };
  if (a.includes("--list")) {
    for (const [k, p] of Object.entries(PRESETS)) console.log(`${k.padEnd(10)} ${p.about}`);
    console.log(`${"off".padEnd(10)} The raw ElevenLabs voice.`);
  } else if (opt("in")) {
    const r = enhance(opt("in"), opt("out"), opt("preset") || "signature");
    console.log(`✓ ${opt("out")} · ${r.d0.toFixed(2)}s → ${r.d1.toFixed(2)}s · gain ${r.gain.toFixed(1)} dB`);
  } else if (a[0] && !a[0].startsWith("--")) {
    enhanceProject(a[0], opt("preset"));
  } else {
    console.log("usage: voice-fx.mjs <project> [--preset name] | --in a.mp3 --out b.mp3 --preset name | --list");
    process.exit(1);
  }
}

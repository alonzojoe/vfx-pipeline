#!/usr/bin/env node
// Voice enhancer — turns the raw ElevenLabs voice into the channel's own "Knowledge by Joe" sound.
// Runs after every voice generation (make.sh) and keeps the raw file next to it, so changing the preset never costs
// ElevenLabs credits:
//   input/<p>/voice/script.raw.mp3   ← what ElevenLabs made (kept)
//   input/<p>/voice/script.mp3       ← enhanced (what the reel plays)
//   input/<p>/voice/script.fx.json   ← which preset made it
// The length never changes (EQ + gentle dynamics only), so script.words.json timings stay exact, and the
// level is matched to the raw voice, so the sound-effect mix stays balanced.
//
//   node scripts/voice-fx.mjs <project>                 # apply the preset from script.json "voice.fx" or brand.json
//   node scripts/voice-fx.mjs <project> --preset clear  # force one ("off" = raw voice)
//   node scripts/voice-fx.mjs --in a.mp3 --out b.mp3 --preset warm   # any file (samples, A/B tests)
//   node scripts/voice-fx.mjs <project> --samples       # every preset → input/<p>/voice/samples/ to compare by ear
//   node scripts/voice-fx.mjs --list
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each preset is an ffmpeg audio filter chain. Rule: sound like a person, not a processor —
//  - gentle, wide EQ moves (±1–2 dB) instead of narrow boosts that sound "phone-y"
//  - soft-knee, slow-attack compression (ratio ≤ 2) so loud/soft words keep their emotion; no squashing
//  - no pitch shift, no echo, no de-esser artifacts — the voice's own tone stays
const CLEAN = "highpass=f=70:p=2,equalizer=f=320:t=q:w=1.4:g=-1.5";       // rumble + boxy mud out, gently
const GLUE = "acompressor=threshold=-18dB:ratio=1.8:attack=25:release=220:knee=6:makeup=1";  // even, still alive
const LIMIT = "alimiter=limit=0.93:attack=7:release=80:level=false";       // only catches peaks
export const PRESETS = {
  clear: {
    about: "Natural clarity — a touch less mud, gentle presence and air, light glue. Words easy to follow, tone untouched.",
    chain: [CLEAN, "equalizer=f=2600:t=q:w=0.9:g=1.5", "treble=g=1.5:f=8500:w=0.6", "deesser=i=0.15:m=0.4:f=0.55", GLUE, LIMIT],
  },
  warm: {
    about: "Natural warmth — fuller chest, smooth presence, soft air. Like a good mic close to a person: friendly, clear.",
    chain: [CLEAN, "equalizer=f=140:t=q:w=1.1:g=2", "equalizer=f=2400:t=q:w=0.8:g=1.2", "treble=g=1:f=9500:w=0.6",
      "deesser=i=0.15:m=0.4:f=0.55", GLUE, LIMIT],
  },
};

const sh = (args) => execFileSync("ffmpeg", ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
/** ffmpeg's log (stderr) — where analysis filters like ebur128 print their results */
const ffLog = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostdin", ...args], { encoding: "utf8" }).stderr || "";
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
  const chain = p.chain.join(",");
  const tmp = out.replace(/\.mp3$/, "") + ".fx-tmp.wav";
  sh(["-y", "-i", raw, "-af", chain, "-ar", String(rate), tmp]);
  const gain = (lufs(raw) ?? -20) - (lufs(tmp) ?? -20); // match the raw level so the SFX mix stays as tuned
  sh(["-y", "-i", tmp, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.94:level=false`, "-ar", String(rate),
    "-c:a", "libmp3lame", "-b:a", "192k", "-map_metadata", "-1", out]);
  rmSync(tmp, { force: true });
  const d0 = Number(probe(raw, "format=duration")), d1 = Number(probe(out, "format=duration"));
  if (Math.abs(d0 - d1) > 0.08) throw new Error(`voice length changed ${d0.toFixed(2)}s → ${d1.toFixed(2)}s — timings would drift`);
  return { gain, d0, d1 };
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
    console.log(`✓ voice fx: ${want} · level matched (${r.gain >= 0 ? "+" : ""}${r.gain.toFixed(1)} dB) · ${r.d1.toFixed(2)}s, timings unchanged`);
  }
  writeFileSync(stamp, JSON.stringify({ preset: want, chain }, null, 2) + "\n");
}

/** Every preset from the project's raw take → input/<p>/voice/samples/<preset>.mp3 (free, nothing else changes). */
export function samplesFor(project) {
  const dir = join(ROOT, "input", project, "voice");
  const raw = existsSync(join(dir, "script.raw.mp3")) ? join(dir, "script.raw.mp3") : join(dir, "script.mp3");
  if (!existsSync(raw)) throw new Error(`no voice yet for ${project}`);
  const out = join(dir, "samples");
  mkdirSync(out, { recursive: true });
  copyFileSync(raw, join(out, "off.mp3"));
  for (const k of Object.keys(PRESETS)) enhance(raw, join(out, `${k}.mp3`), k);
  console.log(`✓ samples: input/${project}/voice/samples/{off,${Object.keys(PRESETS).join(",")}}.mp3 — listen, then set "voiceFx" in brand.json`);
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(`--${k}`); return i >= 0 ? a[i + 1] : undefined; };
  if (a.includes("--list")) {
    for (const [k, p] of Object.entries(PRESETS)) console.log(`${k.padEnd(10)} ${p.about}`);
    console.log(`${"off".padEnd(10)} The raw ElevenLabs voice.`);
  } else if (opt("in")) {
    const r = enhance(opt("in"), opt("out"), opt("preset") || "warm");
    console.log(`✓ ${opt("out")} · ${r.d0.toFixed(2)}s → ${r.d1.toFixed(2)}s · gain ${r.gain.toFixed(1)} dB`);
  } else if (a[0] && !a[0].startsWith("--")) {
    if (a.includes("--samples")) samplesFor(a[0]);
    else enhanceProject(a[0], opt("preset"));
  } else {
    console.log("usage: voice-fx.mjs <project> [--preset name] | --in a.mp3 --out b.mp3 --preset name | --list");
    process.exit(1);
  }
}

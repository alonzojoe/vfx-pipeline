#!/usr/bin/env node
// ElevenLabs voiceover → input/<project>/voice/<name>.mp3 (+ <name>.words.json word timings)
// Reads vfx/.env. No npm dependencies (Node 22+).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = process.env;
const BASE = env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io";

const USAGE = `
Usage (from vfx/):
  ./scripts/voice.sh <project|general> "Text to say"            → input/<project>/voice/<auto-name>.mp3
  ./scripts/voice.sh <project> -f script.txt --name intro        → text from a file, custom name
  ./scripts/voice.sh <project> "Hi" --voice <id> --model eleven_v3 --speed 1.1 --stability 0.4
  ./scripts/voice.sh voices                                      → list your voices (name + id)
  ./scripts/voice.sh models                                      → list TTS models
Defaults come from .env (ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID, …).`;

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const die = (msg) => { console.error(msg); process.exit(1); };

function needKey() {
  if (!env.ELEVENLABS_API_KEY) die(`No ELEVENLABS_API_KEY. Open ${envFile} and paste your key after ELEVENLABS_API_KEY=`);
  return { "xi-api-key": env.ELEVENLABS_API_KEY };
}

async function api(path, init = {}) {
  const res = await fetch(BASE + path, { ...init, headers: { ...needKey(), ...(init.headers || {}) } });
  if (!res.ok) die(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return res.json();
}

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-f" || a === "--file") opts.file = argv[++i];
    else if (a.startsWith("--")) opts[a.slice(2)] = argv[++i];
    else opts._.push(a);
  }
  return opts;
}

// character-level alignment → [{ word, start, end }]
function toWords(al) {
  if (!al) return [];
  const words = [];
  let cur = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) words.push(cur); cur = null; return; }
    const s = al.character_start_times_seconds[i], e = al.character_end_times_seconds[i];
    if (!cur) cur = { word: ch, start: s, end: e };
    else { cur.word += ch; cur.end = e; }
  });
  if (cur) words.push(cur);
  return words.map((w) => ({ ...w, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = opts._;
  if (!cmd || cmd === "help" || opts.help !== undefined) return console.log(USAGE);

  if (cmd === "voices") {
    const { voices } = await api("/v1/voices");
    for (const v of voices) console.log(`${v.voice_id}  ${v.name}${v.category ? `  (${v.category})` : ""}`);
    return;
  }
  if (cmd === "models") {
    const models = await api("/v1/models");
    for (const m of models.filter((m) => m.can_do_text_to_speech)) console.log(`${m.model_id}  ${m.name}`);
    return;
  }

  const project = slugify(cmd);
  let text = opts.file ? readFileSync(resolve(process.cwd(), opts.file), "utf8") : rest.join(" ");
  text = text.trim();
  if (!project || !text) die(USAGE);

  if (project !== "general" && !existsSync(join(ROOT, "input", project)))
    console.warn(`(input/${project} didn't exist — creating it. Use ./scripts/new-project.sh for the full setup.)`);
  const outDir = join(ROOT, "input", project, "voice");
  mkdirSync(outDir, { recursive: true });

  const voice = opts.voice || env.ELEVENLABS_VOICE_ID;
  if (!voice) die("No voice id. Set ELEVENLABS_VOICE_ID in .env or pass --voice <id> (see ./scripts/voice.sh voices)");
  const format = opts.format || env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
  const num = (k, e, d) => Number(opts[k] ?? env[e] ?? d);
  const body = {
    text,
    model_id: opts.model || env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
    voice_settings: {
      stability: num("stability", "ELEVENLABS_STABILITY", 0.5),
      similarity_boost: num("similarity", "ELEVENLABS_SIMILARITY", 0.75),
      style: num("style", "ELEVENLABS_STYLE", 0),
      speed: num("speed", "ELEVENLABS_SPEED", 1),
      use_speaker_boost: true,
    },
  };

  const ext = format.startsWith("mp3") ? "mp3" : format.startsWith("wav") ? "wav" : format.startsWith("opus") ? "opus" : "pcm";
  let name = slugify(opts.name || text.split(/\s+/).slice(0, 5).join(" ")) || "voice";
  let n = 2;
  const base = name;
  while (existsSync(join(outDir, `${name}.${ext}`))) name = `${base}-${n++}`;

  console.log(`🎙  ${body.model_id} · voice ${voice} · ${text.length} chars…`);
  const data = await api(`/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const audioPath = join(outDir, `${name}.${ext}`);
  writeFileSync(audioPath, Buffer.from(data.audio_base64, "base64"));
  const words = toWords(data.alignment || data.normalized_alignment);
  const duration = words.length ? words[words.length - 1].end : null;
  writeFileSync(join(outDir, `${name}.words.json`),
    JSON.stringify({ text, voice, model: body.model_id, duration, words }, null, 2));

  const rel = (p) => p.replace(ROOT + "/", "");
  console.log(`✓ ${rel(audioPath)}${duration ? `  (${duration.toFixed(2)}s)` : ""}`);
  console.log(`✓ ${rel(join(outDir, `${name}.words.json`))}  (word timings for captions)`);
  const src = project === "general" ? `general/voice/${name}.${ext}` : `assets/voice/${name}.${ext}`;
  console.log(`\nHyperFrames:  <audio id="vo-${name}" data-start="0" data-duration="${duration ? Math.ceil(duration * 10) / 10 : "?"}" data-track-index="10" src="${src}"></audio>`);
  console.log(`Remotion:     <Audio src={staticFile("${project}/voice/${name}.${ext}")} />`);
}

main().catch((e) => die(e.stack || String(e)));

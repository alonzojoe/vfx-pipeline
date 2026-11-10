#!/usr/bin/env node
// Sound effects for the shared library (input/general/sfx). No npm dependencies (Node 22+).
//   ./scripts/sfx.sh search "cash register" [-n 5] [--cc0] [--long]   Openverse, commercial-safe licenses only
//   ./scripts/sfx.sh ai "cartoon pop, bright and short" [--dur 1] [--name pop-cartoon]   ElevenLabs sound generation
//   ./scripts/sfx.sh list [filter]                                       what's already in the library
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SFX = join(ROOT, "input", "general", "sfx");
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = process.env;
const OPENVERSE = env.OPENVERSE_BASE_URL || "https://api.openverse.org";
const ELEVEN = env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io";
const UA = "vfx-sfx-fetcher/1.0";

const USAGE = `
Usage (from vfx/):
  ./scripts/sfx.sh search "whoosh" [-n 5] [--cc0] [--long]   → input/general/sfx/openverse/  (+ CREDITS.md)
        commercial-safe only (CC0 / CC BY / CC BY-SA / PDM — never NonCommercial). --cc0 = no-credit-needed only.
  ./scripts/sfx.sh ai "cartoon pop, bright, short" [--dur 1] [--name pop-cartoon] [--influence 0.5]
        → input/general/sfx/ai/<name>.mp3   (ElevenLabs; paid plan = commercial use)
  ./scripts/sfx.sh list [filter]                              → browse the local library`;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "sfx";
const die = (m) => { console.error(m); process.exit(1); };
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-n") o.n = argv[++i];
    else if (a === "--cc0" || a === "--long") o[a.slice(2)] = true;
    else if (a.startsWith("--")) o[a.slice(2)] = argv[++i];
    else o._.push(a);
  }
  return o;
}
const SAFE = new Set(["cc0", "pdm", "by", "by-sa"]); // never nc / nd variants

async function search(q, o) {
  const n = Math.max(1, Math.min(20, Number(o.n || 5)));
  const p = new URLSearchParams({ q, page_size: String(Math.min(20, n * 3)), license: o.cc0 ? "cc0,pdm" : "cc0,pdm,by,by-sa", category: "sound_effect" });
  if (!o.long) p.set("length", "shortest,short");
  const res = await fetch(`${OPENVERSE}/v1/audio/?${p}`, { headers: { "User-Agent": UA } });
  if (!res.ok) die(`Openverse ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const hits = (data.results || []).filter((r) => SAFE.has(String(r.license).toLowerCase()) && r.url).slice(0, n);
  if (!hits.length) die(`No commercial-safe sound effects for "${q}". Try other words or --long.`);
  const dir = join(SFX, "openverse"); mkdirSync(dir, { recursive: true });
  const credits = join(dir, "CREDITS.md");
  if (!existsSync(credits)) writeFileSync(credits, "# Openverse sound credits\n\nPaste the credit line of every CC BY / CC BY-SA sound you use into the video description.\n\n| File | Title | Creator | License | Credit line |\n|---|---|---|---|---|\n");
  for (const r of hits) {
    const ext = (r.filetype || extname(new URL(r.url).pathname).slice(1) || "mp3").toLowerCase();
    const file = join(dir, `${slug(q)}--${slug(r.title || "sound")}-${String(r.id).slice(0, 6)}.${ext}`);
    if (existsSync(file)) { console.log(`• exists ${relative(ROOT, file)}`); continue; }
    const a = await fetch(r.url, { headers: { "User-Agent": UA } });
    if (!a.ok) { console.warn(`  skip (download ${a.status}): ${r.title}`); continue; }
    writeFileSync(file, Buffer.from(await a.arrayBuffer()));
    const lic = `${String(r.license).toUpperCase()} ${r.license_version || ""}`.trim();
    const credit = r.license === "cc0" || r.license === "pdm" ? "— (no credit needed)" : (r.attribution || `"${r.title}" by ${r.creator}, ${lic} (${r.license_url})`).replace(/\s+/g, " ").replace(/\|/g, "/");
    appendFileSync(credits, `| ${relative(dir, file)} | ${(r.title || "").replace(/\|/g, "/")} | ${(r.creator || "").replace(/\|/g, "/")} | ${lic} | ${credit} |\n`);
    const secs = r.duration ? ` ${(r.duration / 1000).toFixed(1)}s` : "";
    console.log(`✓ ${relative(ROOT, file)}${secs}  [${lic}]`);
  }
  console.log(`\nCredits logged in ${relative(ROOT, credits)}`);
}

async function ai(text, o) {
  if (!env.ELEVENLABS_API_KEY) die("No ELEVENLABS_API_KEY in .env");
  const body = { text, prompt_influence: Number(o.influence ?? 0.5) };
  if (o.dur) body.duration_seconds = Math.max(0.5, Math.min(30, Number(o.dur)));
  const res = await fetch(`${ELEVEN}/v1/sound-generation`, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });
  if (!res.ok) die(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const dir = join(SFX, "ai"); mkdirSync(dir, { recursive: true });
  let name = slug(o.name || text), file = join(dir, `${name}.mp3`), k = 2;
  while (existsSync(file)) file = join(dir, `${name}-${k++}.mp3`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  appendFileSync(join(dir, "PROMPTS.md"), `- ${relative(dir, file)} — "${text.replace(/\n/g, " ")}"${o.dur ? ` (${o.dur}s)` : ""}\n`);
  console.log(`✓ ${relative(ROOT, file)}`);
}

function list(filter = "") {
  const out = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(f)) out.push(relative(SFX, p)); } };
  walk(SFX);
  const hits = out.filter((p) => p.toLowerCase().includes(filter.toLowerCase())).sort();
  hits.forEach((p) => console.log(p));
  console.log(`\n${hits.length} sound(s)${filter ? ` matching "${filter}"` : ""} in input/general/sfx  (licenses: input/general/sfx/LICENSES.md)`);
}

const o = args(process.argv.slice(2));
const [cmd, ...rest] = o._;
const q = rest.join(" ").trim();
if (cmd === "search" && q) await search(q, o);
else if (cmd === "ai" && q) await ai(q, o);
else if (cmd === "list") list(q);
else console.log(USAGE);

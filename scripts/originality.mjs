#!/usr/bin/env node
// Originality check — YouTube's "inauthentic content" rules (YPP), applied to one reel before it's exported:
//   1. no "similar or repetitive content with low educational value … or minimal variation across videos"
//   2. no "highly similar storyline template across multiple videos" (same situation, same outcome)
//   3. no "templated storylines … with minimal narrative, commentary or educational value"
//   4. no "AI-generated content … giving the impression of mass production without the creator's original,
//      authentic insights or perspective"
// The two-comparison spine is fixed (BRAND.md §2), so this checks everything AROUND it against every earlier reel.
//
//   node scripts/originality.mjs <project>          # report; exit 1 when a rule fails (render.sh stops the export)
//   node scripts/originality.mjs <project> --json   # machine-readable
// ✗ fail = would break a rule · ! warn = too close to earlier reels, change it · ✓ ok
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HF = join(ROOT, "hyperframes");
const SKIP = new Set(["_template", "new-reel", "sample", "node_modules", "vendor"]);

// ---------- reading reels ----------
const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
/** Reels in the order they were made: TOPICS.md row order first, then the rest by script.json age. */
export function loadReels(root = ROOT) {
  const hf = join(root, "hyperframes");
  const topics = existsSync(join(root, "TOPICS.md")) ? readFileSync(join(root, "TOPICS.md"), "utf8") : "";
  const rows = [...topics.matchAll(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*([a-z0-9-]+)\s*\|\s*([^|]*)\|/gm)].map((m) => ({ name: m[1], topic: m[2].trim() }));
  const order = rows.map((r) => r.name);
  const reels = readdirSync(hf)
    .filter((n) => !SKIP.has(n) && !n.startsWith(".") && existsSync(join(hf, n, "script.json")))
    .map((n) => ({ name: n, s: readJson(join(hf, n, "script.json")), mtime: statSync(join(hf, n, "script.json")).mtimeMs }))
    .filter((r) => r.s?.lines?.length);
  const rank = (r) => { const i = order.lastIndexOf(r.name); return i >= 0 ? i : order.length + r.mtime / 1e13; };
  reels.sort((a, b) => rank(a) - rank(b));
  return { reels, rows };
}

// ---------- text helpers ----------
const norm = (t) => String(t || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const words = (t) => norm(t).split(" ").filter(Boolean);
const NUMBER = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|billion|half|twice|double|triple)\b/i;
const SPINE = /^(this is|these are|what's the difference|whats the difference)\b/;
const singular = (w) => w.replace(/ies$/, "y").replace(/([^sui])s$/, "$1"); // miles→mile, celsius stays
const term = (t) => words(t).filter((w) => !["a", "an", "the"].includes(w)).map(singular).join(" ");
const spoken = (s) => s.lines.filter((l) => !l.cta && l.text && l.text !== "auto");
/** The words that make THIS reel: everything said except the fixed spine and the CTA. */
const ownLines = (s) => spoken(s).map((l) => norm(l.text)).filter((t) => !SPINE.test(t));
function shingles(lines, n = 3) {
  const out = new Set();
  for (const l of lines) { const w = l.split(" "); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" ")); }
  return out;
}
const jaccard = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n); };
const bag = (xs) => { const m = new Map(); xs.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return m; };
const bagSim = (a, b) => { const A = bag(a), B = bag(b); let i = 0, u = 0; new Set([...A.keys(), ...B.keys()]).forEach((k) => { i += Math.min(A.get(k) || 0, B.get(k) || 0); u += Math.max(A.get(k) || 0, B.get(k) || 0); }); return u ? i / u : 0; };

/** "x|y" keys for the reel's comparisons (cards first, else TOPICS.md "A vs B + C vs D"). */
function pairKeys(s, topic) {
  const keys = [];
  for (const p of Object.values(s?.pairs || {})) {
    const a = s.cards?.[p.left]?.label || p.left, b = s.cards?.[p.right]?.label || p.right;
    if (a && b) keys.push([term(a), term(b)].sort().join("|"));
  }
  for (const part of String(topic || "").split("+")) {
    const m = part.split(/\bvs\.?\b/i);
    if (m.length === 2 && !/recap|tip/i.test(part)) keys.push([term(m[0]), term(m[1])].sort().join("|"));
  }
  return [...new Set(keys.filter((k) => !k.startsWith("|") && !k.endsWith("|")))];
}
/** What kind of opener: the hook must not repeat the previous reel's kind AND wording. */
function hookOf(s) {
  const first = spoken(s)[0]?.text || "";
  const t = norm(first);
  const kind = /^true or false/.test(t) ? "true-or-false" : /^this is\b/.test(t) ? "this-is" : /most people|everyone|wrong/.test(t) ? "myth"
    : first.trim().endsWith("?") ? "question" : NUMBER.test(first) ? "number" : "statement";
  return { text: first, kind, words: new Set(words(first)) };
}
const joeLines = (s) => spoken(s).filter((l) => /joe/i.test(l.recap?.term || "") || /\b(i|i'm|i've|i'd|my|me|mine)\b/i.test(l.text));
const sfxFamilies = (s) => new Set(JSON.stringify(s.sfx || {}).match(/sfx\/(?:uisfx|earshot)\/[a-z_]+/g) || []);
const cardColors = (s) => Object.values(s.cards || {}).map((c) => c.color || "-").join(",");

// ---------- the check ----------
export function check(project, root = ROOT) {
  const { reels, rows } = loadReels(root);
  const me = reels.find((r) => r.name === project) || { name: project, s: readJson(join(root, "hyperframes", project, "script.json")) };
  if (!me.s?.lines?.length) throw new Error(`hyperframes/${project}/script.json has no lines yet`);
  // compare with the reels made BEFORE this one (re-exporting an old reel isn't a copy of a newer one)
  const idx = reels.findIndex((r) => r.name === project);
  const others = idx >= 0 ? reels.slice(0, idx) : reels;
  const prev = others[others.length - 1];
  const topicOf = (n) => rows.find((r) => r.name === n)?.topic;
  const out = [];
  const add = (level, rule, msg) => out.push({ level, rule, msg });
  const s = me.s;

  // rule 1 + 2: never the same topic, never the same words around the spine
  const mine = pairKeys(s);
  for (const o of others) {
    const dup = pairKeys(o.s, topicOf(o.name)).filter((k) => mine.includes(k));
    if (dup.length) add("fail", "repetitive", `${dup.map((k) => k.replace("|", " vs ")).join(", ")} was already covered in ${o.name} — pick a new comparison`);
  }
  const myShingles = shingles(ownLines(s));
  const closest = others.map((o) => ({ name: o.name, sim: jaccard(myShingles, shingles(ownLines(o.s))) })).sort((a, b) => b.sim - a.sim)[0];
  if (closest && closest.sim >= 0.3) add("fail", "template", `${Math.round(closest.sim * 100)}% of the script matches ${closest.name} word for word — rewrite it`);
  else if (closest && closest.sim >= 0.15) add("warn", "template", `${Math.round(closest.sim * 100)}% of the script overlaps ${closest.name} — reword the lines that match`);
  else add("ok", "template", `script is its own (closest: ${closest ? `${closest.name}, ${Math.round(closest.sim * 100)}% overlap` : "no earlier reels"})`);

  // rule 2: the hook / storyline must change from the previous reel
  if (prev) {
    const a = hookOf(s), b = hookOf(prev.s);
    const sim = jaccard(a.words, b.words);
    if (a.kind === b.kind && sim >= 0.5) add("fail", "storyline", `the hook copies ${prev.name}'s ("${b.text}") — open differently`);
    else if (a.kind === b.kind) add("warn", "storyline", `same kind of hook as ${prev.name} (${a.kind}) — try a ${a.kind === "question" ? "surprising number or true-or-false" : "question or surprising number"} opener`);
    else add("ok", "storyline", `hook is a ${a.kind}, ${prev.name} opened with a ${b.kind}`);
    if (cardColors(s) && cardColors(s) === cardColors(prev.s)) add("warn", "variation", `same card colours as ${prev.name} (${cardColors(s)})`);
    const stick = bagSim(spoken(s).map((l) => l.react || ""), spoken(prev.s).map((l) => l.react || ""));
    if (stick >= 0.85) add("warn", "variation", `stickers are ${Math.round(stick * 100)}% the same as ${prev.name} — swap a few reactions`);
    const fam = jaccard(sfxFamilies(s), sfxFamilies(prev.s));
    if (fam >= 0.8) add("warn", "variation", `sound effects are the same families as ${prev.name} — change the uisfx style / earshot sounds`);
  }

  // rule 1 + 3: real educational value — a real example with numbers in every comparison, facts on every card
  for (const [pid, p] of Object.entries(s.pairs || {})) {
    const lines = s.lines.filter((l) => l.pair === pid && !l.show && !l.question && !l.cta);
    const examples = lines.filter((l) => !l.focus);
    if (!examples.length && lines.length <= 2) add("fail", "educational", `${p.left} vs ${p.right} only names and defines them — add a real example (e.g. "water boils at 100 °C, which is 212 °F")`);
    else if (!lines.some((l) => NUMBER.test(l.text))) add("warn", "educational", `${p.left} vs ${p.right} has no number in its example — a real figure teaches more`);
  }
  const bare = Object.entries(s.cards || {}).filter(([, c]) => !c.html && !(c.facts || []).length).map(([k]) => k);
  if (bare.length) add("warn", "educational", `cards without facts: ${bare.join(", ")} — add 1–3 checked facts`);
  const n = spoken(s).reduce((a, l) => a + words(l.text).length, 0);
  if (n < 60) add("warn", "educational", `only ${n} spoken words — too thin to teach something`);
  if (!Object.values(s.cards || {}).some((c) => c.art) && !s.intro?.art) add("warn", "slideshow", "no drawn art or motion anywhere — cards with only text read like a slideshow");

  // rule 4: the creator's own perspective
  const joe = joeLines(s);
  if (!joe.length) add("fail", "perspective", "no line in Joe's own voice — add his take, a personal moment or a memory trick");
  else if (joe.some((l) => l.joeDraft)) add("warn", "perspective", `Joe's line is still a draft: "${joe.find((l) => l.joeDraft).text}" — say it in your own words (or confirm it in the chat)`);
  else add("ok", "perspective", `Joe's take: "${joe[joe.length - 1].text}"`);
  if (!out.some((o) => o.rule === "repetitive")) add("ok", "repetitive", `new topic: ${mine.map((k) => k.replace("|", " vs ")).join(" + ") || "(no pairs)"}`);
  if (!out.some((o) => o.rule === "educational")) add("ok", "educational", "every comparison has a real example with numbers, every card has facts");

  return { project, prev: prev?.name || null, compared: others.length, results: out, pass: !out.some((o) => o.level === "fail") };
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [project, ...flags] = process.argv.slice(2);
  if (!project) { console.log("usage: originality.mjs <project> [--json]"); process.exit(2); }
  let r;
  try { r = check(project); } catch (e) { console.log(`originality: ${e.message}`); process.exit(2); }
  if (flags.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    const icon = { ok: "✓", warn: "!", fail: "✗" };
    console.log(`Originality (YouTube's repetitive / mass-produced rules) — ${project} vs ${r.compared} earlier reels`);
    for (const o of [...r.results].sort((a, b) => "fail warn ok".indexOf(a.level) - "fail warn ok".indexOf(b.level))) console.log(`  ${icon[o.level]} ${o.rule.padEnd(12)} ${o.msg}`);
    console.log(r.pass ? "  → original enough to export" : "  → fix the ✗ lines before exporting (ORIGINALITY=off ./scripts/render.sh skips this check)");
  }
  process.exit(r.pass ? 0 : 1);
}

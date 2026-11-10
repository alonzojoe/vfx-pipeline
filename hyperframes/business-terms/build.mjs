#!/usr/bin/env node
// Builds index.html for this explainer reel from script.json.
// Timing comes from the ElevenLabs word timings (assets/voice/script.words.json) when present,
// otherwise it's estimated so you can preview before generating the voice.
//   node build.mjs              → writes index.html
//   node build.mjs --print-text → prints the voiceover text (used by make.sh)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { applyOverrides } from "../../scripts/overrides.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const PROJECT = basename(HERE);
let PH = 0; for (const ch of PROJECT) PH = (PH * 31 + ch.charCodeAt(0)) >>> 0;   // stable per-project "random"

// The reel logged right BEFORE this one in TOPICS.md (stable even after newer reels are added)
const TOPICS = join(HERE, "..", "..", "TOPICS.md");
function prevRow() {
  if (!existsSync(TOPICS)) return null;
  const rows = readFileSync(TOPICS, "utf8").split("\n").filter((r) => /^\|\s*\d{4}-/.test(r));
  const own = rows.findIndex((r) => r.includes(`| ${PROJECT} |`));
  return own > 0 ? rows[own - 1] : own === 0 ? null : rows[rows.length - 1] ?? null;
}

// ---------- CTA: randomized per reel — follow / like / save — never the same type as the previous reel ----------
// script.json: { "text": "auto", "cta": true }  → picks here (or force a type with "ctaType": "save").
// Log the type in TOPICS.md ("cta: save") so the next reel picks a different one.
const CTA_POOL = {
  follow: ["Follow for more big ideas!", "Follow for more everyday knowledge!", "Follow so you learn something new every day!"],
  like: ["Like this video if you learned something!", "Hit like if this made sense!"],
  save: ["Save this video so you don't forget!", "Save this video for later!"],
};
const CTA_TYPES = Object.keys(CTA_POOL);
let CTA_TYPE = null;
S.lines.forEach((l) => {
  if (!l.cta) return;
  if (l.text && l.text !== "auto") { CTA_TYPE = l.ctaType || (/^save/i.test(l.text) ? "save" : /like/i.test(l.text) ? "like" : "follow"); return; }
  const prevType = ((prevRow() || "").match(/cta:\s*(\w+)/) || [])[1];
  let t = l.ctaType || CTA_TYPES[PH % CTA_TYPES.length];
  if (!l.ctaType && t === prevType) t = CTA_TYPES[(PH + 1) % CTA_TYPES.length];
  CTA_TYPE = t;
  l.text = CTA_POOL[t][(PH >>> 4) % CTA_POOL[t].length];
});
const fullText = S.lines.map((l) => l.text).join(" ");
if (process.argv.includes("--print-text")) { process.stdout.write(fullText + "\n"); process.exit(0); }

const STICKER_DIR = "general/my different reactions";
const STICKER_URL = STICKER_DIR.replace(/ /g, "%20");
const STICKERS = JSON.parse(readFileSync(join(HERE, STICKER_DIR, "stickers.json"), "utf8")).stickers;

// ---------- background: one image from general/background per video ----------
// script.json "background": "auto" (default) picks deterministically from the project name, skipping the background
// the previous video in TOPICS.md used, so consecutive reels never share one. Or set a filename to force it.
const BG_DIR = join(HERE, "general", "background");
const bgFiles = existsSync(BG_DIR) ? readdirSync(BG_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
function pickBackground() {
  const want = S.background ?? "auto";
  if (want && want !== "auto") return bgFiles.includes(want) ? want : (console.warn(`⚠ background "${want}" not in general/background`), null);
  if (!bgFiles.length) return null;
  let pick = bgFiles[PH % bgFiles.length];
  const prevBg = ((prevRow() || "").match(/bg:\s*([^|\s·]+)/) || [])[1];
  if (bgFiles.length > 1 && prevBg === pick) pick = bgFiles[(PH + 1) % bgFiles.length];
  return pick;
}
const BG = pickBackground();

// ---------- channel badge (fixed, whole video) from general/brand/brand.json ----------
const BRAND_FILE = join(HERE, "general", "brand", "brand.json");
const BRAND = existsSync(BRAND_FILE) ? JSON.parse(readFileSync(BRAND_FILE, "utf8")) : null;

const W = 1080, H = 1920;
const r3 = (n) => Math.round(n * 1000) / 1000;
const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- layout ----------
const L = {
  captionTop: 200,
  cardTop: 370,            // wrapper top (label 90px + card 560px)
  cardW: 460, cardH: 560, labelH: 90,
  slots: { left: 60, right: 560 },
  charTop: 1050, charW: 620, charH: 470,   // sticker ends ≈1520
  badgeTop: 1635, badgeH: 84,             // channel handle ≈1635–1719: as low as possible while staying above Reels/Shorts caption UI
  charShift: 130,          // how far the sticker slides toward the side it points from
};
const cardBottom = L.cardTop + L.labelH + L.cardH;               // 1020
const cardTarget = (side) => ({ x: L.slots[side] + L.cardW / 2, y: cardBottom + 14 });

// ---------- timing ----------
const tokens = fullText.split(/\s+/).filter(Boolean);
const voiceAudio = join(HERE, "assets/voice/script.mp3");
const voiceWords = join(HERE, "assets/voice/script.words.json");
let words, hasVoice = false;
if (existsSync(voiceWords) && existsSync(voiceAudio)) {
  const vw = JSON.parse(readFileSync(voiceWords, "utf8")).words;
  if (vw.length === tokens.length) { words = vw; hasVoice = true; }
  else console.warn(`⚠ voice has ${vw.length} words but script has ${tokens.length} — run ./make.sh --revoice. Using estimates.`);
}
if (!words) {
  let t = 0.3;
  words = tokens.map((w) => {
    const d = 0.16 + 0.045 * w.length;
    const out = { word: w, start: r3(t), end: r3(t + d) };
    t += d + 0.04 + (/[,;]$/.test(w) ? 0.22 : /[.?!]$/.test(w) ? 0.5 : 0);
    return out;
  });
}
let wi = 0;
const lines = S.lines.map((l) => {
  const n = l.text.split(/\s+/).filter(Boolean).length;
  const ws = words.slice(wi, wi + n); wi += n;
  return { ...l, words: ws, start: Math.max(0, r3(ws[0].start - 0.08)) };
});
// With a real voice: re-time the silences of the single take (never the words).
// - after a line with "pause": silence = exactly that many seconds (important beats)
// - other line ends: natural gap capped at maxLineGap (ElevenLabs often leaves 0.6–0.8s of dead air)
// - inside a line: natural gap capped at maxWordGap
// Every cut sits inside the silence between two words (never in a word, nothing replayed), with tiny fades.
const voiceClips = [];
if (hasVoice) {
  const MAX_LINE = S.maxLineGap ?? 0.38, MAX_WORD = S.maxWordGap ?? 0.28;
  const flat = []; lines.forEach((l, li) => l.words.forEach((w, wi) => flat.push({ ...w, li, last: wi === l.words.length - 1 })));
  const shift = new Array(flat.length).fill(0);
  let off = 0, clipSrc = Math.max(0, flat[0].start - 0.06), clipAt = clipSrc;
  for (let k = 0; k < flat.length - 1; k++) {
    const cur = flat[k], nxt = flat[k + 1], natural = nxt.start - cur.end;
    const l = lines[cur.li];
    const target = cur.last ? (l.pause != null ? l.pause : Math.min(natural, MAX_LINE)) : Math.min(natural, MAX_WORD);
    if (Math.abs(target - natural) > 0.02) {
      const tail = Math.max(0, Math.min(0.08, natural / 2)), head = Math.max(0, Math.min(0.06, natural / 2));
      const aSrc = cur.end + tail, bSrc = nxt.start - head;
      voiceClips.push({ at: r3(clipAt), media: r3(clipSrc), dur: r3(aSrc - clipSrc) });
      off += target - natural;
      clipSrc = bSrc; clipAt = bSrc + off;
    }
    shift[k + 1] = off;
  }
  const lastW = flat[flat.length - 1];
  voiceClips.push({ at: r3(clipAt), media: r3(clipSrc), dur: r3(lastW.end + 0.35 - clipSrc) });
  let k = 0;
  lines.forEach((l) => {
    l.words = l.words.map((w) => { const o = shift[k++]; return { ...w, start: r3(w.start + o), end: r3(w.end + o) }; });
    l.start = Math.max(0, r3(l.words[0].start - 0.08));
  });
}
const lastLine = lines[lines.length - 1];
const total = r3(lastLine.words[lastLine.words.length - 1].end + (S.outro ?? 1));
lines.forEach((l, i) => { l.end = i < lines.length - 1 ? lines[i + 1].start : total; });

// ---------- cards ----------
const CARDS = {
  revenue: { label: "Revenue", html: `
    <div class="doc biz">
      <div class="doc-head"><span class="brand"><i></i>Joe's Shop</span><span class="doc-title">SALES</span></div>
      <div class="meta"><div>Money coming in · this month</div></div>
      <div class="rows">
        <div id="rev-products" class="later"><span>Products sold</span><b class="pos">+$6,500</b></div>
        <div id="rev-services" class="later"><span>Services</span><b class="pos">+$3,500</b></div>
      </div>
      <div class="tot-box"><div class="lbl">Total revenue</div><div id="rev-total" class="amt">$10,000</div></div>
    </div>` },
  profit: { label: "Profit", html: `
    <div class="doc biz">
      <div class="doc-head"><span class="brand"><i></i>Joe's Shop</span><span class="doc-title">PROFIT</span></div>
      <div class="meta"><div>What Joe keeps</div></div>
      <div class="rows">
        <div><span>Revenue</span><b class="pos">$10,000</b></div>
        <div id="pr-exp" class="later exp"><span>Expenses<small>rent · supplies · staff</small></span><b class="neg">−$7,000</b></div>
      </div>
      <div class="tot-box green"><div class="lbl">Profit · what's left</div>
        <div class="amt swap"><span id="pr-old">$ ?</span><span id="pr-new" class="later pos">$3,000</span></div></div>
    </div>` },
  assets: { label: "Assets", html: `
    <div class="doc biz">
      <div class="doc-head"><span class="brand"><i></i>Joe's Shop</span><span class="doc-title">ASSETS</span></div>
      <div class="meta"><div>What Joe's shop owns</div></div>
      <div class="rows">
        <div id="as-cash" class="later"><span>Cash</span><b class="pos">$3,000</b></div>
        <div id="as-building" class="later"><span>Building</span><b class="pos">$90,000</b></div>
        <div id="as-equip" class="later"><span>Equipment</span><b class="pos">$7,000</b></div>
      </div>
      <div id="as-total" class="tot-box green later"><div class="lbl">Total Joe owns</div><div class="amt pos">$100,000</div></div>
    </div>` },
  liabilities: { label: "Liabilities", html: `
    <div class="doc biz">
      <div class="doc-head"><span class="brand"><i></i>Joe's Shop</span><span class="doc-title">LIABILITIES</span></div>
      <div class="meta"><div>What Joe's shop owes</div></div>
      <div class="rows">
        <div id="li-loan" class="later"><span>Bank loan</span><b class="neg">$40,000</b></div>
        <div id="li-bills" class="later"><span>Unpaid bills</span><b class="neg">$1,200</b></div>
        <div id="li-debt" class="later"><span>Card debt</span><b class="neg">$800</b></div>
      </div>
      <div id="li-total" class="tot-box red later"><div class="lbl">Total Joe owes</div><div class="amt neg">$42,000</div></div>
    </div>` },
};

// ---------- build ----------
const els = [], fx = [], audio = [], tl = [];
const sfxCues = [];
const cue = (key, at) => sfxCues.push({ key, at: r3(at) });

// full-frame paper background (2% overscale hides edge artifacts) with a slow drift
if (BG) {
  els.push(`<img id="bg-paper" class="clip bg" src="general/background/${BG.replace(/ /g, "%20")}" alt="" data-start="0" data-duration="${total}" data-track-index="0" />`);
  tl.push(`tl.fromTo("#bg-paper", {scale:1.02}, {scale:1.07, duration:${total}, ease:"none"}, 0);`);
}

// cards (+ focus ring) per pair
const pairIds = [...new Set(lines.map((l) => l.pair))].filter((p) => S.pairs[p]);
pairIds.forEach((pid, pi) => {
  const pl = lines.filter((l) => l.pair === pid);
  const pairEnd = pl[pl.length - 1].end;
  const isLast = pairEnd >= total - 0.01;
  if (!isLast) cue("whoosh", pairEnd - 0.34);
  for (const side of ["left", "right"]) {
    const key = S.pairs[pid][side];
    const showLine = pl.find((l) => l.show === side) || pl[0];
    const start = showLine.start, id = `card-${key}`;
    els.push(`<div id="${id}" class="clip card-wrap" style="left:${L.slots[side]}px" data-start="${start}" data-duration="${r3(pairEnd - start)}" data-track-index="${1 + (side === "right")}">
        <div class="card-label">${CARDS[key].label}</div><div class="card">${CARDS[key].html}</div></div>`);
    tl.push(`tl.fromTo("#${id}", {scale:0.4, opacity:0, y:60, rotation:${side === "left" ? -8 : 8}}, {scale:1, opacity:1, y:0, rotation:0, duration:0.5, ease:"back.out(1.9)"}, ${start});`);
    if (!isLast) tl.push(`tl.to("#${id}", {scale:0.7, opacity:0, x:${side === "left" ? -120 : 120}, duration:0.32, ease:"power2.in"}, ${r3(pairEnd - 0.32)});`);
  }
});

// focus / dim / ring per line
lines.forEach((l) => {
  const P = S.pairs[l.pair];
  if (!P) return;   // recap / CTA lines have no cards
  const C = (s) => `#card-${P[s]}`;
  const target = l.focus || l.show;
  if (l.show) {
    // newly shown card is the target; the other (if visible) dims a bit
    const other = l.show === "left" ? "right" : "left";
    if (l.show === "right") tl.push(`tl.to("${C(other)}", {scale:0.95, opacity:0.55, duration:0.3}, ${l.start});`);
  } else if (l.focus) {
    const other = l.focus === "left" ? "right" : "left";
    tl.push(`tl.to("${C(l.focus)}", {scale:1.06, opacity:1, duration:0.35, ease:"power3.out"}, ${l.start});`);
    tl.push(`tl.to("${C(other)}", {scale:0.92, opacity:0.3, duration:0.35, ease:"power3.out"}, ${l.start});`);
  } else {
    tl.push(`tl.to(["${C("left")}","${C("right")}"], {scale:1, opacity:1, duration:0.3, ease:"power3.out"}, ${l.start});`);
  }
  // no border/ring on the target card: the arrow alone points at it (a ring covers the card label)
  // "What's the difference?" → both cards wiggle + floating question marks
  if (l.question || /difference\?/i.test(l.text)) {
    tl.push(`tl.to(["${C("left")}","${C("right")}"], {rotation:3, duration:0.09, yoyo:true, repeat:5, ease:"sine.inOut"}, ${r3(l.start + 0.1)});`);
    tl.push(`tl.set(["${C("left")}","${C("right")}"], {rotation:0}, ${r3(l.start + 0.7)});`);
    const qs = [[250, 1120, -14], [800, 1090, 12], [880, 1300, 18]];
    qs.forEach(([x, y, rot], k) => {
      const id = `q-${l.start.toString().replace(".", "_")}-${k}`;
      fx.push(`<div id="${id}" class="clip qmark" style="left:${x}px;top:${y}px" data-start="${r3(l.start + k * 0.12)}" data-duration="${r3(l.end - l.start - k * 0.12)}" data-track-index="7">?</div>`);
      tl.push(`tl.fromTo("#${id}", {scale:0, rotation:${rot * 2}, y:30, opacity:0}, {scale:1, rotation:${rot}, y:0, opacity:1, duration:0.35, ease:"back.out(3)"}, ${r3(l.start + k * 0.12)});`);
      tl.push(`tl.to("#${id}", {y:-26, duration:0.6, yoyo:true, repeat:1, ease:"sine.inOut"}, ${r3(l.start + 0.45 + k * 0.12)});`);
    });
  }
});

// recap: 2x2 tiles that tick in one per line and stay until the end
const recapLines = lines.filter((l) => l.recap);
recapLines.forEach((l, k) => {
  const col = k % 2, row = Math.floor(k / 2);
  const x = L.slots[col ? "right" : "left"], y = L.cardTop + 40 + row * 300;
  const id = `recap-${k + 1}`;
  els.push(`<div id="${id}" class="clip recap-tile" style="left:${x}px;top:${y}px" data-start="${l.start}" data-duration="${r3(total - l.start)}" data-track-index="3">
      <div class="rt-term"${l.recap.term.length > 8 ? ' style="font-size:72px"' : ""}>${esc(l.recap.term)}</div><div class="rt-eq">= ${esc(l.recap.means)}</div><div class="rt-check">✓</div></div>`);
  tl.push(`tl.fromTo("#${id}", {scale:0.5, opacity:0, rotation:${col ? 6 : -6}}, {scale:1, opacity:1, rotation:0, duration:0.45, ease:"back.out(2)"}, ${l.start});`);
  tl.push(`tl.fromTo("#${id} .rt-check", {scale:0}, {scale:1, duration:0.3, ease:"back.out(3)"}, ${r3(l.start + 0.35)});`);
  // the newest tile is the one being said; earlier ones dim slightly
  recapLines.slice(0, k).forEach((_, m) => tl.push(`tl.to("#recap-${m + 1}", {opacity:0.55, scale:0.96, duration:0.3}, ${l.start});`));
});
if (recapLines.length) cue("whoosh-big", recapLines[0].start - 0.12);
const ctaLine = lines.find((l) => l.cta);
if (ctaLine && recapLines.length) tl.push(`tl.to(${JSON.stringify(recapLines.map((_, m) => `#recap-${m + 1}`))}, {opacity:1, scale:1, duration:0.3}, ${ctaLine.start});`);

// captions at the top: 1–3 word chunks, break on punctuation
let ci = 0;
lines.forEach((l) => {
  const chunks = []; let cur = [];
  l.words.forEach((w, i) => {
    cur.push(w);
    if (cur.length === 3 || /[,.?!;]$/.test(w.word) || i === l.words.length - 1) { chunks.push(cur); cur = []; }
  });
  chunks.forEach((c, k) => {
    const start = k === 0 ? l.start : r3(c[0].start - 0.04);
    const end = k < chunks.length - 1 ? r3(chunks[k + 1][0].start - 0.04) : l.end;
    const id = `cap-${++ci}`;
    els.push(`<div id="${id}" class="clip caption" data-start="${start}" data-duration="${r3(end - start)}" data-track-index="4">${esc(c.map((w) => w.word).join(" "))}</div>`);
    tl.push(`tl.fromTo("#${id}", {scale:0.75, opacity:0, y:10}, {scale:1, opacity:1, y:0, duration:0.18, ease:"back.out(2.5)"}, ${start});`);
  });
});

// reactions: one sticker per line (merged when repeated), slides toward the side it points from,
// with a hand-drawn arrow from the fingertip straight to the card being talked about.
const charPlace = (name, cx) => {
  const st = STICKERS[name]; if (!st) throw new Error(`Unknown sticker "${name}" — see ${STICKER_DIR}/stickers.json`);
  const s = Math.min(L.charW / st.w, L.charH / st.h);
  const w = st.w * s, h = st.h * s;
  const left = cx - w / 2, top = L.charTop + L.charH - h;
  return { st, w, h, left, top, tip: st.tip ? { x: left + st.tip[0] * w, y: top + st.tip[1] * h } : null };
};
lines.forEach((l, i) => {
  const same = i > 0 && lines[i - 1].react === l.react && lines[i - 1].focus === l.focus && lines[i - 1].show === l.show;
  const st = STICKERS[l.react];
  const target = l.focus || l.show;
  // slide away from the target so the finger aims across at it
  let shift = 0;
  if (st?.dir && target) shift = (target === "left" ? 1 : -1) * L.charShift;
  if (st?.dir === "left" || st?.dir === "up-left") shift = Math.abs(shift) || L.charShift;
  if (st?.dir === "right" || st?.dir === "up-right") shift = -(Math.abs(shift) || L.charShift);
  const cx = W / 2 + shift;
  if (!same) {
    let j = i; while (j + 1 < lines.length && lines[j + 1].react === l.react && lines[j + 1].focus === l.focus && lines[j + 1].show === l.show) j++;
    const id = `react-${i + 1}`;
    const p = charPlace(l.react, cx);
    els.push(`<img id="${id}" class="clip reaction" src="${STICKER_URL}/${l.react}.png" alt="" style="left:${r1(p.left)}px;top:${r1(p.top)}px;width:${r1(p.w)}px;height:${r1(p.h)}px" data-start="${l.start}" data-duration="${r3(lines[j].end - l.start)}" data-track-index="5" />`);
    tl.push(`tl.fromTo("#${id}", {scaleX:1.14, scaleY:0.86, y:40, opacity:0}, {scaleX:1, scaleY:1, y:0, opacity:1, duration:0.42, ease:"elastic.out(1, 0.55)"}, ${l.start});`);
    // (no ink "impact burst" lines: they read as stray doodles once the sticker slides — removed after review)

    // arrow from fingertip → target card
    if (p.tip && target && S.pairs[l.pair]) {
      const to = cardTarget(target);
      const from = { x: p.tip.x + (to.x < p.tip.x ? -18 : 18), y: p.tip.y - 22 };
      const mid = { x: (from.x + to.x) / 2 + (to.x < from.x ? 60 : -60), y: (from.y + to.y) / 2 + 20 };
      // approx length of the quadratic curve
      let len = 0, prev = from;
      for (let k = 1; k <= 30; k++) { const t = k / 30; const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x; const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y; len += Math.hypot(x - prev.x, y - prev.y); prev = { x, y }; }
      const ang = Math.atan2(to.y - mid.y, to.x - mid.x) * 180 / Math.PI;
      const aid = `arrow-${i + 1}`;
      const t0 = r3(l.start + 0.18);
      fx.push(`<svg id="${aid}" class="clip arrow" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-start="${t0}" data-duration="${r3(lines[j].end - t0 - 0.05)}" data-track-index="8">
        <path id="${aid}-p" d="M${r1(from.x)},${r1(from.y)} Q${r1(mid.x)},${r1(mid.y)} ${r1(to.x)},${r1(to.y)}" stroke-dasharray="${r1(len)}" stroke-dashoffset="${r1(len)}" />
        <g transform="translate(${r1(to.x)},${r1(to.y)}) rotate(${r1(ang)})"><path id="${aid}-h" d="M-34,-22 L4,0 L-34,22" /></g></svg>`);
      tl.push(`tl.to("#${aid}-p", {strokeDashoffset:0, duration:0.32, ease:"power2.out"}, ${t0});`);
      tl.push(`tl.fromTo("#${aid}-h", {opacity:0, scale:0.2, transformOrigin:"0px 0px"}, {opacity:1, scale:1, duration:0.18, ease:"back.out(3)"}, ${r3(t0 + 0.28)});`);
      tl.push(`tl.to("#${aid}", {opacity:0, duration:0.2}, ${r3(lines[j].end - 0.25)});`);
      // card gets a little bump when the arrow lands
      if (S.pairs[l.pair]) tl.push(`tl.fromTo("#card-${S.pairs[l.pair][target]} .card", {y:0}, {y:-14, duration:0.12, yoyo:true, repeat:1, ease:"power2.out"}, ${r3(t0 + 0.3)});`);
      cue(target === "left" ? "swoosh-left" : "swoosh-right", t0 - 0.02);
      cue("tap", t0 + 0.3);
    }
  }
});

// actions
const wordTime = (l) => { const w = l.words.find((x) => x.word.toLowerCase().replace(/[^a-z]/g, "") === (l.actionWord || "").toLowerCase().replace(/[^a-z]/g, "")); return w ? w.start : l.start + 0.4; };
const norm = (x) => (x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const timeOf = (l, word) => { const w = l.words.find((x) => norm(x.word) === norm(word)); if (!w) console.warn(`⚠ action word "${word}" not found in "${l.text}"`); return w ? w.start : l.start + 0.4; };
lines.forEach((l) => {
  // generic, reusable actions: {type:"pop", el, word, sfx} shows a hidden (.later) element on a word;
  // {type:"swap", from, to, word, sfx} replaces one value with another (e.g. a balance changing)
  (l.actions || []).forEach((a) => {
    const t = r3(timeOf(l, a.word) + (a.delay || 0));
    if (a.sfx) cue(a.sfx, t);
    // {type:"pulse", el, word}: a quick scale bump + highlight on something already visible (e.g. a number the voice says)
    if (a.type === "pulse") {
      tl.push(`tl.fromTo("${a.el}", {scale:1}, {scale:1.12, duration:0.16, yoyo:true, repeat:1, ease:"power2.out"}, ${t});`);
      tl.push(`tl.fromTo("${a.el}", {backgroundColor:"rgba(255,216,77,0)"}, {backgroundColor:"rgba(255,216,77,0.85)", duration:0.16, yoyo:true, repeat:3, ease:"sine.inOut", immediateRender:false}, ${t});`);
    }
    if (a.type === "pop") tl.push(`tl.fromTo("${a.el}", {opacity:0, scale:0.6, y:16}, {opacity:1, scale:1, y:0, duration:0.35, ease:"back.out(2.4)"}, ${t});`);
    if (a.type === "swap") {
      tl.push(`tl.to("${a.from}", {opacity:0, y:-24, duration:0.2, ease:"power2.in"}, ${t});`);
      tl.push(`tl.fromTo("${a.to}", {opacity:0, y:24}, {opacity:1, y:0, duration:0.3, ease:"back.out(2)"}, ${r3(t + 0.15)});`);
    }
  });
  if (l.cta) {
    // CTA: the channel handle pulses so viewers see who to follow
    tl.push(`tl.to("#channel-badge", {scale:1.22, duration:0.18, yoyo:true, repeat:3, ease:"power2.out"}, ${r3(l.start + 0.2)});`);
    // icon for the CTA type (follow = +, like = thumbs-up, save = bookmark) pops at the left of the handle
    tl.push(`tl.fromTo("#cta-icon", {scale:0, rotation:-25, opacity:0}, {scale:1, rotation:0, opacity:1, duration:0.4, ease:"back.out(3)"}, ${r3(l.start + 0.15)});`);
    tl.push(`tl.to("#cta-icon", {scale:1.2, duration:0.18, yoyo:true, repeat:3, ease:"power2.out"}, ${r3(l.start + 0.6)});`);
  }
});
lines.forEach((l) => {
  (l.sfx || []).forEach((k) => cue(k, l.start));
  if (!l.action) return;
  const t = r3(wordTime(l));
  if (S.actionSfx?.[l.action]) cue(S.actionSfx[l.action], t);
  if (l.action === "stamp-paid") {
    tl.push(`tl.fromTo("#stamp-paid", {scale:2.6, opacity:0, rotation:-4}, {scale:1, opacity:1, rotation:-14, duration:0.26, ease:"power4.in"}, ${t});`);
    tl.push(`tl.fromTo("#flash-receipt", {opacity:0.9}, {opacity:0, duration:0.35, ease:"power2.out", immediateRender:false}, ${r3(t + 0.26)});`);
    tl.push(`tl.fromTo("#card-receipt", {x:0}, {x:10, duration:0.05, yoyo:true, repeat:5, ease:"none"}, ${r3(t + 0.26)});`);
  }
  if (l.action === "deductions") {
    tl.push(`tl.to(["#ded-1","#ded-2","#ded-3"], {backgroundColor:"#ffe1e1", color:"#c62828", x:-8, duration:0.22, stagger:0.16, ease:"power2.out"}, ${t});`);
    tl.push(`tl.fromTo(["#ded-1","#ded-2","#ded-3"], {scale:1}, {scale:1.06, duration:0.1, yoyo:true, repeat:1, stagger:0.16}, ${t});`);
  }
  if (l.action === "deposit") {
    tl.push(`tl.fromTo("#notif-deposit", {y:-140, opacity:0}, {y:0, opacity:1, duration:0.45, ease:"back.out(1.6)"}, ${t});`);
    // green badge pops over the transaction list, then leaves before the next line (never sits on the balance text)
    tl.push(`tl.fromTo("#float-deposit", {y:30, opacity:0, scale:0.5}, {y:0, opacity:1, scale:1, duration:0.35, ease:"back.out(2.2)"}, ${r3(t + 0.2)});`);
    tl.push(`tl.to("#float-deposit", {opacity:0, y:-30, scale:0.9, duration:0.25, ease:"power2.in"}, ${r3(Math.min(t + 1.0, l.end - 0.3))});`);
  }
});

// ending sparkles — placed AROUND the sticker (left/right/top corners), never over the face
const last = lines[lines.length - 1];
const SPARKS = [[-330, -150], [-385, 30], [-300, 190], [330, -150], [385, 30], [300, 190], [-200, -250], [210, -255]];
SPARKS.forEach(([dx, dy], k) => {
  const x = W / 2 + dx, y = L.charTop + L.charH / 2 + dy;
  const id = `spark-${k}`;
  fx.push(`<svg id="${id}" class="clip spark" style="left:${r1(x - 30)}px;top:${r1(y - 30)}px" width="60" height="60" viewBox="-30 -30 60 60" data-start="${r3(last.start + 0.15 + k * 0.05)}" data-duration="${r3(total - last.start - 0.15 - k * 0.05)}" data-track-index="9"><path d="M0,-28 C4,-6 6,-4 28,0 C6,4 4,6 0,28 C-4,6 -6,4 -28,0 C-6,-4 -4,-6 0,-28Z" /></svg>`);
  tl.push(`tl.fromTo("#${id}", {scale:0, rotation:0}, {scale:${k % 2 ? 0.8 : 1.15}, rotation:90, duration:0.5, ease:"back.out(3)"}, ${r3(last.start + 0.15 + k * 0.05)});`);
});

// channel badge (fixed from frame 0 to the end, also in the thumbnail): avatar + handle in the caption font,
// "@knowledgeby" in arrow-orange and "joe" in ink black (parts come from general/brand/brand.json)
const CTA_ICON = {
  follow: `<circle r="34" /><path class="ink" d="M0,-17 V17 M-17,0 H17" />`,
  like: `<rect x="-35" y="-6" width="15" height="38" rx="3" /><path d="M-14,32 H17 Q25,32 27,24 L33,0 Q35,-12 24,-12 H9 L12,-25 Q14,-37 3,-37 Q-2,-37 -4,-31 L-14,-8 Z" />`,
  save: `<path d="M-22,-34 H22 Q26,-34 26,-30 V34 L0,16 L-26,34 V-30 Q-26,-34 -22,-34Z" />`,
};
if (BRAND?.handle) {
  const parts = BRAND.parts || [[BRAND.handle, "hot"]];
  fx.push(`<div id="channel-badge" class="clip channel-badge" data-start="0" data-duration="${total}" data-track-index="20">${
    BRAND.avatar ? `<img id="channel-avatar" src="general/brand/${BRAND.avatar}" alt="" />` : ""}<span class="cb-handle">${
    parts.map(([t, c]) => `<span class="cb-${c === "ink" ? "ink" : "hot"}">${esc(t)}</span>`).join("")}</span>${
    CTA_TYPE ? `<svg id="cta-icon" class="cta-icon" viewBox="-40 -40 80 80" width="84" height="84">${CTA_ICON[CTA_TYPE]}</svg>` : ""}</div>`);
}

// audio
voiceClips.forEach((v, i) => audio.push(`<audio id="voice-${i + 1}" src="assets/voice/script.mp3" data-start="${v.at}" data-media-start="${v.media}" data-duration="${v.dur}" data-volume="1" data-fade-in="${i ? 0.02 : 0}" data-fade-out="0.03" data-track-index="10"></audio>`));
// ---- sound mix: variants rotate per occurrence, optional quiet layers, tiny humanized timing/volume ----
const durCache = {};
const durOf = (src) => {
  if (durCache[src] != null) return durCache[src];
  try { durCache[src] = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(HERE, src)], { encoding: "utf8" }).trim()) || 1.2; }
  catch { console.warn(`⚠ missing sfx file ${src}`); durCache[src] = null; }
  return durCache[src];
};
const ctaL = lines.find((l) => l.cta);
if (ctaL && S.sfx.riser) { const rs = [].concat(S.sfx.riser)[0]; const d = durOf(rs.src) || 1.2; cue("riser", Math.max(0, ctaL.start - d + 0.08)); }
const seen = {};
const jitter = (k, n) => { let h = 2166136261; for (const ch of `${k}#${n}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return (h % 1000) / 1000; };
let ai = 0;
sfxCues.sort((a, b) => a.at - b.at).forEach((c) => {
  const def = S.sfx[c.key] ?? (c.key === "tap" ? S.sfx.pop : null);
  if (!def) { console.warn(`⚠ no sfx defined for "${c.key}" — skipped`); return; }
  const variants = [].concat(def); const n = (seen[c.key] = (seen[c.key] ?? -1) + 1);
  const v = variants[n % variants.length];
  const j = jitter(c.key, n);
  const at = r3(Math.max(0, c.at + j * 0.02));                 // 0–20ms drift
  const volMul = 0.92 + j * 0.14;                                // ±7% level
  [{ ...v, offset: 0 }, ...(v.layers || [])].forEach((layer, li) => {
    const d = durOf(layer.src); if (!d) return;
    const t = r3(at + (layer.offset || 0));
    if (t >= total) return;
    ai++;
    audio.push(`<audio id="sfx-${ai}-${c.key}${li ? "-l" + li : ""}" src="${layer.src}" data-start="${t}" data-duration="${r3(Math.min(d, total - t))}" data-volume="${r3(layer.volume * volMul)}" data-track-index="${11 + (ai % 4)}"></audio>`);
  });
});

// timeline edits from vfx Studio (overrides.json): moved clips + dropped media
const OV = applyOverrides(HERE, { els, fx, audio, tl, total });

// ---------- html ----------
const html = `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <!-- GENERATED by build.mjs from script.json — edit those, then run: node build.mjs -->
    <script src="vendor/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Patrick Hand"; src: url("general/fonts/PatrickHand-Regular.woff2") format("woff2"); }
      @font-face { font-family: "Fredoka"; font-weight: 600; src: url("general/fonts/Fredoka-SemiBold.woff2") format("woff2"); }
      @font-face { font-family: "Fredoka"; font-weight: 700; src: url("general/fonts/Fredoka-Bold.woff2") format("woff2"); }
      :root { --ink: #161616; --paper: #ffffff; --accent: #2f6bff; --hot: #ff4d2e; --mute: #6b7280; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: var(--paper); }
      #root { position: relative; width: 100%; height: 100%; font-family: "Fredoka", sans-serif; color: var(--ink); }

      .bg { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; object-position: 50% 0; transform-origin: 50% 40%; z-index: 0; }
      .caption { position: absolute; left: 50px; right: 50px; top: ${L.captionTop}px; height: 130px; text-align: center;
                 font: 100px/130px "Patrick Hand", cursive; color: var(--ink); z-index: 20; }

      .card-wrap { position: absolute; top: ${L.cardTop}px; width: ${L.cardW}px; height: ${L.labelH + L.cardH}px; transform-origin: 50% 70%; z-index: 2; }
      .card-label { height: ${L.labelH}px; text-align: center; font: 74px/${L.labelH}px "Patrick Hand", cursive; }
      .card { position: relative; width: ${L.cardW}px; height: ${L.cardH}px; border: 5px solid var(--ink); border-radius: 30px;
              box-shadow: 10px 10px 0 var(--ink); overflow: hidden; background: #f3f4f6; }

      .doc { position: absolute; inset: 22px; background: #fff; border-radius: 14px; padding: 22px 24px; font-size: 22px;
             box-shadow: 0 2px 0 #e5e7eb, 0 10px 24px rgba(0,0,0,.08); }
      .doc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 20px; color: var(--mute); }
      .brand i { width: 22px; height: 22px; border-radius: 6px; background: var(--accent); display: inline-block; }
      .doc-title { font-weight: 700; font-size: 30px; letter-spacing: .04em; color: var(--accent); }
      .meta { color: var(--mute); font-size: 19px; line-height: 1.5; margin-bottom: 14px; }
      .meta b { color: var(--ink); }
      .rows div, .ded, .gross-row, .net-row { display: flex; justify-content: space-between; padding: 9px 10px; border-radius: 8px; }
      .rows div { border-bottom: 2px solid #f0f0f0; }
      .due { margin-top: 18px; background: #eef3ff; border-radius: 14px; padding: 16px 18px; }
      .due .lbl { color: var(--mute); font-size: 19px; } .due .amt { font-weight: 700; font-size: 52px; color: var(--ink); }
      .due .sub { font-size: 19px; color: #b45309; font-weight: 600; }
      .pill { position: absolute; right: 22px; bottom: 22px; font-weight: 700; font-size: 18px; padding: 6px 14px; border-radius: 999px; }
      .pill.unpaid { background: #fff1d6; color: #b45309; }

      .paper-wrap { position: absolute; inset: 0; display: flex; justify-content: center; padding-top: 26px; background: #eceff3; }
      .paper { width: 300px; height: 500px; background: #fff; padding: 22px 22px 0; font: 600 19px/1.35 "Courier New", monospace;
               clip-path: polygon(0 0,100% 0,100% 96%,94% 100%,88% 96%,82% 100%,76% 96%,70% 100%,64% 96%,58% 100%,52% 96%,46% 100%,40% 96%,34% 100%,28% 96%,22% 100%,16% 96%,10% 100%,4% 96%,0 100%); }
      .r-brand { text-align: center; font-weight: 700; } .r-title { text-align: center; font-size: 30px; font-weight: 700; margin: 6px 0; }
      .r-date { text-align: center; color: var(--mute); font-size: 16px; }
      .dash { border-top: 3px dashed #c7c7c7; margin: 14px 0; }
      .r-row { display: flex; justify-content: space-between; margin: 6px 0; }
      .r-row.total { font-size: 26px; font-weight: 700; } .r-row.small { font-size: 14px; color: #15803d; }
      .r-thanks { text-align: center; margin-top: 22px; color: var(--mute); }
      .stamp { position: absolute; top: 250px; left: 50%; margin-left: -135px; width: 270px; text-align: center;
               font: 700 92px/1 "Fredoka", sans-serif; color: #dc2626; border: 9px solid #dc2626; border-radius: 18px;
               padding: 10px 0 6px; opacity: 0; mix-blend-mode: multiply; }
      .flash { position: absolute; inset: 0; background: #fff; opacity: 0; }

      .stub .gross-row { background: #fff4c2; font-weight: 700; font-size: 28px; margin: 6px 0 10px; }
      .ded-title { color: var(--mute); font-size: 18px; margin: 4px 10px; text-transform: uppercase; letter-spacing: .08em; }
      .ded { font-size: 21px; margin: 4px 0; transform-origin: 0 50%; }
      .net-row { border-top: 3px solid #f0f0f0; margin-top: 12px; padding-top: 14px; color: var(--mute); font-weight: 600; }

      .phone-wrap { position: absolute; inset: 0; display: flex; justify-content: center; padding-top: 24px; background: #e8f5ee; }
      .phone { position: relative; width: 270px; height: 540px; border-radius: 40px; background: #0f172a; border: 8px solid #0f172a;
               overflow: hidden; color: #fff; padding: 64px 20px 0; }
      .phone::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg,#1e3a8a,#0f172a 55%); }
      .phone > * { position: relative; }
      .notch { position: absolute; top: 10px; left: 50%; margin-left: -45px; width: 90px; height: 22px; border-radius: 12px; background: #000; z-index: 2; }
      .notif { position: absolute; top: 40px; left: 12px; right: 12px; z-index: 3; display: flex; gap: 10px; align-items: center;
               background: #fff; color: var(--ink); border-radius: 16px; padding: 10px 12px; box-shadow: 0 8px 20px rgba(0,0,0,.35); opacity: 0; }
      .n-ico { width: 36px; height: 36px; border-radius: 10px; background: #16a34a; color: #fff; font-weight: 700; font-size: 22px;
               display: flex; align-items: center; justify-content: center; flex: none; }
      .n-t { font-weight: 700; font-size: 16px; } .n-a { font-size: 14px; color: #15803d; font-weight: 600; }
      .app-name { font-weight: 700; font-size: 20px; opacity: .8; margin-top: 30px; }
      .bal-lbl { margin-top: 22px; font-size: 15px; opacity: .7; } .bal { font-weight: 700; font-size: 44px; }
      .tx { margin-top: 22px; background: rgba(255,255,255,.08); border-radius: 14px; padding: 8px 12px; font-size: 14px; }
      .tx-row { display: flex; align-items: center; gap: 8px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,.08); }
      .tx-row span:nth-child(2) { flex: 1; } .tx-row b { font-weight: 600; }
      .dot { width: 10px; height: 10px; border-radius: 50%; background: #94a3b8; } .dot.in { background: #22c55e; }
      .float-amt { position: absolute; left: 50%; top: 360px; width: 220px; margin-left: -110px; text-align: center;
                   font: 700 44px/1 "Fredoka", sans-serif; color: #fff; background: #16a34a; border: 4px solid #fff;
                   border-radius: 999px; padding: 12px 0 10px; box-shadow: 0 8px 20px rgba(0,0,0,.35); opacity: 0; z-index: 5; }

      .channel-badge { position: absolute; left: 50%; top: ${L.badgeTop}px; height: ${L.badgeH}px; transform: translateX(-50%);
               display: flex; align-items: center; gap: 16px; white-space: nowrap; z-index: 30; }
      .channel-badge img { width: ${L.badgeH}px; height: ${L.badgeH}px; border-radius: 50%; border: 4px solid var(--ink); background: #ffe600; }
      .cb-handle { font: 70px/1 "Patrick Hand", cursive; letter-spacing: .01em; padding-top: 6px; }
      .cb-hot { color: var(--hot); } .cb-ink { color: var(--ink); }
      .cta-icon { position: absolute; right: 100%; top: 0; margin-right: 18px; opacity: 0; overflow: visible; }
      .cta-icon circle, .cta-icon path, .cta-icon rect { fill: var(--hot); stroke: var(--ink); stroke-width: 5; stroke-linejoin: round; }
      .cta-icon path.ink { fill: none; stroke: #fff; stroke-width: 9; stroke-linecap: round; }
      .later { opacity: 0; }
      .neg { color: #c62828; } .pos { color: #15803d; }
      .bc-wrap { position: absolute; inset: 0; padding: 26px 22px; background: #eef1f5; }
      .bankcard { position: relative; height: 236px; border-radius: 22px; padding: 20px 24px; color: #fff;
                  box-shadow: 0 12px 24px rgba(0,0,0,.25); font-weight: 600; }
      .bankcard.debit { background: linear-gradient(135deg, #2f6bff, #1e3a8a); }
      .bankcard.credit { background: linear-gradient(135deg, #1f1f1f, #4a3b12); }
      .bc-top { display: flex; justify-content: space-between; font-size: 22px; }
      .bc-top b { font-weight: 700; letter-spacing: .12em; font-size: 22px; color: #ffd84d; }
      .chip { display: block; width: 58px; height: 44px; margin-top: 22px; border-radius: 9px; background: linear-gradient(135deg,#f6d77a,#c9a227); }
      .bc-num { margin-top: 20px; font-size: 30px; letter-spacing: .12em; }
      .bc-name { margin-top: 6px; font-size: 18px; opacity: .8; letter-spacing: .15em; }
      .acct { margin-top: 20px; background: #fff; border-radius: 16px; padding: 16px 18px; height: 222px; position: relative; }
      .acct-lbl { color: var(--mute); font-size: 19px; }
      .acct-bal { position: relative; height: 62px; font-weight: 700; font-size: 46px; margin-top: 6px; }
      .acct-bal > span[id] { position: absolute; left: 0; top: 0; }
      .acct-bal .owe-lbl { font-size: 24px; color: var(--mute); font-weight: 600; margin-right: 8px; }
      #credit-owe-old, #credit-owe-new { left: 132px !important; }
      .acct-row { display: flex; justify-content: space-between; font-size: 22px; margin-top: 16px; padding: 10px 12px; background: #fff3f3; border-radius: 10px; }
      .due-pill { display: inline-block; margin-top: 18px; font-weight: 700; font-size: 22px; color: #b45309; background: #fff1d6; border-radius: 999px; padding: 8px 16px; }
      .big-bal { position: relative; height: 70px; font-weight: 700; font-size: 54px; margin: 6px 0 12px; }
      .big-bal > span[id] { position: absolute; left: 0; top: 0; }
      .rows b { font-weight: 700; }
      .jar { height: 26px; border-radius: 999px; background: #e7f6ec; overflow: hidden; margin: 18px 0 20px; }
      .jar-fill { width: 64%; height: 100%; background: linear-gradient(90deg,#22c55e,#16a34a); }
      .interest { display: inline-block; font-weight: 700; font-size: 36px; color: #fff; background: #16a34a; border-radius: 999px; padding: 10px 22px; }
      .biz { font-size: 31px; }
      .biz .doc-head { margin-bottom: 10px; }
      .biz .brand { font-size: 22px; }
      .biz .doc-title { font-size: 26px; }
      .biz .meta { font-size: 23px; margin-bottom: 8px; }
      .biz .rows div { padding: 12px 6px; align-items: center; }
      .biz .rows b { font-size: 33px; }
      .biz .exp span small { display: block; font-size: 19px; color: var(--mute); font-weight: 400; }
      .tot-box { margin-top: 20px; background: #eef3ff; border-radius: 16px; padding: 14px 18px; transform-origin: 50% 50%; }
      .tot-box.green { background: #e7f6ec; } .tot-box.red { background: #fdecec; }
      .tot-box .lbl { color: var(--mute); font-size: 23px; font-weight: 600; }
      .tot-box .amt { font-weight: 700; font-size: 62px; line-height: 72px; height: 72px; display: inline-block; border-radius: 10px; padding: 0 6px; margin-left: -6px; transform-origin: 0 50%; }
      .amt.swap { position: relative; display: block; } .amt.swap > span { position: absolute; left: 6px; top: 0; }
      #rev-total, #pr-exp { transform-origin: 30% 50%; }
      .recap-tile { position: absolute; width: ${L.cardW}px; height: 270px; background: #fff; border: 5px solid var(--ink);
                    border-radius: 30px; box-shadow: 10px 10px 0 var(--ink); padding: 34px 32px; z-index: 3; }
      .rt-term { font: 88px/1 "Patrick Hand", cursive; color: var(--ink); }
      .rt-eq { font: 600 38px/1.2 "Fredoka", sans-serif; color: var(--hot); margin-top: 18px; }
      .rt-check { position: absolute; right: 26px; top: 22px; width: 64px; height: 64px; border-radius: 50%; background: #16a34a;
                  color: #fff; font: 700 40px/64px "Fredoka", sans-serif; text-align: center; }
      .reaction { position: absolute; transform-origin: 50% 100%; z-index: 10; }
      .arrow { position: absolute; left: 0; top: 0; z-index: 15; overflow: visible; pointer-events: none; }
      .arrow path { fill: none; stroke: var(--hot); stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; }
      .qmark { position: absolute; width: 120px; height: 140px; margin-left: -60px; text-align: center;
               font: 140px/140px "Patrick Hand", cursive; color: var(--hot); z-index: 12; }
      .spark { position: absolute; z-index: 12; overflow: visible; }
      .spark path { fill: #ffc400; stroke: var(--ink); stroke-width: 3; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
      ${els.join("\n      ")}
      ${fx.join("\n      ")}
      ${audio.join("\n      ")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${tl.join("\n      ")}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(join(HERE, "index.html"), html);
console.log(`✓ index.html  ${total.toFixed(1)}s  bg: ${BG || "none"}  cta: ${CTA_TYPE || "none"} "${S.lines.find((l) => l.cta)?.text || ""}"  ${hasVoice ? "(synced to voice)" : "(ESTIMATED timing, no voice yet)"}  · ${lines.length} lines · ${sfxCues.length} sfx${OV.moved || OV.added ? `  · overrides: ${OV.moved} moved, ${OV.added} added` : ""}`);

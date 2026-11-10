#!/usr/bin/env node
// Builds index.html for this explainer reel from script.json.
// Timing comes from the ElevenLabs word timings (assets/voice/script.words.json) when present,
// otherwise it's estimated so you can preview before generating the voice.
//   node build.mjs              → writes index.html
//   node build.mjs --print-text → prints the voiceover text (used by make.sh)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { applyOverrides } from "../../scripts/overrides.mjs";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const fullText = S.lines.map((l) => l.text).join(" ");
if (process.argv.includes("--print-text")) { process.stdout.write(fullText + "\n"); process.exit(0); }

const STICKER_DIR = "general/my different reactions";
const STICKER_URL = STICKER_DIR.replace(/ /g, "%20");
const STICKERS = JSON.parse(readFileSync(join(HERE, STICKER_DIR, "stickers.json"), "utf8")).stickers;

// ---------- background: one image from general/background per video ----------
// script.json "background": "auto" (default) picks deterministically from the project name, skipping the background
// the previous video in TOPICS.md used, so consecutive reels never share one. Or set a filename to force it.
const PROJECT = basename(HERE);
const BG_DIR = join(HERE, "general", "background");
const bgFiles = existsSync(BG_DIR) ? readdirSync(BG_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
function pickBackground() {
  const want = S.background ?? "auto";
  if (want && want !== "auto") return bgFiles.includes(want) ? want : (console.warn(`⚠ background "${want}" not in general/background`), null);
  if (!bgFiles.length) return null;
  let h = 0; for (const ch of PROJECT) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  let pick = bgFiles[h % bgFiles.length];
  const topics = join(HERE, "..", "..", "TOPICS.md");
  if (existsSync(topics) && bgFiles.length > 1) {
    const rows = readFileSync(topics, "utf8").split("\n").filter((r) => /^\|\s*\d{4}-/.test(r) && !r.includes(`| ${PROJECT} |`));
    const prevBg = rows.length ? (rows[rows.length - 1].match(/bg:\s*([^|\s]+)/) || [])[1] : null;
    if (prevBg === pick) pick = bgFiles[(h + 1) % bgFiles.length];
  }
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
  invoice: { label: "Invoice", html: `
    <div class="doc invoice">
      <div class="doc-head"><span class="brand"><i></i>Acme Studio</span><span class="doc-title">INVOICE</span></div>
      <div class="meta"><div>Invoice #1042</div><div>Bill to: <b>Joe</b></div></div>
      <div class="rows"><div><span>Design work</span><span>$350.00</span></div><div><span>Revisions</span><span>$150.00</span></div></div>
      <div class="due"><div class="lbl">Amount due</div><div class="amt">$500.00</div><div class="sub">Due by Nov 30</div></div>
      <div class="pill unpaid">UNPAID</div>
    </div>` },
  receipt: { label: "Receipt", html: `
    <div class="paper-wrap"><div class="paper">
      <div class="r-brand">ACME STUDIO</div><div class="r-title">RECEIPT</div><div class="r-date">Nov 28 · 10:42 AM</div>
      <div class="dash"></div>
      <div class="r-row"><span>Design work</span><span>350.00</span></div>
      <div class="r-row"><span>Revisions</span><span>150.00</span></div>
      <div class="dash"></div>
      <div class="r-row total"><span>TOTAL</span><span>$500.00</span></div>
      <div class="r-row small"><span>Card •••• 4242</span><span>APPROVED</span></div>
      <div class="r-thanks">Thank you!</div>
    </div><div class="stamp" id="stamp-paid">PAID</div><div class="flash" id="flash-receipt"></div></div>` },
  gross: { label: "Gross Pay", html: `
    <div class="doc stub">
      <div class="doc-head"><span class="brand"><i></i>Acme Inc.</span><span class="doc-title">PAY STUB</span></div>
      <div class="meta"><div>Pay period: Nov 1 – 15</div><div>Employee: <b>Joe</b></div></div>
      <div class="gross-row"><span>Gross pay</span><span>$3,000.00</span></div>
      <div class="ded-title">Deductions</div>
      <div class="ded" id="ded-1"><span>Income tax</span><span>−$450.00</span></div>
      <div class="ded" id="ded-2"><span>Health insurance</span><span>−$120.00</span></div>
      <div class="ded" id="ded-3"><span>Retirement</span><span>−$80.00</span></div>
      <div class="net-row"><span>Net pay</span><span>$2,350.00</span></div>
    </div>` },
  net: { label: "Net Pay", html: `
    <div class="phone-wrap"><div class="phone"><div class="notch"></div>
      <div class="notif" id="notif-deposit"><div class="n-ico">$</div><div><div class="n-t">Deposit received</div><div class="n-a">+$2,350.00 · Acme Inc.</div></div></div>
      <div class="app-name">Joe's Account</div>
      <div class="bal-lbl">Available balance</div><div class="bal">$2,350.00</div>
      <div class="tx"><div class="tx-row"><span class="dot in"></span><span>Payroll · Acme Inc.</span><b>+2,350.00</b></div>
      <div class="tx-row"><span class="dot"></span><span>Coffee</span><b>−4.50</b></div>
      <div class="tx-row"><span class="dot"></span><span>Groceries</span><b>−62.10</b></div></div>
    </div><div class="float-amt" id="float-deposit">+$2,350</div></div>` },
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
const pairIds = [...new Set(lines.map((l) => l.pair))];
pairIds.forEach((pid, pi) => {
  const pl = lines.filter((l) => l.pair === pid);
  const pairEnd = pl[pl.length - 1].end;
  const isLast = pi === pairIds.length - 1;
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
  if (/difference\?|\bor\b.*\?|^now the one/i.test(l.text)) {
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
    if (p.tip && target) {
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
      tl.push(`tl.fromTo("#card-${S.pairs[l.pair][target]} .card", {y:0}, {y:-14, duration:0.12, yoyo:true, repeat:1, ease:"power2.out"}, ${r3(t0 + 0.3)});`);
      cue("tap", t0 + 0.3);
    }
  }
});

// actions
const wordTime = (l) => { const w = l.words.find((x) => x.word.toLowerCase().replace(/[^a-z]/g, "") === (l.actionWord || "").toLowerCase().replace(/[^a-z]/g, "")); return w ? w.start : l.start + 0.4; };
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
if (BRAND?.handle) {
  const parts = BRAND.parts || [[BRAND.handle, "hot"]];
  fx.push(`<div id="channel-badge" class="clip channel-badge" data-start="0" data-duration="${total}" data-track-index="20">${
    BRAND.avatar ? `<img id="channel-avatar" src="general/brand/${BRAND.avatar}" alt="" />` : ""}<span class="cb-handle">${
    parts.map(([t, c]) => `<span class="cb-${c === "ink" ? "ink" : "hot"}">${esc(t)}</span>`).join("")}</span></div>`);
}

// audio
voiceClips.forEach((v, i) => audio.push(`<audio id="voice-${i + 1}" src="assets/voice/script.mp3" data-start="${v.at}" data-media-start="${v.media}" data-duration="${v.dur}" data-volume="1" data-fade-in="${i ? 0.02 : 0}" data-fade-out="0.03" data-track-index="10"></audio>`));
const SFX = { ...S.sfx, tap: S.sfx.tap || { src: S.sfx.pop.src, volume: 0.35 } };
const sfxDur = { pop: 0.35, tap: 0.35, question: 0.7, left: 0.4, right: 0.7, correct: 1.3, ding: 3 };
sfxCues.sort((a, b) => a.at - b.at).forEach((c, i) => {
  const s = SFX[c.key]; const d = Math.min(sfxDur[c.key] ?? 1, total - c.at);
  audio.push(`<audio id="sfx-${i + 1}-${c.key}" src="${s.src}" data-start="${c.at}" data-duration="${r3(d)}" data-volume="${s.volume}" data-track-index="${11 + (i % 3)}"></audio>`);
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
console.log(`✓ index.html  ${total.toFixed(1)}s  bg: ${BG || "none"}  ${hasVoice ? "(synced to voice)" : "(ESTIMATED timing, no voice yet)"}  · ${lines.length} lines · ${sfxCues.length} sfx${OV.moved || OV.added ? `  · overrides: ${OV.moved} moved, ${OV.added} added` : ""}`);

// Timeline edits made in vfx Studio (hyperframes/<project>/overrides.json), applied by build.mjs after it has
// generated the edit from script.json — so script.json stays the source of truth and edits survive rebuilds.
//   { "moves": { "<element id>": <seconds to shift> },
//     "added": [ { "id": "media-1", "kind": "image|video|audio", "src": "input/<p>/media/x.png",
//                  "start": 3.2, "duration": 2, "volume": 0.8, "x": 140, "y": 520, "w": 800, "h": 800 } ] }
// Moves are keyed by generated ids (cap-12, react-4, sfx-9-pop …); if script.json changes a lot, re-check them.
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const r3 = (n) => Math.round(n * 1000) / 1000;
// overrides.json values are pasted into HTML and GSAP code below — only well-formed ones get through
const ID = /^[a-z][\w-]{0,63}$/i;
const fin = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const safeSrc = (p) => typeof p === "string" && /^(hyperframes|input|output)\//.test(p) && !p.split("/").some((s) => s.startsWith("."));

/** path relative to the vfx root → path relative to hyperframes/<project>/ (its assets/ and general/ links) */
function srcFor(project, p) {
  const enc = (s) => s.split("/").map(encodeURIComponent).join("/");
  if (p.startsWith(`input/${project}/`)) return "assets/" + enc(p.slice(`input/${project}/`.length));
  if (p.startsWith("input/general/")) return "general/" + enc(p.slice("input/general/".length));
  return "../../" + enc(p);
}

export function applyOverrides(dir, { els, fx, audio, tl, total }) {
  const file = join(dir, "overrides.json");
  if (!existsSync(file)) return { moved: 0, added: 0 };
  const o = JSON.parse(readFileSync(file, "utf8"));
  const moves = Object.fromEntries(Object.entries(o.moves || {}).filter(([k, v]) => ID.test(k) && fin(v, 0)));
  const project = basename(dir);

  // 1) shift data-start of moved elements
  for (const arr of [els, fx, audio]) {
    arr.forEach((h, i) => {
      const id = /\bid="([^"]+)"/.exec(h)?.[1];
      const d = id && moves[id];
      if (d) arr[i] = h.replace(/data-start="([\d.]+)"/, (_, v) => `data-start="${r3(Math.max(0, +v + d))}"`);
    });
  }
  // 2) shift the position (last argument) of every GSAP tween that targets a moved element — ONCE per line, so a
  //    tween shared by both cards of a pair (["#card-a","#card-b"]) isn't shifted twice; the first moved id wins
  const res = Object.entries(moves).map(([id, d]) => [new RegExp(`#${id}(?![\\w-])`), d]);
  tl.forEach((line, i) => {
    const hit = res.find(([re]) => re.test(line));
    if (hit) tl[i] = line.replace(/,\s*([\d.]+)\);\s*$/, (_, v) => `, ${r3(Math.max(0, +v + hit[1]))});`);
  });
  // 3) media dropped on the timeline
  let added = 0;
  for (const a of o.added || []) {
    if (!a || !ID.test(a.id) || !["image", "video", "audio"].includes(a.kind) || !safeSrc(a.src)) continue;
    const start = r3(Math.max(0, fin(a.start, 0)));
    const dur = r3(Math.min(fin(a.duration, 0), total - start));
    if (dur <= 0) continue;
    const src = srcFor(project, a.src);
    if (a.kind === "audio") {
      audio.push(`<audio id="${a.id}" src="${src}" data-start="${start}" data-duration="${dur}" data-volume="${fin(a.volume, 0.8)}" data-track-index="19"></audio>`);
    } else {
      const box = `position:absolute;left:${fin(a.x, 140)}px;top:${fin(a.y, 520)}px;width:${fin(a.w, 800)}px;height:${fin(a.h, 800)}px;object-fit:contain;z-index:11`;
      const attrs = `id="${a.id}" class="clip media-clip" src="${src}" style="${box}" data-start="${start}" data-duration="${dur}" data-track-index="6"`;
      fx.push(a.kind === "video" ? `<video ${attrs} muted playsinline></video>` : `<img ${attrs} alt="" />`);
      tl.push(`tl.fromTo("#${a.id}", {scale:0.6, opacity:0}, {scale:1, opacity:1, duration:0.35, ease:"back.out(2)"}, ${start});`);
    }
    added++;
  }
  return { moved: Object.keys(moves).length, added };
}

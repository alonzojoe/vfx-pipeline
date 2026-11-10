// Timeline edits made in vfx Studio (hyperframes/<project>/overrides.json), applied by build.mjs after it has
// generated the edit from script.json — so script.json stays the source of truth and edits survive rebuilds.
//   { "moves": { "<element id>": <seconds to shift> },
//     "added": [ { "id": "media-1", "kind": "image|video|audio", "src": "input/<p>/media/x.png",
//                  "start": 3.2, "duration": 2, "volume": 0.8, "x": 140, "y": 520, "w": 800, "h": 800 } ] }
// Moves are keyed by generated ids (cap-12, react-4, sfx-9-pop …); if script.json changes a lot, re-check them.
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const r3 = (n) => Math.round(n * 1000) / 1000;

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
  const moves = o.moves || {};
  const project = basename(dir);

  // 1) shift data-start of moved elements
  for (const arr of [els, fx, audio]) {
    arr.forEach((h, i) => {
      const id = /\bid="([^"]+)"/.exec(h)?.[1];
      const d = id && moves[id];
      if (d) arr[i] = h.replace(/data-start="([\d.]+)"/, (_, v) => `data-start="${r3(Math.max(0, +v + d))}"`);
    });
  }
  // 2) shift the position (last argument) of every GSAP tween that targets a moved element
  for (const [id, d] of Object.entries(moves)) {
    const re = new RegExp(`#${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
    tl.forEach((line, i) => {
      if (re.test(line)) tl[i] = line.replace(/,\s*([\d.]+)\);\s*$/, (_, v) => `, ${r3(Math.max(0, +v + d))});`);
    });
  }
  // 3) media dropped on the timeline
  let added = 0;
  for (const a of o.added || []) {
    const start = r3(Math.max(0, a.start));
    const dur = r3(Math.min(a.duration, total - start));
    if (!a.id || !a.src || dur <= 0) continue;
    const src = srcFor(project, a.src);
    if (a.kind === "audio") {
      audio.push(`<audio id="${a.id}" src="${src}" data-start="${start}" data-duration="${dur}" data-volume="${a.volume ?? 0.8}" data-track-index="19"></audio>`);
    } else {
      const box = `position:absolute;left:${a.x ?? 140}px;top:${a.y ?? 520}px;width:${a.w ?? 800}px;height:${a.h ?? 800}px;object-fit:contain;z-index:11`;
      const attrs = `id="${a.id}" class="clip media-clip" src="${src}" style="${box}" data-start="${start}" data-duration="${dur}" data-track-index="6"`;
      fx.push(a.kind === "video" ? `<video ${attrs} muted playsinline></video>` : `<img ${attrs} alt="" />`);
      tl.push(`tl.fromTo("#${a.id}", {scale:0.6, opacity:0}, {scale:1, opacity:1, duration:0.35, ease:"back.out(2)"}, ${start});`);
    }
    added++;
  }
  return { moved: Object.keys(moves).length, added };
}

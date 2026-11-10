# vfx — code-based video editor

Reels are 1080x1920 (9:16) by default.

**Brand: read `BRAND.md` before every reel** — topics, script style, colors, fonts, avatar use, motion and sound for @knowledgebyjoe.

**Project rules (always follow):**
@.claude/rules/git.md
@.claude/rules/engineering.md
@.claude/rules/reels.md

## Layout
- `input/<project>/` — that project's raw footage/music. `input/general/` — shared default resources (logos, fonts, music, sfx, overlays, reactions…) usable by every project.
- `output/<project>/` — renders, named `<project>-<engine>-<timestamp>.mp4`.
- `hyperframes/<project>/index.html` — HyperFrames edit. `assets/` → input/<project>, `general/` → input/general, `vendor/` → local GSAP.
- `remotion/src/projects/<project>/{index,Reel}.tsx` — Remotion edit, auto-registered (composition id = project name). Files: `staticFile("<project>/x.mp4")`, `staticFile("general/music/x.mp3")` (via symlinks in remotion/public).
- Reaction stickers (Joe's avatar, transparent PNG): `input/general/my different reactions/<name>.png` — e.g. smile, laugh, thinking, confused, shocked, cool, facepalm, thumbs-up, double-thumbs-up, point-up-left, point-up-right, point-left, point-right, shrug, peace… (the 3 source sheets live there too). In HTML use `general/my%20different%20reactions/<name>.png`.
- SFX: `input/general/sfx/` (pop, question-pop, face_left, face_right, correct, ding). Fonts: `input/general/fonts/` (Patrick Hand, Fredoka).
- Explainer reel pattern: `hyperframes/money-terms/` — script.json → build.mjs (syncs to ElevenLabs word timings) → make.sh (voice + build + render).
- Templates: `hyperframes/_template/`, `remotion/src/_template/`. Never edit `vendor/` or `public/` by hand.

## Commands (from vfx/)
- `./scripts/new-project.sh "<name>" [both|hf|remotion]` — names are slugified (spaces → hyphens, lowercase).
- `./scripts/preview.sh <name> [hf|remotion]`, `./scripts/render.sh <name> [hf|remotion|both] [engine args]`, `./scripts/check.sh <name>`
- Voiceover: `./scripts/voice.sh <project|general> "text" [--name x] [--voice id] [--model id]` → `input/<project>/voice/<name>.mp3` + `<name>.words.json` (word timings for captions). Key and defaults in `.env` (never print or commit it).
- FFmpeg helpers: `probe, trim, to-reel, concat, add-music, extract-audio, compress` in `scripts/`.

## Rules
- HyperFrames: every `<video>/<audio>/<img>` needs a unique `id` (otherwise silent/skipped); GSAP timeline `paused: true`, registered on `window.__timelines`; deterministic only.
- Remotion: animate from `useCurrentFrame()`; GSAP timelines are paused and seeked to `frame / fps` in `useLayoutEffect`.
- Run `./scripts/check.sh <name>` after editing a HyperFrames project.

## YouTube monetization (YPP) — follow on EVERY reel
YouTube pays for original, authored content and refuses "content that looks like it's made with a template" or
"gives the impression of mass production" (inauthentic content policy, clarified Jul 2026). So:
- **New topic every video** — log it in `TOPICS.md` and never repeat a topic or pair.
- **Vary the format**, don't only swap nouns: rotate "X vs Y", myth vs fact, "3 mistakes", mini-story, quiz/guess,
  "what I'd do". Change hook, card style, ending and CTA between uploads.
- **Add Joe's own angle** in each video: a personal example, opinion, or "here's what I do" line — not a generic summary.
- **Education, not advice**: finance/health/legal = explain terms & concepts only. Never "you should buy/invest/take…".
  YouTube demonetizes AI personas presented as human experts giving such advice.
- **Audio rights**: only SFX/music with a provable license — use the library below (see `input/general/sfx/LICENSES.md`).
  Joe's 6 original downloaded SFX have unknown sources → replace them before monetizing. ElevenLabs needs a paid plan.
- **No copied assets** from reference videos — reference = inspiration for pacing/format only.
- **Disclosure**: "altered or synthetic content" toggle is required only for realistic content that could mislead;
  cartoon avatar + AI voice explainer doesn't need it, but turning it on never hurts.
- Prefer also making a long-form (3–8 min) version of strong topics — Shorts pay far less per view.

## Sound effects library (`input/general/sfx/`, 1,194 sounds — licenses in `LICENSES.md`)
- `uisfx/<style>/<cue>.mp3` — 936 **CC0** UI sounds (78 cues × 12 styles: arcade, cinematic, dreamy, glass, mechanical,
  minimal, organic, rubber, scifi, soft, studio, zen). Money/explainer cues: purchase, checkout, refund, coupon, reward,
  success, notification, error, warning, achievement, level-up, swipe, snap, open, close.
- `earshot/<family>/<id>.mp3` — 252 code-made sounds from the earshot bank (pops, whooshes, risers, impacts, dings,
  glitches, sub drops, logo stings). Our own renders → no credit, no Content ID risk.
- `openverse/` — `./scripts/sfx.sh search "cash register" [--cc0]` (commercial-safe licenses only; credits auto-logged
  in `openverse/CREDITS.md` → paste CC BY lines into the video description).
- `ai/` — `./scripts/sfx.sh ai "cartoon pop, bright" --dur 1 --name pop-cartoon` (ElevenLabs sound generation).
- `./scripts/sfx.sh list <filter>` — find a sound. Pick a different style/family per video so reels don't sound identical.
- Real SFX tool (Clipwing, MIT): `tools/real-sfx/` — auto sound-designs a rendered video or HyperFrames project from this
  library (`from_hyperframes.py` → `mix.py` → `review.py`). Index is rebuilt by `./setup.sh`.
- earshot (optional, `./setup.sh --earshot`, ~1.1 GB): lets Claude hear/describe/critique sounds and forge new ones; adds
  an `earshot` MCP server to Claude Code.

## Backgrounds (`input/general/background/`) — randomized per video
- Every reel uses ONE full-frame background image from `input/general/background/` (paper textures now: bg1.jpg,
  bg2.png, bg3.jpg). Drop new images there and they join the rotation automatically.
- `script.json` → `"background": "auto"` (default): build.mjs picks one from the project name and skips the background
  the previous video in `TOPICS.md` used, so consecutive reels never share a background. Set a filename to force one.
- Log the chosen background in `TOPICS.md` (`bg: <file>` in the Background column) — build.mjs prints it.
- Rendered at 2% overscale (hides edge artifacts like bg2's 5px strip) with a slow 1.02→1.07 drift.
- Prefer images ≥1080×1920; smaller ones (bg1 563×1000, bg3 667×1000) get upscaled — fine for paper, soft for detail.

## Before publishing — ALWAYS review (see `REVIEW.md`)
- Run `./scripts/review.sh <project>` on the final render → `output/<project>/review/<video>/REPORT.md` + `contact.jpg`
  (a frame every second) + `beats.jpg` (every line start/action). Look at every frame and tick the REVIEW.md checklist.
- Never send or publish a render that hasn't passed the review. Add any new bug to REVIEW.md's "Known past bugs".
- Pointing: exactly ONE pointer, the drawn orange arrow. The pointing stickers have their black doodle arrows/lines
  removed (originals in `my different reactions/_originals-with-doodles/` — never use those). No extra doodles, ink
  "burst" lines, rings or borders.
- Pauses: `pause` in script.json = total silence after that line (important beats only); every other gap is capped.
- Loudness: `render.sh` normalizes renders to −14 LUFS / −1.5 dBTP (set NO_NORMALIZE=1 to skip).
- **One video per project, always.** `output/<project>/` (e.g. `output/money-terms/`) must contain exactly ONE video:
  `<project>-FINAL.mp4` (+ its `review/` folder). `render.sh` enforces it — every render replaces `<project>-FINAL.mp4`
  and deletes any other video and old review folder there (`both` engines is blocked; `KEEP_OLD=1` only for a
  deliberate A/B test, then clean up). `./scripts/finalize.sh <project> [video]` does the same by hand. Never leave old
  versions, previews or `-v2` files lying around; after each revision re-run `./scripts/review.sh <project>`.

## Channel handle (on every reel)
- Plain text `@knowledgeby` (black) + `joe` (orange #ff4d2e, the arrow color), Patrick Hand ~70px (the caption font).
  No pill, no box, no avatar. Fixed from frame 0 to the end (so it's in the thumbnail), centered under the sticker at
  y ≈1635–1719 — as low as it goes while staying above the Reels/Shorts caption/username overlay.
- Config: `input/general/brand/brand.json` (`parts` = colored pieces of the handle). build.mjs renders it as
  `.channel-badge` — overlay classes must be unique (a reused `.brand` class once broke the card logos).

## Explainer building blocks (copy the newest project's build.mjs + make.sh: `hyperframes/business-terms/`)
- `script.json` lines: `pair` + `show`/`focus` (cards + one orange arrow), `react` (sticker), `question: true` (wiggle + "?"),
  `pause` (important beats only), `sfx: [...]`, `recap: {term, means}` (2x2 tick tiles), `cta: true` (handle pulses).
- Generic `actions`: `{type:"pop", el:"#id", word, sfx}` reveals a hidden `.later` element on a word;
  `{type:"swap", from:"#a", to:"#b", word, sfx}` changes a value (balances, amounts) on a word.
- End sparkles sit around the sticker (never over the face).
- Rotate the SFX style per video (money-terms: Joe's originals → banking-basics: uisfx/glass + earshot pops).

- Actions in script.json (per line): `pop` (show a hidden `.later` element on a word), `swap` (value A → value B),
  `pulse` (bump + yellow highlight on something already visible, e.g. a number the voice says), optional `delay` (s).
  Action words match on letters AND digits, so `"word": "$10,000"` works for numbers.
- Worked examples beat definitions: show the math on the cards ($10,000 − $7,000 = $3,000) and double-check it adds up.
- Long recap terms (> 8 letters, e.g. "Liabilities") auto-shrink to 72px so they don't hit the ✓.

- CTA is randomized per reel (follow / like / save, never the same type as the previous reel): CTA line in
  script.json = `{"text": "auto", "cta": true}`; build.mjs picks it, adds the matching icon beside the handle,
  and make.sh compares the resolved text so the voice stays in sync. Log `cta: <type>` in TOPICS.md. See BRAND.md §2.

## Sound mix (not machine-made) — every reel
- Joe's own SFX (`pop_7e9Is8L`, `question-pop`, `face_left`, `face_right`, `ding-sound-effect_2`, `correct`) are the LEAD hits;
  the library (uisfx CC0 styles + earshot renders) supplies variants and quiet layers underneath.
- In `script.json` a cue can be an ARRAY of variants (rotated per occurrence, never the same sample twice in a row)
  and each variant can have `layers: [{src, volume, offset}]`. build.mjs adds 0–20ms timing drift and ±7% level per hit,
  and reads real durations with ffprobe.
- Arrow draw = Joe's face_left/face_right swoosh + quiet earshot flick; arrow lands = soft tap; scene/card swaps = whoosh;
  recap entry = big whoosh; riser ends right as the CTA starts; CTA = achievement + shimmer.
- SFX must sit UNDER the voice (adds ≤ ~2 dB at its onset). Rotate the uisfx style / earshot family between videos.
- Note: Joe's 6 originals have unknown sources (Content ID risk for YPP) — he chose to keep them in the mix.

## Joe's name in every mock UI — every reel
- Any bank card, account, app screen, invoice, pay stub, receipt, chat or form drawn in a reel uses Joe's name —
  never "You", "User", "John Doe" or blank: cards print `JOE`, accounts say "Joe's Account" / "Joe's Checking" /
  "Joe's Savings" / "Joe's Credit", balances "Joe owes $…", invoices "Bill to: Joe", pay stubs "Employee: Joe",
  phone/bank apps "Joe's Account". Companies/banks stay fictional (MyBank, Acme Studio/Inc.).
- Brand colors: orange `#ff4d2e` (`--hot`: arrow, "joe" in the handle, "?" marks, recap "= …") and ink `#161616` (`--ink`).

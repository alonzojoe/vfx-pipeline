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
- Reaction stickers (Joe's avatar, transparent PNG): `input/general/my different reactions/<name>.png` — e.g. smile, laugh, thinking, confused, shocked-2 (never `shocked`: it was cropped and is deleted), cool, facepalm, thumbs-up, double-thumbs-up, point-up-left, point-up-right, point-left, point-right, shrug, peace… (the 3 source sheets live there too). In HTML use `general/my%20different%20reactions/<name>.png`.
- SFX: `input/general/sfx/` (pop, question-pop, face_left, face_right, correct, ding). Fonts: `input/general/fonts/` (Patrick Hand, Fredoka).
- Explainer reel pattern: `hyperframes/money-terms/` — script.json → build.mjs (syncs to ElevenLabs word timings) → make.sh (voice + build + render).
- Templates: `hyperframes/_template/`, `remotion/src/_template/`. Never edit `vendor/` or `public/` by hand.

## Commands (from vfx/)
- `./scripts/new-project.sh "<name>" [both|hf|remotion]` — names are slugified (spaces → hyphens, lowercase).
- `./scripts/preview.sh <name> [hf|remotion]`, `./scripts/render.sh <name> [hf|remotion|both] [engine args]`, `./scripts/check.sh <name>`
- Frame rate: 30 fps by default; `FPS=60 ./scripts/render.sh <name>` (or `FPS=60 ./make.sh`) renders 60. The app's 30/60 switch next to Export sets it.
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
- **Fixed spine, varied reel**: every reel is two comparisons (BRAND.md §2), so never let it become "only the nouns
  change" — that's what the July 2026 "generic, repetitive, template-based" wording targets. Change the hook, the
  question wording, card colours/symbols, stickers, background, ending and CTA vs the previous reel (`TOPICS.md`).
- **A real example per comparison** (numbers on the cards, checked) — knowledge, not just definitions.
- **Add Joe's own angle** in each video: one line with his take, a personal moment or a memory trick ("Joe's tip").
- **Education, not advice**: finance/health/legal = explain terms & concepts only. Never "you should buy/invest/take…".
  YouTube demonetizes AI personas presented as human experts giving such advice.
- **Audio rights**: only SFX/music with a provable license — use the library below (see `input/general/sfx/LICENSES.md`).
  New reels use library sounds only; Joe's 6 downloaded SFX (unknown sources) stay only in older reels.
  ElevenLabs needs a paid plan (commercial rights for the voice).
- **No copied assets** from reference videos — reference = inspiration for pacing/format only.
- **Disclosure**: "altered or synthetic content" toggle is required only for realistic content that could mislead;
  cartoon avatar + AI voice explainer doesn't need it, but turning it on never hurts.
- Prefer also making a long-form (3–8 min) version of strong topics — Shorts pay far less per view, and long-form
  watch hours are what qualify. From Feb 1, 2027 new applicants need 1,000 subs + 8,000 watch hours (365 days) or
  20M Shorts views (90 days); Shorts ad revenue then needs 10M Shorts views in the last 90 days (YouTube blog, Aug 2026).

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
- **Small files, still full HD, one encode:** HyperFrames encodes straight at H.264 CRF 25, same 1080×1920 and fps
  (~5.5 MB per 40s reel, same quality as the old CRF 23 re-encode); `render.sh` then only copies the video and fixes the
  loudness — no second encode. `CRF=20 ./scripts/render.sh <p>` for a bigger, closer file.
- **Quiet export log:** `render.sh` shows "progress: 45% Rendering frames" lines (`scripts/render-progress.mjs`) and
  errors only; the full engine log is in `$TMPDIR/vfx-render-<project>.log` (printed on failure), `VERBOSE=1` shows all.
  The app turns those lines into a progress bar; its log stays behind "Show details".
- **Output name (every output):** `<project>-final_edit.mp4` or `<project>-final-edit.mp4`, picked at random on each
  render (`final_name` in `scripts/_project.sh`), e.g. `money-terms-final_edit.mp4`. Older reels may still have
  `<project>-FINAL.mp4`; the app and `finalize.sh` accept all three.
- **One video per project, always.** `output/<project>/` (e.g. `output/money-terms/`) must contain exactly ONE video:
  `<project>-final_edit.mp4` / `-final-edit.mp4` (+ its `review/` folder). `render.sh` enforces it — every render
  replaces it and deletes any other video and old review folder there (`both` engines is blocked; `KEEP_OLD=1` only for a
  deliberate A/B test, then clean up). `./scripts/finalize.sh <project> [video]` does the same by hand. Never leave old
  versions, previews or `-v2` files lying around; after each revision re-run `./scripts/review.sh <project>`.

## Channel handle (on every reel)
- Plain text `@knowledgeby` (black) + `joe` (orange #ff4d2e, the arrow color), Patrick Hand ~70px (the caption font).
  No pill, no box, no avatar. Fixed from frame 0 to the end (so it's in the thumbnail), centered under the sticker at
  y ≈1635–1719 — as low as it goes while staying above the Reels/Shorts caption/username overlay.
- Config: `input/general/brand/brand.json` (`parts` = colored pieces of the handle). build.mjs renders it as
  `.channel-badge` — overlay classes must be unique (a reused `.brand` class once broke the card logos).

## Explainer building blocks (builder: `hyperframes/_template/build.mjs` + `make.sh`; reference reel: `hyperframes/celsius-fahrenheit-km-miles/`)
- `new-project.sh` and the app's "+ New reel" copy the builder from `_template/`; improve it there (and in the reel you're on).
- `cards` in script.json: `{label, big, sub, color (blue|orange|green|red|ink), facts: [[label, value], …]}` → fact
  rows `#<key>-f1…` (pop/pulse them on the spoken word; unrevealed ones pop on the card's focus line). `{label, html}`
  still makes a hand-made mock UI. A single `recap` line = one big centered "Joe's tip" tile.
- `script.json` lines: `pair` + `show`/`focus` (cards + one orange arrow), `react` (sticker), `question: true` (wiggle + "?"),
  `pause` (important beats only), `sfx: [...]`, `recap: {term, means}` (2x2 tick tiles), `cta: true` (handle pulses).
- Generic `actions`: `{type:"pop", el:"#id", word, sfx}` reveals a hidden `.later` element on a word;
  `{type:"swap", from:"#a", to:"#b", word, sfx}` changes a value (balances, amounts) on a word.
- End sparkles sit around the sticker (never over the face).
- Rotate the SFX style per video (accounting-terms: uisfx dreamy/minimal → celsius-fahrenheit-km-miles: uisfx organic).

- Actions in script.json (per line): `pop` (show a hidden `.later` element on a word), `swap` (value A → value B),
  `pulse` (bump + yellow highlight on something already visible, e.g. a number the voice says), optional `delay` (s).
  Action words match on letters AND digits, so `"word": "$10,000"` works for numbers.
- Worked examples beat definitions: show the math on the cards ($10,000 − $7,000 = $3,000) and double-check it adds up.
- Long recap terms (> 8 letters, e.g. "Liabilities") auto-shrink to 72px so they don't hit the ✓.

- CTA is follow or like only (no "save"), never the same type as the previous reel, wording rotated: CTA line in
  script.json = `{"text": "auto", "cta": true}`; build.mjs picks it, adds the matching icon beside the handle,
  and make.sh compares the resolved text so the voice stays in sync. Log `cta: <type>` in TOPICS.md. See BRAND.md §2.

## Sound mix (not machine-made) — every reel
- New reels: library sounds only (uisfx CC0 styles + earshot renders), lead hits and layers alike. Older reels used
  Joe's own downloaded SFX (`pop_7e9Is8L`, `question-pop`, `face_left`, `face_right`, `ding-sound-effect_2`, `correct`).
- In `script.json` a cue can be an ARRAY of variants (rotated per occurrence, never the same sample twice in a row)
  and each variant can have `layers: [{src, volume, offset}]`. build.mjs adds 0–20ms timing drift and ±7% level per hit,
  and reads real durations with ffprobe.
- Arrow draw = a swish (+ quiet whoosh layer); arrow lands = soft tap; scene/card swaps = whoosh;
  recap entry = big whoosh; riser ends right as the CTA starts; CTA = achievement + shimmer.
- SFX must sit UNDER the voice (adds ≤ ~2 dB at its onset). Rotate the uisfx style / earshot family between videos.
- Note: Joe's 6 originals have unknown sources (Content ID risk for YPP) — kept in the older reels only.

## Joe's name in every mock UI — every reel
- Any bank card, account, app screen, invoice, pay stub, receipt, chat or form drawn in a reel uses Joe's name —
  never "You", "User", "John Doe" or blank: cards print `JOE`, accounts say "Joe's Account" / "Joe's Checking" /
  "Joe's Savings" / "Joe's Credit", balances "Joe owes $…", invoices "Bill to: Joe", pay stubs "Employee: Joe",
  phone/bank apps "Joe's Account". Companies/banks stay fictional (MyBank, Acme Studio/Inc.).
- Brand colors: orange `#ff4d2e` (`--hot`: arrow, "joe" in the handle, "?" marks, recap "= …") and ink `#161616` (`--ink`).

## vfx Studio app (`app/`)
- Mac editor for this pipeline (Electron + React + TS + Tailwind + shadcn/ui): media bin, frame-accurate preview,
  timeline, inspector, Claude Code chat, Make reel / Review buttons. See `app/README.md`.
- Run: `cd app && npm install && npm run dev`. Build dmgs (Apple Silicon + Intel): `npm run dist:mac`.
- Timeline edits live in `hyperframes/<project>/overrides.json` and are applied by every `build.mjs` through
  `scripts/overrides.mjs` — new projects copied from `hyperframes/business-terms/` already include that call.
- Use the `app-engineer` agent for app work; commit each step (`.claude/rules/git.md`).

## Pull requests — never "Generated by Claude Code"
- No Claude / AI attribution anywhere: commits, PR titles, PR descriptions, PR comments (see `.claude/rules/git.md`).
- Claude's cloud sessions add a `_Generated by [Claude Code](…)_` footer to every PR description/comment they post,
  and it comes back on edits made from there. Right after opening/merging a PR from a cloud session, remove it:
  edit it out in Joe's browser, or run `./scripts/strip-pr-footer.sh <PR numbers>` (no args = every PR).
- `./scripts/pr.sh` (Joe's own gh login) never adds it.

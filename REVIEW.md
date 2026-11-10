# Video review — run before EVERY publish

Nothing gets published (or sent to Joe as "final") until this passes.

1. Run the automatic part:
   ```bash
   ./scripts/review.sh <project>            # newest render in output/<project>/
   ./scripts/review.sh <project> path/to/video.mp4
   ```
   It writes `output/<project>/review/<video-name>/`:
   - `REPORT.md`: export specs, loudness, peaks, silent gaps, voice-seam list, plus this checklist.
   - `contact.jpg`: a frame every second (labelled with the time).
   - `beats.jpg`: a frame at every line start + 0.6s and at every action (stamp, deposit…).
2. Look at `contact.jpg` and `beats.jpg` frame by frame and tick the checklist below.
3. Listen once start to finish with headphones (seams, SFX levels, stutters).
4. Fix → re-render → re-run `review.sh` until everything passes.
5. Finalize: `./scripts/finalize.sh <project>` — keeps ONLY the approved video as `output/<project>/<project>-FINAL.mp4`,
   deletes every other render and old review folder in that project's output (one video per project, no confusion),
   and re-runs the review on the final.

## Graphics (look at every frame)
- [ ] **No doubled pointers.** Exactly ONE arrow per pointing beat: the drawn orange arrow. Pointing stickers have
      their black doodle arrows removed (originals in `input/general/my different reactions/_originals-with-doodles/`),
      so never use those originals, and never add a second arrow, hand icon or doodle next to the drawn one.
- [ ] Arrow starts at the fingertip and lands on the card it talks about (not on the caption, not off-card).
- [ ] No border, ring or outline on the cards. Nothing covers a card's label or its text.
- [ ] Stickers have no boxy or straight cut edges and no visible halo/shadow outline.
- [ ] No card is washed out or half-faded at the wrong time (dim is only for the card NOT being talked about).
- [ ] Captions: spelled right, one line, not clipped, not overlapping the cards or the label.
- [ ] Nothing important in the platform UI zones: top 200px, bottom 350px, right 120px (like/comment buttons)
      between y 1000 and 1700.
- [ ] Channel handle `@knowledgeby` (black) + `joe` (orange) is on EVERY frame (incl. the first = thumbnail), same spot
      (y ≈1635–1719, centered under the sticker), plain text in Patrick Hand: no pill/box/avatar, nothing overlapping it.
- [ ] Mock UIs use Joe's name, never "You"/"User"/generic: bank cards say JOE, accounts "Joe's Account" /
      "Joe's Checking" / "Joe's Savings", "Joe owes …", invoices "Bill to: Joe", pay stubs "Employee: Joe".
- [ ] Background fills the frame edge to edge (no strips, borders or letterboxing), and its texture doesn't fight the text.
- [ ] No leftover elements: a stamp, notification, badge, "?" or sparkle hanging around after its beat ends.
- [ ] No text on top of other text (floating numbers, badges, captions over card text).
- [ ] No decorative doodles/ink lines that aren't attached to anything (they read as broken graphics).
- [ ] Every card/state appears when the voice says it (caption word = visual change).

## Motion
- [ ] Entrances aren't jittery or popping at the wrong frame; nothing jumps between two consecutive frames.
- [ ] Card swap between topics is clean (old pair fully gone before the new pair lands).
- [ ] The last frame is a deliberate end pose, not a mid-animation freeze.

## Audio
- [ ] Voice: no stutter, repeated syllable, clipped word or click at the pause seams (REPORT.md lists the seam times).
- [ ] Pauses only on important beats; no dead air longer than ~0.8s (REPORT.md flags silent gaps).
- [ ] SFX are under the voice, never louder than it; no SFX hits mid-word on an important word.
      Check: rebuild the voice-only track from the index.html voice clips and compare 120ms windows at each SFX onset —
      the SFX should add ≤ ~2 dB over the voice there (loud spots that are the voice's own emphasis are fine).
- [ ] Sound doesn't feel machine-made: no identical sample twice in a row for the same cue (variants rotate), Joe's own
      SFX are in the mix as lead hits, library sounds as variants/quiet layers, whoosh on scene changes, riser into CTA.
- [ ] Loudness about −14 LUFS integrated, true peak ≤ −1 dBTP (REPORT.md); nothing distorted.
- [ ] Only licensed sounds (see `input/general/sfx/LICENSES.md`). CC BY credits copied into the description.

## Content / YouTube Partner Program (YPP)
- [ ] New topic and a different format/hook/background from the last video (`TOPICS.md` updated).
- [ ] Education, not advice. Facts double-checked (numbers on the cards add up, e.g. 3,000 − 450 − 120 − 80 = 2,350).
- [ ] Hook in the first 2s, clear payoff, CTA at the end.
- [ ] CTA type (follow / like / save) differs from the previous reel, its icon pops beside the handle, and
      `TOPICS.md` logs it (`bg: … · cta: <type>`).

## Export
- [ ] 1080×1920, 30 fps, H.264 + AAC, 15–60s (REPORT.md checks these).
- [ ] After `finalize.sh`: `output/<project>/` holds exactly ONE video, `<project>-FINAL.mp4` (+ its review folder).

## Known past bugs (don't repeat)
| Bug | Cause | Fix |
|---|---|---|
| Doubled arrow (black ↗ + orange) | Sticker art had a doodle arrow | Doodles removed from pointing stickers; only the drawn arrow is allowed |
| Orange border covering "Receipt" label | Focus ring around the card | Rings removed; the arrow alone points |
| Voice stutter at 19–21s | Per-line voice clips padded ±0.1s replayed the next word | One continuous take; cut only at explicit pauses, in the silence midpoint |
| Receipt washed out from frame 0 | GSAP `fromTo` flash rendered its from-state immediately | `immediateRender:false` on overlays |
| Boxy sticker edges | Even-grid crop of the sticker sheets | Re-cut along real gaps + faded cut edges |
| Clipped fingertip | Even-grid crop | Same as above |
| Black ink "burst" lines floating beside the head | Impact-burst effect positioned on the sticker box, not the head | Removed; the elastic pop-in is the reaction effect |
| "+$2,350" text sitting on the "$2,350.00" balance, lingering into the CTA | Floating text over text, long hold | Solid green badge over the transaction list, gone before the next line |
| Dead air ~1s after some lines | ElevenLabs' own sentence pauses (0.6–0.8s) + our pause stacked on top | `pause` = TOTAL silence; other gaps capped (maxLineGap 0.38s / maxWordGap 0.28s) |
| Card logos ("Acme Studio") vanished | New badge reused the CSS class `.brand` already used inside the cards | Unique class names for overlays (`.channel-badge`, `.cb-*`) |
| Reel quieter than other Shorts (−19.5 LUFS) | No loudness pass | `render.sh` normalizes every render to −14 LUFS / −1.5 dBTP |

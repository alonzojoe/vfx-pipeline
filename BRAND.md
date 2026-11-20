# @knowledgebyjoe — brand book

This is what makes a reel look and sound like **ours**. Every new reel follows it; anything not covered here
should match the newest reel in `hyperframes/`. It also keeps the channel YPP-safe: one recognizable creator
(Joe, his face, his scripts, his editing), not template-farm content.

**Name:** Knowledge by Joe · **Handle:** @knowledgebyjoe (same on YouTube, TikTok, Facebook)
**Bio / tagline (all socials):** "Quick comparisons. Easy explanations. Learn something new every day."
**Profile picture (all socials):** Joe's `chill` sticker (hands behind head, eyes closed, smiling) on white, in a circle.
Every reel's look should feel like that picture: Joe's illustrated face, white/paper, black ink lines.
Banner / cover photo: skipped for now (Joe: not important yet).

---

## 1. Topics — what we talk about
- **General knowledge, two quick comparisons per reel**: things people mix up — science (Celsius vs Fahrenheit),
  measurement (kilometers vs miles), money (debit vs credit), tech, health terms, history, language, everyday life.
  Our earlier run (invoice vs receipt, gross vs net, revenue vs profit…) was money-only; now any field.
- Always **education, never advice**. No "you should buy/invest/take…". Facts and numbers double-checked.
- Never repeat a topic or a pair; log every reel in `TOPICS.md`.

## 2. The format — two comparisons, straight to the point
The spine is fixed; everything around it changes per reel (YouTube's July 2026 rule demonetizes "generic, highly
repetitive, or template-based" videos — a reel where only the nouns change is exactly that).

Per comparison (×2):
1. **"This is X." → "This is Y."** — each card pops in as it's named (`show` left/right).
2. **A difference question** — "What's the difference?" (cards wiggle, "?" marks).
3. **One line about X, one line about Y** — short, plain, correct (`focus` + orange arrow).
4. **One real example with numbers** — "Water boils at 100°C, which is 212°F." / "A 5K race is about 3.1 miles."
   The numbers are on the cards and pulse/pop as they're said. Math and facts double-checked.

Then:
5. **One line from Joe** — his own take, a personal moment or a memory trick ("I always mix these up when I travel" →
   "Joe's tip: miles × 1.6 ≈ km" tile). This is the "own perspective" YouTube looks for.
6. **CTA, randomized per reel**: **follow** ("Follow for more everyday knowledge!"), **like** or **save**. Never the
   same CTA type as the previous reel. In script.json: `{"text": "auto", "cta": true}` — build.mjs picks the type +
   wording (force one with `"ctaType": "save"`) and an icon pops beside the handle. Log `cta: <type>` in `TOPICS.md`.

What changes every reel (never the same as the previous one — check `TOPICS.md`):
- **Hook**: "This is X. This is Y." / a question ("Celsius or Fahrenheit?") / a surprising number ("Water boils at
  212 degrees?!") / "Most people get this wrong".
- **Question wording**: "What's the difference?" / "So which is which?" / "How are they different?"
- **Look**: card colours + symbols, background, stickers, Joe's line, ending, CTA, SFX palette.

Writing: short lines spoken like a friend, not a textbook; pauses only on big beats (after the question, at the
topic switch, before the CTA). Length 25–35s. Cards come from `cards` in script.json (big symbol/value, one sub
line, 1–3 checked facts) — no hand-made HTML needed; a mock UI is still allowed for money topics (§7).

## 3. Colors
| Token | Hex | Used for |
|---|---|---|
| Hot orange `--hot` | `#ff4d2e` | THE brand color: pointing arrow, "joe" in the handle, "?" marks, recap "= meaning" |
| Ink `--ink` | `#161616` | Text, card borders + hard shadows, "@knowledgeby" |
| Paper | `#ffffff` | Cards, recap tiles |
| Accent blue | `#2f6bff` | Mock-UI titles/logos (SALES, CHECKING, MyBank chip) |
| Money green | `#16a34a` / `#15803d` | Money in, totals, ✓ checks, interest |
| Money red | `#c62828` | Money out, debts, what's owed |
| Spark yellow | `#ffc400` (sparkles), `#ffd84d` (highlight) | Ending sparkles, number highlight |
| Muted gray | `#6b7280` | Small labels inside mock UIs |

No other colors for brand elements. No gradients except inside mock bank cards.

## 4. Fonts (only these two — files in `input/general/fonts/`)
- **Patrick Hand** (handwritten) — everything "Joe says": captions 80px, card labels 74px, recap terms 88px
  (72px for long words), "?" marks 140px, the handle 70px.
- **Fredoka** 600/700 — everything "on a screen": mock-UI text, numbers, balances, recap meanings.
- Never use system/default fonts, never a third font.

## 5. The look (layout, 1080×1920)
- Paper background from `input/general/background/` — a different one than the previous reel (`TOPICS.md`).
- Top to bottom, one reading band: **cards → caption → Joe → handle** (the eyes never jump to the top edge).
- Two cards side by side (wrapper top 200, cards ≈312–872; titles stay below the top 200px app UI): white, 30px rounded corners, 5px ink border,
  **10px hard ink shadow** (paper cut-out look). Label above each card in Patrick Hand with a 16px gap — the
  tails of y/g/p never touch the card. No rings/borders around the active card.
- Caption **in the middle** (y ≈908–1018, between the cards and Joe), one line, 1–3 words at a time, synced to the
  voice; a soft paper halo lets the orange arrow pass behind the words.
- Joe's sticker under the caption (y ≈1080–1550, same size as before). Handle fixed at y ≈1635, every frame.
- Platform safe zones stay clear: top 200px, bottom 350px, right 120px.

## 6. Joe's avatar (the host)
- Joe's real-face reaction stickers (`input/general/my different reactions/`) — he is on screen in every line.
- One reaction per line, picked by meaning:
  | Moment | Stickers |
  |---|---|
  | Hook / question | `thinking`, `thinking-2`, `confused`, `look-up`, `point-at-you` |
  | Explaining a card | `point-up-left`, `point-up-right` (+ the orange arrow) |
  | Worked example / punchline | `smirk-thumb`, `side-eye`, `shocked-2`, `laugh` |
  | Recap | `thumbs-up`, `smile-2`, `cool`, `chill`, `side-eye` |
  | CTA | `point-at-you`, `point-at-you-2` |
- Stickers pop in with an elastic squash; no drop-shadow, no boxy edges, no doodle arrows (one orange arrow only).

## 7. Mock UIs
- Always **Joe's name**: "JOE" on cards, "Joe's Account / Checking / Savings / Credit", "Joe's Shop",
  "Joe owes", "Bill to: Joe", "Employee: Joe", "What Joe keeps". Never "You"/"User"/John Doe.
- Brands stay fictional: MyBank, Joe's Shop, Acme Studio.
- Show the idea, don't just label it: balances change, rows pop in on the spoken word, numbers flash when said.

## 8. Motion
- Pops with `back.out` overshoot; captions pop per chunk; cards enter rotated and settle.
- "What's the difference?" → cards wiggle + orange "?" marks float.
- Pointing → hand-drawn orange arrow draws from the fingertip to the card, the card bumps when it lands,
  the other card dims.
- Topic switch → old cards fly out sideways with a whoosh.
- End → yellow sparkles **around** the sticker (never on the face), handle pulses on the CTA.

## 9. Sound
- Voice: ElevenLabs **Brian** (`nPczCjzI2devNBz1zQrb`, a default voice: American, deep, narration — works on the
  free plan) at speed 1.15, stability 0.5, style 0.2 (calm, quick) from the two-comparison format on (older reels: Liam).
  Library voices (e.g. Brian S) need a paid ElevenLabs plan, and so do commercial rights (YPP). New reels take the
  voice from `hyperframes/_template/script.json`. Future upgrade: Joe's own voice
  (recording or his own ElevenLabs voice clone) — strongest proof of a real creator for YPP.
- **New reels use library sounds only** (uisfx CC0 + earshot renders, `input/general/sfx/LICENSES.md`): Joe's 6
  downloaded SFX have unknown sources (Content ID risk for YPP), so they stay only in the older reels.
  Whoosh on scene changes, riser into the CTA, rotate variants so nothing repeats twice in a row; pick a different
  uisfx style / earshot family than the previous reel.
- SFX always under the voice. Final mix −14 LUFS / −1.5 dBTP.

## 10. Never
- Doubled arrows, rings around cards, text on text, floating doodles, leftover elements after their beat.
- The same background, hook, question wording or CTA type as the previous reel. A reel where only the nouns changed.
- Unlicensed music/SFX. Advice instead of education. Generic names in mock UIs.
- More than one video in `output/<topic>/` (only `<topic>-final_edit.mp4` / `<topic>-final-edit.mp4`).

# @knowledgebyjoe — brand book

This is what makes a reel look and sound like **ours**. Every new reel follows it; anything not covered here
should match the newest reel in `hyperframes/`. It also keeps the channel YPP-safe: one recognizable creator
(Joe, his face, his scripts, his editing), not template-farm content.

**Name:** Knowledge by Joe · **Handle:** @knowledgebyjoe (same on YouTube, TikTok, Facebook)
**Bio / tagline (all socials):** "Big ideas. Simple explanations. Learn something new in 30 seconds."
**Profile picture (all socials):** Joe's `chill` sticker (hands behind head, eyes closed, smiling) on white, in a circle.
Every reel's look should feel like that picture: Joe's illustrated face, white/paper, black ink lines.
Banner / cover photo: skipped for now (Joe: not important yet).

---

## 1. Topics — what we talk about
- Big ideas people mix up or never learned, explained simply: personal finance, business, banking (our run so far:
  invoice vs receipt, gross vs net pay, debit vs credit, checking vs savings, revenue vs profit, assets vs liabilities),
  and — per the YouTube description — science, technology, history and human behavior too.
- Always **education, never advice**. No "you should buy/invest…". Facts and numbers double-checked.
- Never repeat a topic; log every reel in `TOPICS.md` and change the format/hook/background from the last one.

## 2. How we write (scripts)
- Short, catchy lines (3–9 words). Spoken like a friend explaining, not a textbook.
- **Hook in the first 2 seconds.** Our hook styles (rotate them):
  - "This is X. And this is Y. But what's the difference?"
  - A question: "Think you understand banking?" / "Invoice or receipt?"
  - A "most people get this wrong" line.
- Two X-vs-Y pairs per reel, each card explained in one sentence.
- A **worked example with real numbers** shown on the cards ($10,000 − $7,000 = $3,000). Math must add up.
- **2×2 recap** ("Revenue is earned. Profit is what's left…") then a **CTA, randomized per reel**:
  **follow** ("Follow for more big ideas!"), **like** ("Like this video if you learned something!") or
  **save** ("Save this video so you don't forget!"). Never the same CTA type as the previous reel.
  In script.json write the CTA line as `{"text": "auto", "cta": true}` — build.mjs picks the type + wording
  (force one with `"ctaType": "save"`), and an icon pops beside the handle (+ follow · 👍 thumbs-up like · bookmark save).
  Log it in `TOPICS.md` as `cta: <type>` in the Background column.
- Pauses only on the big beats (after the hook question, topic switch, into the recap, before the CTA).
- Length 25–35s.

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
- **Patrick Hand** (handwritten) — everything "Joe says": captions 100px, card labels 74px, recap terms 88px
  (72px for long words), "?" marks 140px, the handle 70px.
- **Fredoka** 600/700 — everything "on a screen": mock-UI text, numbers, balances, recap meanings.
- Never use system/default fonts, never a third font.

## 5. The look (layout, 1080×1920)
- Paper background from `input/general/background/` — a different one than the previous reel (`TOPICS.md`).
- Caption on top (y 200), one line, 1–3 words at a time, synced to the voice.
- Two cards side by side (top 370): white, 30px rounded corners, 5px ink border, **10px hard ink shadow**
  (paper cut-out look). Label above each card in Patrick Hand. No rings/borders around the active card.
- Joe's sticker under the cards (y ≈1050–1520). Handle fixed at y ≈1635, every frame.
- Platform safe zones stay clear: top 200px, bottom 350px, right 120px.

## 6. Joe's avatar (the host)
- Joe's real-face reaction stickers (`input/general/my different reactions/`) — he is on screen in every line.
- One reaction per line, picked by meaning:
  | Moment | Stickers |
  |---|---|
  | Hook / question | `thinking`, `thinking-2`, `confused`, `look-up`, `point-at-you` |
  | Explaining a card | `point-up-left`, `point-up-right` (+ the orange arrow) |
  | Worked example / punchline | `smirk-thumb`, `side-eye`, `shocked`, `laugh` |
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
- Voice: ElevenLabs **Liam** (energetic, young) — settings in each `script.json`. Future upgrade: Joe's own voice
  (recording or his own ElevenLabs voice clone) — strongest proof of a real creator for YPP.
- Joe's own SFX lead (pop, question-pop, face_left/right, ding, correct); library sounds as variants + quiet layers.
  Whoosh on scene changes, riser into the CTA, rotate variants so nothing repeats twice in a row.
- SFX always under the voice. Final mix −14 LUFS / −1.5 dBTP.

## 10. Never
- Doubled arrows, rings around cards, text on text, floating doodles, leftover elements after their beat.
- The same background, hook or CTA wording as the previous reel.
- Unlicensed music/SFX. Advice instead of education. Generic names in mock UIs.
- More than one video in `output/<topic>/` (only `<topic>-FINAL.mp4`).

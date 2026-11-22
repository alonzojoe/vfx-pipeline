# Reel rules (short version — the full rules live in the root docs)

- Read `BRAND.md` before every reel (topics, script style, colors, fonts, avatar, motion, sound, randomized CTA).
- Format: two comparisons per reel ("This is X. This is Y." → "What's the difference?" (always these words) → one line
  each → a real example), one line in Joe's own voice, CTA. Vary the hook and look vs the previous reel — never "only
  the nouns change".
- Read `REVIEW.md` before calling a reel done; `./scripts/review.sh <project>` and look at every frame.
- Log every reel in `TOPICS.md` (topic, format, hook, voice, `bg: … · cta: …`). Never repeat a topic, background or
  CTA type back to back.
- Cards carry no names. Only a mock UI of something personal (bank card, account, invoice…) uses Joe's name ("JOE").
- Exactly one video per `output/<project>/`: `<project>-final_edit.mp4` or `<project>-final-edit.mp4` (random per
  render; full HD 1080×1920, small H.264 CRF 25 encoded once by HyperFrames).
- The ElevenLabs key lives in `.env`; never print, read or commit it.

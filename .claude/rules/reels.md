# Reel rules (short version — the full rules live in the root docs)

- Read `BRAND.md` before every reel (topics, script style, colors, fonts, avatar, motion, sound, randomized CTA).
- Read `REVIEW.md` before calling a reel done; `./scripts/review.sh <project>` and look at every frame.
- Log every reel in `TOPICS.md` (topic, format, hook, voice, `bg: … · cta: …`). Never repeat a topic, background or
  CTA type back to back.
- Mock UIs always use Joe's name ("Joe's Account", "Joe's Shop", "JOE" on cards).
- Exactly one video per `output/<project>/`: `<project>-final_edit.mp4` or `<project>-final-edit.mp4` (random per
  render; full HD 1080×1920, small H.264 CRF 23).
- The ElevenLabs key lives in `.env`; never print, read or commit it.

// Run: npx tsx src/main/services/usage.test.ts  (self-check, no test framework needed)
import assert from 'node:assert/strict'
import { claudeFromEvent, elevenFromSubscription, envValue, fresh } from './usage'

// .env parsing: plain, export, quotes, comments, other keys
const env = `# ElevenLabs\nELEVENLABS_VOICE_ID=abc\nexport ELEVENLABS_API_KEY="sk_123" \nOTHER=1`
assert.equal(envValue(env, 'ELEVENLABS_API_KEY'), 'sk_123')
assert.equal(envValue('ELEVENLABS_API_KEY=sk_9 # mine', 'ELEVENLABS_API_KEY'), 'sk_9')
assert.equal(envValue("ELEVENLABS_API_KEY='a b'", 'ELEVENLABS_API_KEY'), 'a b')
assert.equal(envValue('ELEVENLABS_API_KEY=', 'ELEVENLABS_API_KEY'), null)
assert.equal(envValue('# ELEVENLABS_API_KEY=x', 'ELEVENLABS_API_KEY'), null)
assert.equal(envValue('ELEVENLABS_API_KEY_OLD=x', 'ELEVENLABS_API_KEY'), null)

// ElevenLabs subscription → credits
assert.deepEqual(elevenFromSubscription({ character_count: 2500, character_limit: 10000, next_character_count_reset_unix: 1800000000, tier: 'free' }, 1), {
  ok: true, used: 2500, limit: 10000, resetsAt: 1800000000, tier: 'free', at: 1
})
assert.equal(elevenFromSubscription({}, 1).ok, false)
assert.equal(elevenFromSubscription({ character_count: 1, character_limit: 0 }, 1).ok, false)

// Claude Code rate_limit_event (the shape `claude -p --output-format stream-json --verbose` prints)
const ev = {
  type: 'rate_limit_event' as const,
  rate_limit_info: {
    rateLimitType: 'five_hour',
    resetsAt: 1795711800,
    unifiedWindows: { five_hour: { utilization: 0.04, resetsAt: 1795711800 }, seven_day: { utilization: 0.42, resetsAt: 1795744800 } }
  }
}
const c = claudeFromEvent(ev, null, 5)
assert.ok(c)
assert.equal(Math.round(c.session!.usedPct), 4)
assert.equal(Math.round(c.week!.usedPct), 42)
assert.equal(c.week!.resetsAt, 1795744800)
// older single-window shape keeps the other window from before
const only = claudeFromEvent({ type: 'rate_limit_event', rate_limit_info: { rateLimitType: 'five_hour', utilization: 0.5, resetsAt: 9 } }, c, 6)
assert.equal(only!.session!.usedPct, 50)
assert.equal(Math.round(only!.week!.usedPct), 42)
// no numbers (API-key login) → nothing to show
assert.equal(claudeFromEvent({ type: 'rate_limit_event', rate_limit_info: { rateLimitType: 'five_hour' } }, null), null)
assert.equal(claudeFromEvent({ type: 'rate_limit_event' }, null), null)
// a window past its reset starts at 0%
assert.deepEqual(fresh({ usedPct: 80, resetsAt: 10 }, 11_000), { usedPct: 0, resetsAt: null })
assert.deepEqual(fresh({ usedPct: 80, resetsAt: 10 }, 9_000), { usedPct: 80, resetsAt: 10 })

console.log('✓ usage')

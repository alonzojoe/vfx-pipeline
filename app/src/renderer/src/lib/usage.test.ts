// Run: npx tsx src/renderer/src/lib/usage.test.ts  (self-check, no test framework needed)
import assert from 'node:assert/strict'
import { claudeMeter, elevenMeter, resetText, toneOf } from './usage'

assert.equal(toneOf(80), 'ok')
assert.equal(toneOf(20), 'low')
assert.equal(toneOf(5), 'out')

const now = Date.UTC(2026, 10, 26, 12)
const e = elevenMeter({ ok: true, used: 7500, limit: 10000, resetsAt: null, tier: 'free', at: 0 }, now)
assert.equal(e.leftPct, 25)
assert.equal(e.tone, 'ok')
assert.equal(e.lines[1], '2,500 of 10,000 left (25%)')
assert.match(e.lines[2], /≈ 4 reels/)
assert.equal(elevenMeter({ ok: false, reason: 'Offline', at: 0 }).leftPct, null)
assert.equal(elevenMeter({ ok: true, used: 12000, limit: 10000, resetsAt: null, tier: '', at: 0 }).leftPct, 0) // over the limit

// the Claude bar follows the window closest to its limit
const c = claudeMeter({ session: { usedPct: 4, resetsAt: null }, week: { usedPct: 80, resetsAt: null }, at: 0 }, now)
assert.equal(c.leftPct, 20)
assert.equal(c.tone, 'low')
assert.deepEqual(c.lines.slice(1), ['5-hour session: 96% left', 'This week: 20% left'])
assert.equal(claudeMeter(null).leftPct, null)

assert.equal(resetText(null), '')
assert.equal(resetText(now / 1000 + 56 * 60, now), 'resets in 56 min')
assert.equal(resetText(now / 1000 + 190 * 60, now), 'resets in 3 h 10 min')
assert.equal(resetText(now / 1000 + 120 * 60, now), 'resets in 2 h')
assert.match(resetText(now / 1000 + 2 * 86400, now), /^resets [A-Z][a-z]{2} \d+:\d\d [AP]M$/)
assert.match(resetText(now / 1000 + 30 * 86400, now), /^resets [A-Z][a-z]{2} \d+$/)
console.log('usage ✓')

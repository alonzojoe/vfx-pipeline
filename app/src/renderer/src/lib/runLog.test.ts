// Run: npx tsx src/renderer/src/lib/runLog.test.ts  (self-check, no test framework needed)
import assert from 'node:assert/strict'
import { readLog } from './runLog'

const log = 'Exporting a · 1080×1920 · 30 fps\nprogress: 5% Preparing\nprogress: 45% Rendering frames\n  rendered in 1m 2s\nprogress: 100% Balancing loudness\n  size: 5.1M\n'
const r = readLog(log)
assert.equal(r.pct, 100)
assert.equal(r.stage, 'Balancing loudness')
assert.equal(r.text, 'Exporting a · 1080×1920 · 30 fps\n  rendered in 1m 2s\n  size: 5.1M')
// runs without progress lines (build, voice, review) keep their log as is
assert.deepEqual(readLog('✓ index.html 38s\n'), { pct: null, stage: '', text: '✓ index.html 38s' })
// a progress line arriving in the middle of a chunk still counts
assert.equal(readLog('x\nprogress: 30% Rendering frames').pct, 30)
console.log('runLog ✓')

// Run: npx tsx src/main/services/paths.test.ts  (self-check, no test framework needed)
import assert from 'node:assert/strict'
import { projectName, servable } from './paths'
import { byteRange } from './range'

// vfx:// only serves the reel folders, never secrets or git
for (const ok of ['hyperframes/money-terms/index.html', 'input/general/sfx/pop.mp3', 'output/a/a-FINAL.mp4', 'input/general/my different reactions/smile.png'])
  assert.equal(servable(ok), true, ok)
for (const bad of ['.env', 'hyperframes/.env', 'input/x/.env.local', '.git/config', 'hyperframes/p/.hyperframes/x', 'scripts/voice.mjs', 'app/package.json', '.claude/settings.json', 'TOPICS.md', 'hyperframes'])
  assert.equal(servable(bad), false, bad)

// project names are slugs — no traversal, no shell tricks
for (const ok of ['money-terms', 'new-reel-2', 'wage_vs_salary']) assert.equal(projectName(ok), ok)
for (const bad of ['..', '../x', 'a/b', '.env', '', '-x', "a'b", 'a b', 42, null]) assert.throws(() => projectName(bad), String(bad))

// Range requests
assert.equal(byteRange(null, 100), null)
assert.deepEqual(byteRange('bytes=0-', 100), { start: 0, end: 99 })
assert.deepEqual(byteRange('bytes=10-19', 100), { start: 10, end: 19 })
assert.deepEqual(byteRange('bytes=90-500', 100), { start: 90, end: 99 }) // end past the file is clamped, not 416
assert.deepEqual(byteRange('bytes=-30', 100), { start: 70, end: 99 })
assert.deepEqual(byteRange('bytes=-500', 100), { start: 0, end: 99 }) // suffix bigger than the file
for (const bad of ['bytes=-', 'bytes=100-', 'bytes=50-10', 'items=0-1', 'bytes=0-1,5-6']) assert.equal(byteRange(bad, 100), 'invalid', bad)
assert.equal(byteRange('bytes=0-', 0), 'invalid')

console.log('paths ✓')

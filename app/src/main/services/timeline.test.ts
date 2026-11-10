// Run: npx tsx src/main/services/timeline.test.ts  (self-check, no test framework needed)
import assert from 'node:assert/strict'
import { parseComposition } from './timeline'

const html = `
<div id="root" data-composition-id="main" data-start="0" data-duration="31.4" data-width="1080">
<img id="bg-paper" class="clip bg" src="general/background/bg3.jpg" data-start="0" data-duration="31.4" />
<div id="card-revenue" class="clip card-wrap" data-start="0.2" data-duration="17.4"><div class="card-label">Revenue</div></div>
<div id="cap-1" class="clip caption" data-start="0.22" data-duration="1.2">This is revenue.</div>
<img id="react-1" class="clip reaction" src="general/my%20different%20reactions/point-up-left.png" data-start="0.22" data-duration="1.3" />
<div id="cap-2" class="clip caption" data-start="1.5" data-duration="1">What&#39;s it</div>
<svg id="arrow-1" class="clip arrow" data-start="0.4" data-duration="1"></svg>
<div id="channel-badge" class="clip" data-start="0" data-duration="31.4"></div>
<audio id="voice-1" src="assets/voice/script.mp3" data-start="0.1" data-media-start="0.04" data-duration="5" data-volume="1"></audio>
<audio id="sfx-3-question-l1" src="general/sfx/x.mp3" data-start="2" data-duration="0.5" data-volume="0.16"></audio>
<audio id="sfx-4-pop" src="general/sfx/pop.mp3" data-start="2.1" data-duration="0.4" data-volume="0.4"></audio>
<img id="media-1" class="clip" src="assets/media/logo.png" data-start="3" data-duration="2" />
</div>`

const p = parseComposition(html)
assert.equal(p.duration, 31.4)
assert.equal(p.background, 'bg3.jpg')
const by = (id: string) => p.clips.find((c) => c.id === id)!
assert.equal(by('card-revenue').label, 'Revenue')
assert.equal(by('cap-1').label, 'This is revenue.')
assert.equal(by('cap-1').line, 0)
assert.equal(by('cap-2').label, "What's it")
assert.equal(by('react-1').label, 'point-up-left')
assert.equal(by('react-1').src, 'general/my different reactions/point-up-left.png')
assert.equal(by('arrow-1').track, 'fx')
assert.equal(by('voice-1').mediaStart, 0.04)
assert.equal(by('sfx-3-question-l1').label, 'question layer')
assert.equal(by('sfx-4-pop').label, 'pop')
assert.equal(by('media-1').track, 'media')
assert.ok(!p.clips.some((c) => c.id === 'channel-badge'))
console.log('timeline.test ✓', p.clips.length, 'clips')

/**
 * Injected into hyperframes/<p>/index.html when the app previews it.
 * The renderer posts {type:'vfx:seek', t}; the bridge shows the clips alive at t and seeks the GSAP timeline,
 * the same way the HyperFrames renderer does per frame. Audio stays silent here (the app plays it).
 */
export const PREVIEW_BRIDGE = `
(function () {
  var root = document.querySelector('[data-composition-id]');
  var clips = Array.prototype.slice.call(document.querySelectorAll('[data-start]')).filter(function (e) {
    return e !== root && e.tagName !== 'AUDIO';
  });
  document.querySelectorAll('audio,video').forEach(function (m) { m.muted = true; m.pause(); });
  document.documentElement.style.overflow = 'hidden';
  function seek(t) {
    clips.forEach(function (e) {
      var s = parseFloat(e.getAttribute('data-start')) || 0;
      var d = parseFloat(e.getAttribute('data-duration'));
      var on = t >= s && (isNaN(d) || t < s + d);
      e.style.visibility = on ? '' : 'hidden';
      if (e.tagName === 'VIDEO' && on) { try { e.currentTime = Math.max(0, t - s); } catch (_) {} }
    });
    var tl = window.__timelines && window.__timelines.main;
    if (tl) tl.seek(t, false);
  }
  window.addEventListener('message', function (ev) {
    var d = ev.data || {};
    if (d.type === 'vfx:seek') seek(+d.t || 0);
  });
  function ready() {
    seek(0);
    parent.postMessage({ type: 'vfx:ready', duration: parseFloat(root && root.getAttribute('data-duration')) || 0 }, '*');
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready); else ready();
})();
`

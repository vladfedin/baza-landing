/*
  A horizontal row of cards ([data-ribbon]): swiped on touch, scrolled by the
  arrows with a mouse. An arrow shows only while there is somewhere to go in
  its direction; a press moves about one view, snapping to a card.
*/
(function () {
  'use strict';
  var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wire(root) {
    var track = root.querySelector('[data-ribbon-track]');
    var prev = root.querySelector('[data-ribbon-prev]');
    var next = root.querySelector('[data-ribbon-next]');
    if (!track || !prev || !next) return;
    var queued = false;
    function sync() {
      queued = false;
      var max = track.scrollWidth - track.clientWidth;
      prev.hidden = track.scrollLeft <= 2;
      next.hidden = track.scrollLeft >= max - 2;
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
    function step(dir) {
      track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: smooth ? 'smooth' : 'auto' });
    }
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    track.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    sync();
  }
  function init() { document.querySelectorAll('[data-ribbon]').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

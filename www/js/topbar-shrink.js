/*
  The top bar grows lower as the page scrolls: over the first SPAN px its
  height eases from full to compact, following the scroll (back up — back to
  full). The bar reads one number, --bar-k (0 full … 1 compact), set here once
  per frame at most.
*/
(function () {
  'use strict';
  var SPAN = 160;

  function wire() {
    var shell = document.querySelector('.topbar-shell');
    if (!shell) return;
    var queued = false;
    var last = -1;
    function apply() {
      queued = false;
      var k = Math.min(Math.max(window.scrollY / SPAN, 0), 1);
      k = k * k * (3 - 2 * k);                       // smoothstep: no jolt at either end
      if (Math.abs(k - last) < 0.001) return;
      last = k;
      shell.style.setProperty('--bar-k', k.toFixed(3));
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

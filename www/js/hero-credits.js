/*
  Credits over the hero clip: while a frame from a published table is on
  screen, a plaque at the hero's bottom-left names the table and its author
  and links to it in the Сокровищница. The schedule sits in the markup —
  <li data-from data-to>, seconds of the clip — next to the clip it describes.
  No clip playing (reduced motion, no codec) — no plaque.
*/
(function () {
  'use strict';
  function wire() {
    var v = document.querySelector('.hero-video');
    var items = [].slice.call(document.querySelectorAll('.hero-credits [data-from]'));
    if (!v || !items.length) return;
    var current = null;
    function show(li) {
      if (li === current) return;
      if (current) { current.classList.remove('is-on'); current.setAttribute('inert', ''); }
      current = li;
      if (li) { li.removeAttribute('inert'); li.classList.add('is-on'); }
    }
    items.forEach(function (li) { li.setAttribute('inert', ''); });
    function sync() {
      var t = v.currentTime, hit = null;
      for (var i = 0; i < items.length; i++) {
        var li = items[i];
        if (t >= +li.getAttribute('data-from') && t < +li.getAttribute('data-to')) { hit = li; break; }
      }
      show(hit);
    }
    v.addEventListener('timeupdate', sync);
    v.addEventListener('seeked', sync);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

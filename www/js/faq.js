/*
  FAQ (details.faq-item): an answer slides open and shut softly instead of
  jumping — the height eases over OPEN_MS while the text fades in. The native
  <details> stays the source of truth (keyboard, find-in-page, no-JS);
  reduced motion keeps the instant toggle.
*/
(function () {
  'use strict';
  var OPEN_MS = 460, EASE = 'cubic-bezier(0.33, 0, 0.2, 1)';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function wire(item) {
    var summary = item.querySelector('summary');
    var body = item.querySelector('.faq-answer');
    if (!summary || !body || !body.animate) return;
    var anim = null;
    function run(from, to, done) {
      if (anim) anim.cancel();
      body.style.overflow = 'hidden';
      anim = body.animate([{ height: from + 'px', opacity: to ? 0 : 1 }, { height: to + 'px', opacity: to ? 1 : 0 }],
        { duration: OPEN_MS, easing: EASE });
      anim.onfinish = function () { anim = null; body.style.overflow = ''; if (done) done(); };
    }
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (!item.open) {
        item.open = true;
        run(0, body.scrollHeight);
      } else {
        item.classList.add('is-closing');
        run(body.offsetHeight, 0, function () { item.open = false; item.classList.remove('is-closing'); });
      }
    });
  }
  function init() { document.querySelectorAll('details.faq-item').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
  «Что такое…?» under the hero headline: a question button opens its answer
  (aria-controls), one at a time; a second press, a click elsewhere or Esc
  closes it. The answer fades in and out over 160 ms.
*/
(function () {
  'use strict';
  var FADE_MS = 160;

  function wire() {
    var asks = [].slice.call(document.querySelectorAll('.ask[aria-controls]'));
    if (!asks.length) return;

    function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
    function hide(btn) {
      var p = panelOf(btn);
      if (!p || p.hidden) return;
      btn.setAttribute('aria-expanded', 'false');
      p.classList.remove('is-open');
      setTimeout(function () { if (!p.classList.contains('is-open')) p.hidden = true; }, FADE_MS);
    }
    function show(btn) {
      asks.forEach(function (b) { if (b !== btn) hide(b); });
      var p = panelOf(btn);
      if (!p) return;
      btn.setAttribute('aria-expanded', 'true');
      p.hidden = false;
      requestAnimationFrame(function () { p.classList.add('is-open'); });
    }

    asks.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-expanded') === 'true') hide(btn); else show(btn);
      });
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.asks')) return;
      asks.forEach(hide);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') asks.forEach(hide);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

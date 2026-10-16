/*
  A deck: a row of cards shown a page at a time ([data-deck]).
  ---------------------------------------------------------------------------
      <div data-deck>
        <div class="deck-view"><div class="deck-row" data-deck-row>…cards…</div></div>
        <div class="deck-bar">
          <button data-deck-prev>  <div data-deck-dots></div>  <button data-deck-next>
        </div>
      </div>

  The row's --deck-per (CSS) says how many cards a page holds; 0 or none turns
  the deck off at that width — the row keeps its own layout, every card is
  live, the bar hides. On, the arrows, a sideways swipe or the mouse wheel
  over the deck slide the row by one card, unhurried, so the eye follows what
  comes in; it runs first to last and at either end the wheel scrolls the page
  again. A press during a slide retargets it at once; the wheel waits for it. Dots mark which cards are out; cards off view are inert. Cards may
  arrive later (js/live.js fills a row from the API) — the deck picks them up.

  Before a slide the deck fires "deck:move" on itself; a card that holds the
  wheel for itself (a turned review reading its text) carries
  data-deck-keep-wheel and the wheel over it is left alone.
*/
(function () {
  'use strict';
  var SLIDE_MS = 820;   // the row's slide (css .deck-row): slow enough for the eye to follow

  function wire(deck) {
    var row = deck.querySelector('[data-deck-row]');
    var prev = deck.querySelector('[data-deck-prev]');
    var next = deck.querySelector('[data-deck-next]');
    var dotsBox = deck.querySelector('[data-deck-dots]');
    var bar = prev && prev.parentElement;
    if (!row || !prev || !next || !dotsBox) return;
    var cards = [], dots = [], start = 0, busy = false;

    function collect() {
      cards = [].slice.call(row.children);
      dotsBox.textContent = '';
      dots = cards.map(function () { var d = document.createElement('span'); dotsBox.appendChild(d); return d; });
    }
    function perPage() {
      var k = parseInt(getComputedStyle(row).getPropertyValue('--deck-per'), 10);
      return k > 0 ? Math.min(k, cards.length) : 0;
    }
    function lastStart() { return Math.max(0, cards.length - perPage()); }
    function canTurn(dir) { return perPage() > 0 && (dir > 0 ? start < lastStart() : start > 0); }
    function place() {
      var k = perPage();
      if (!k) {                                   // off at this width
        row.style.transform = '';
        cards.forEach(function (c) { c.inert = false; });
        if (bar) bar.hidden = true;
        return;
      }
      start = Math.max(0, Math.min(start, lastStart()));
      row.style.transform = cards[start] ? 'translateX(' + (-cards[start].offsetLeft) + 'px)' : '';
      cards.forEach(function (c, i) {
        var on = i >= start && i < start + k;
        c.inert = !on;
        dots[i].classList.toggle('is-on', on);
      });
      if (bar) bar.hidden = cards.length <= k;
      prev.disabled = !canTurn(-1);
      next.disabled = !canTurn(1);
    }
    var busyTimer = null;
    function step(dir) {
      if (!canTurn(dir)) return;
      deck.dispatchEvent(new CustomEvent('deck:move'));
      start = Math.max(0, Math.min(start + dir, lastStart()));
      busy = true;
      place();
      clearTimeout(busyTimer);
      busyTimer = setTimeout(function () { busy = false; }, SLIDE_MS);
    }
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });

    // the wheel slides card by card; past either end it is the page's again.
    // A slide swallows the wheel's tail until it ends, so a trackpad's inertia
    // neither slides on nor scrolls away.
    var acc = 0, quietUntil = 0;
    deck.addEventListener('wheel', function (e) {
      if (!perPage()) return;
      if (e.target.closest && e.target.closest('[data-deck-keep-wheel]')) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      if (e.deltaMode === 1) d *= 16;
      var dir = d > 0 ? 1 : -1, now = performance.now();
      if (!busy && now >= quietUntil && !canTurn(dir)) { acc = 0; return; }
      e.preventDefault();
      if (busy || now < quietUntil) return;
      acc += d;
      if (Math.abs(acc) >= 40) { acc = 0; step(dir); quietUntil = now + SLIDE_MS; }
    }, { passive: false });

    // a sideways swipe on a touch screen slides it too
    var sx = null, sy = 0;
    row.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { sx = e.clientX; sy = e.clientY; } });
    row.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    });
    row.addEventListener('pointercancel', function () { sx = null; });

    function settle() {                          // a new width is not a slide
      row.style.transition = 'none';
      place();
      void row.offsetWidth;
      row.style.transition = '';
    }
    var queued = false;
    window.addEventListener('resize', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; settle(); });
    });
    new MutationObserver(function () { collect(); settle(); }).observe(row, { childList: true });
    collect();
    place();
  }
  function init() { document.querySelectorAll('[data-deck]').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

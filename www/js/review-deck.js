/*
  The masters' reviews as a deck of cards ([data-deck]).
  ---------------------------------------------------------------------------
  A page of cards is on view — as many as the row has columns (3, 2 on a
  tablet, 1 on a phone; read back from the CSS grid). The arrows, a swipe or
  the mouse wheel over the deck turn the page: the cards on view fold away
  edge-on, the next ones unfold in their place one after another. The deck
  runs from the first review to the last (the last page is filled from the
  end); at either end the wheel scrolls the page again. Dots under it mark
  which cards are out.

  A card shows its brightest lines; a click on it (or «Читать полностью»)
  turns it over to the whole text, «Свернуть» or Esc turns it back. The face
  turned away is inert, so the keyboard never lands on what is not seen.
*/
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HALF = 200, STAGGER = 70, PERSPECTIVE = 'perspective(1400px) ';

  function wireCard(card) {
    var front = card.querySelector('.review-card__front');
    var back = card.querySelector('.review-card__back');
    var open = front.querySelector('.review-card__turn');
    var close = back.querySelector('.review-card__turn');
    back.inert = true;
    function turn(on) {
      card.classList.toggle('is-turned', on);
      front.inert = on; back.inert = !on;
      open.setAttribute('aria-expanded', String(on));
      (on ? close : open).focus({ preventScroll: true });
    }
    front.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) return;   // the profile link
      turn(true);
    });
    close.addEventListener('click', function () { turn(false); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && card.classList.contains('is-turned')) turn(false);
    });
    return function reset() { if (card.classList.contains('is-turned')) { card.classList.remove('is-turned'); front.inert = false; back.inert = true; open.setAttribute('aria-expanded', 'false'); } };
  }

  function wire(deck) {
    var row = deck.querySelector('[data-deck-row]');
    var prev = deck.querySelector('[data-deck-prev]');
    var next = deck.querySelector('[data-deck-next]');
    var dotsBox = deck.querySelector('[data-deck-dots]');
    var cards = [].slice.call(row.querySelectorAll('.review-card'));
    var resets = cards.map(wireCard);
    var n = cards.length, start = 0, busy = false;
    var dots = cards.map(function () { var d = document.createElement('span'); dotsBox.appendChild(d); return d; });

    function perPage() {
      var cols = getComputedStyle(row).gridTemplateColumns.split(' ').filter(Boolean).length;
      return Math.max(1, Math.min(cols, n));
    }
    function lastStart() { return n - perPage(); }
    function visible() {
      var out = [];
      for (var i = 0; i < perPage(); i++) out.push(cards[start + i]);
      return out;
    }
    function canTurn(dir) { return dir > 0 ? start < lastStart() : start > 0; }
    function layout() {
      start = Math.max(0, Math.min(start, lastStart()));   // a wider row shows more
      var vis = visible();
      cards.forEach(function (c, i) {
        var at = vis.indexOf(c);
        c.hidden = at < 0;
        c.style.order = at < 0 ? '' : String(at);
        dots[i].classList.toggle('is-on', at >= 0);
      });
      var all = n <= perPage();
      prev.hidden = next.hidden = all;
      dotsBox.hidden = all;
      prev.disabled = !canTurn(-1);
      next.disabled = !canTurn(1);
    }
    function fold(list, from, to, ease) {
      return Promise.all(list.map(function (c, i) {
        return c.animate([
          { transform: PERSPECTIVE + 'rotateY(' + from + 'deg)', opacity: from ? 0.3 : 1 },
          { transform: PERSPECTIVE + 'rotateY(' + to + 'deg)', opacity: to ? 0.3 : 1 }
        ], { duration: HALF, delay: i * STAGGER, easing: ease, fill: 'both' }).finished;
      }));
    }
    function turnPage(dir) {
      var k = perPage();
      if (busy || !canTurn(dir)) return;
      var out = visible();
      out.forEach(function (c) { resets[cards.indexOf(c)](); });
      start = Math.max(0, Math.min(start + dir * k, lastStart()));
      if (reduce) { layout(); return; }
      busy = true;
      fold(out, 0, dir > 0 ? -90 : 90, 'ease-in').then(function () {
        out.forEach(function (c) { c.getAnimations().forEach(function (a) { a.cancel(); }); });
        layout();
        var inn = visible();
        return fold(inn, dir > 0 ? 90 : -90, 0, 'ease-out').then(function () {
          inn.forEach(function (c) { c.getAnimations().forEach(function (a) { a.cancel(); }); });
        });
      }).then(function () { busy = false; }, function () { busy = false; });
    }
    prev.addEventListener('click', function () { turnPage(-1); });
    next.addEventListener('click', function () { turnPage(1); });

    // the wheel over the deck turns its pages; past either end it is the
    // page's again. A turn swallows the wheel's tail for a moment, so a
    // trackpad's inertia neither turns two pages nor scrolls away.
    var acc = 0, quietUntil = 0;
    deck.addEventListener('wheel', function (e) {
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      if (e.deltaMode === 1) d *= 16;
      var dir = d > 0 ? 1 : -1, now = performance.now();
      if (!busy && now >= quietUntil && !canTurn(dir)) { acc = 0; return; }
      e.preventDefault();
      if (busy || now < quietUntil) return;
      acc += d;
      if (Math.abs(acc) >= 40) { acc = 0; turnPage(dir); quietUntil = now + 450; }
    }, { passive: false });

    // a sideways swipe on a touch screen turns the page too
    var sx = null, sy = 0;
    row.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { sx = e.clientX; sy = e.clientY; } });
    row.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) turnPage(dx < 0 ? 1 : -1);
    });
    row.addEventListener('pointercancel', function () { sx = null; });

    var queued = false;
    window.addEventListener('resize', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; if (!busy) layout(); });
    });
    layout();
  }
  function init() { document.querySelectorAll('[data-deck]').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

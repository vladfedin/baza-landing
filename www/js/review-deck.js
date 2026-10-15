/*
  The masters' reviews as a deck of cards ([data-deck]).
  ---------------------------------------------------------------------------
  A page of cards is on view — as many as the row's --deck-per says (3, 2 on a
  tablet, 1 on a phone). The arrows, a swipe or the mouse wheel over the deck
  slide the row: the cards on view move off to the left and the next ones come
  in from the right (and back). The deck runs from the first review to the
  last — the last page is filled from the end — and at either end the wheel
  scrolls the page again. Dots under it mark which cards are out. Cards off
  view are inert.

  A card shows its brightest lines; a click on it (or «Читать полностью»)
  turns it over to the whole text, «Свернуть» or Esc turns it back — turning
  over means only that. Over a turned card the wheel reads its text, it does
  not slide the deck. The face turned away is inert.
*/
(function () {
  'use strict';
  var SLIDE_MS = 520;

  function wireCard(card) {
    var front = card.querySelector('.review-card__front');
    var back = card.querySelector('.review-card__back');
    var open = front.querySelector('.review-card__turn');
    var close = back.querySelector('.review-card__turn');
    back.inert = true;
    function set(on, focus) {
      card.classList.toggle('is-turned', on);
      front.inert = on; back.inert = !on;
      open.setAttribute('aria-expanded', String(on));
      if (focus) (on ? close : open).focus({ preventScroll: true });
    }
    front.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) return;   // the profile link
      set(true, true);
    });
    close.addEventListener('click', function () { set(false, true); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && card.classList.contains('is-turned')) set(false, true);
    });
    return function reset() { if (card.classList.contains('is-turned')) set(false, false); };
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
      var k = parseInt(getComputedStyle(row).getPropertyValue('--deck-per'), 10);
      return Math.max(1, Math.min(k || 1, n));
    }
    function lastStart() { return n - perPage(); }
    function canTurn(dir) { return dir > 0 ? start < lastStart() : start > 0; }
    function place() {
      start = Math.max(0, Math.min(start, lastStart()));   // a wider row shows more
      row.style.transform = 'translateX(' + (-cards[start].offsetLeft) + 'px)';
      var k = perPage();
      cards.forEach(function (c, i) {
        var on = i >= start && i < start + k;
        c.inert = !on;
        dots[i].classList.toggle('is-on', on);
      });
      var all = n <= k;
      prev.hidden = next.hidden = dotsBox.hidden = all;
      prev.disabled = !canTurn(-1);
      next.disabled = !canTurn(1);
    }
    function turnPage(dir) {
      if (busy || !canTurn(dir)) return;
      cards.forEach(function (c, i) { resets[i](); });
      start = Math.max(0, Math.min(start + dir * perPage(), lastStart()));
      busy = true;
      place();
      setTimeout(function () { busy = false; }, SLIDE_MS);
    }
    prev.addEventListener('click', function () { turnPage(-1); });
    next.addEventListener('click', function () { turnPage(1); });

    // the wheel over the deck slides its pages; past either end it is the
    // page's again. A slide swallows the wheel's tail for a moment, so a
    // trackpad's inertia neither slides two pages nor scrolls away. Over a
    // turned card the wheel is the card's: it reads the text.
    var acc = 0, quietUntil = 0;
    deck.addEventListener('wheel', function (e) {
      if (e.target.closest && e.target.closest('.review-card.is-turned')) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      if (e.deltaMode === 1) d *= 16;
      var dir = d > 0 ? 1 : -1, now = performance.now();
      if (!busy && now >= quietUntil && !canTurn(dir)) { acc = 0; return; }
      e.preventDefault();
      if (busy || now < quietUntil) return;
      acc += d;
      if (Math.abs(acc) >= 40) { acc = 0; turnPage(dir); quietUntil = now + SLIDE_MS; }
    }, { passive: false });

    // a sideways swipe on a touch screen slides it too
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
      requestAnimationFrame(function () {
        queued = false;
        row.style.transition = 'none';         // a new width is not a slide
        place();
        void row.offsetWidth;
        row.style.transition = '';
      });
    });
    place();
  }
  function init() { document.querySelectorAll('[data-deck]').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
  A review card (.review-card) shows its brightest lines; a click on it (or
  «Читать полностью») turns it over to the whole text, «Свернуть» or Esc
  turns it back — turning over means only that. A turned card keeps the
  wheel for its text (data-deck-keep-wheel, js/deck.js); when the deck
  slides, turned cards turn back. The face turned away is inert.
*/
(function () {
  'use strict';
  function wire(card) {
    var front = card.querySelector('.review-card__front');
    var back = card.querySelector('.review-card__back');
    if (!front || !back) return;
    var open = front.querySelector('.review-card__turn');
    var close = back.querySelector('.review-card__turn');
    back.inert = true;
    function set(on, focus) {
      card.classList.toggle('is-turned', on);
      card.toggleAttribute('data-deck-keep-wheel', on);
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
    var deck = card.closest('[data-deck]');
    if (deck) deck.addEventListener('deck:move', function () { if (card.classList.contains('is-turned')) set(false, false); });
  }
  function init() { document.querySelectorAll('.review-card').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

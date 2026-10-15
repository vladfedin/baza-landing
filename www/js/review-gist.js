/*
  Reviews show their brightest lines; the whole text opens on hover (with a
  mouse) and on a click or the «Полностью» button, which pins it open — a
  second click folds it back, even under the pointer. Screen readers get the
  whole text: the gist is aria-hidden.
*/
(function () {
  'use strict';
  var canHover = window.matchMedia('(hover: hover)').matches;

  function wire(card) {
    var said = card.querySelector('.user-plaque__said');
    var btn = card.querySelector('.user-plaque__more');
    if (!said || !btn) return;
    function isOpen() {
      return card.classList.contains('is-open') ||
        (canHover && card.matches(':hover') && !card.classList.contains('is-shut'));
    }
    function sync() {
      var open = isOpen();
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Свернуть' : 'Полностью';
    }
    said.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) return;
      if (isOpen()) { card.classList.remove('is-open'); card.classList.add('is-shut'); }
      else { card.classList.add('is-open'); card.classList.remove('is-shut'); }
      sync();
    });
    card.addEventListener('mouseenter', sync);
    card.addEventListener('mouseleave', function () { card.classList.remove('is-shut'); sync(); });
  }
  function init() { document.querySelectorAll('.reviews-row .user-plaque').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

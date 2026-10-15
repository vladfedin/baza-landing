/*
  Roll card — the landing's die answers like the table does.
  ---------------------------------------------------------------------------
  When the visitor throws the d20 and it comes to rest, js/dice.js fires
  `rb:roll` with the face it reads. Here that becomes a card shaped like the
  roll card in the table's chat (client/src/components/RollCard.tsx): a quiet
  header, the total large in the middle, the dice line under it; a natural 20
  is a critical success in red, a natural 1 a muted critical failure.

  Cards stack at the bottom right, newest at the bottom, and fade out on their
  own; at most three stay. The feed is aria-live so the result is also read out.
*/
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var feed = document.getElementById('roll-feed');
  if (!feed) return;

  var SHOW_MS = 5200, MAX = 3, FADE_MS = 200;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function dismiss(card) {
    if (!card.parentNode) return;
    card.classList.remove('is-visible');
    setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, FADE_MS);
  }

  window.addEventListener('rb:roll', function (e) {
    var d = e.detail || {};
    var value = d.value, sides = d.sides || 20;
    if (typeof value !== 'number') return;
    var style = value === sides ? 'critical' : value === 1 ? 'fumble' : 'normal';

    var card = el('div', 'roll-card roll-card--' + style);
    card.appendChild(el('div', 'roll-card__head', 'Гость бросает d' + sides));
    card.appendChild(el('div', 'roll-card__total', String(value)));
    var note = style === 'critical' ? 'Критический успех'
             : style === 'fumble'   ? 'Критический провал'
             : '1d' + sides + ' (' + value + ')';
    card.appendChild(el('div', 'roll-card__line', note));

    feed.appendChild(card);
    while (feed.children.length > MAX) feed.removeChild(feed.firstChild);
    requestAnimationFrame(function () { card.classList.add('is-visible'); });
    setTimeout(function () { dismiss(card); }, SHOW_MS);
    card.addEventListener('click', function () { dismiss(card); });
  });
});

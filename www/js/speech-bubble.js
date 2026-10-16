/*
  Character speech bubbles.
  --------------------------------------------------------------------------
  A .speaker carries its lines in a hidden list:

      <div class="speaker">
        <ul class="speaker__lines" hidden>
          <li>…</li>                              common
          <li data-rarity="rare">…</li>           rare
          <li data-rarity="legendary">…</li>      the rarest
        </ul>
        …
      </div>

  Each time the character scrolls into view, a bubble pops in over its head
  with one line, drawn by weight (common 10, rare 3, legendary 1 — the rarest
  shows about once in fifty-five) and never the same line twice in a row. A
  rare line's bubble is rimmed in the rare mark's blue, the rarest in its
  orange. The bubble's place and look live in css/styles.css (.speech-bubble);
  under prefers-reduced-motion it shows without the pop.
*/
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var WEIGHT = { common: 10, rare: 3, legendary: 1 };
  var speakers = [].slice.call(document.querySelectorAll('.speaker'));
  if (!speakers.length) return;

  function linesOf(el) {
    return [].slice.call(el.querySelectorAll('.speaker__lines li')).map(function (li) {
      return { text: li.textContent.trim(), rarity: li.getAttribute('data-rarity') || 'common' };
    }).filter(function (l) { return l.text; });
  }
  function pick(lines, last) {
    var pool = lines.length > 1 ? lines.filter(function (l) { return l !== last; }) : lines;
    var total = pool.reduce(function (s, l) { return s + (WEIGHT[l.rarity] || 1); }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= WEIGHT[pool[i].rarity] || 1;
      if (r < 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  var state = [];
  speakers.forEach(function (el) {
    var lines = linesOf(el);
    if (!lines.length) return;
    var bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    var body = document.createElement('div');
    body.className = 'speech-bubble__body';
    bubble.appendChild(body);
    el.appendChild(bubble);
    state.push({ el: el, lines: lines, bubble: bubble, body: body, last: null });
  });
  function say(s) {
    var line = pick(s.lines, s.last);
    s.last = line;
    s.body.textContent = line.text;
    s.bubble.classList.remove('speech-bubble--rare', 'speech-bubble--legendary');
    if (line.rarity !== 'common') s.bubble.classList.add('speech-bubble--' + line.rarity);
    s.bubble.classList.add('is-visible');
  }

  if (!('IntersectionObserver' in window)) { state.forEach(say); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var s = state.filter(function (x) { return x.el === e.target; })[0];
      if (!s) return;
      if (e.isIntersecting) say(s);
      else s.bubble.classList.remove('is-visible');
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -25% 0px' });
  state.forEach(function (s) { io.observe(s.el); });
});

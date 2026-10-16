/*
  Character speech bubbles.
  --------------------------------------------------------------------------
  A .speaker carries its lines in a hidden list:

      <div class="speaker">
        <ul class="speaker__lines" hidden>
          <li>…</li>                              common
          <li data-rarity="rare">…</li>           rare
          <li data-rarity="legendary">…</li>      the rarest
          <li data-rarity="angry">…</li>          when poked too much
        </ul>
        …
      </div>

  Each time the character scrolls into view, a bubble pops in over its head
  with one line, drawn by weight (common 10, rare 3, legendary 1 — the rarest
  shows about once in fifty-five) and never the same line twice in a row. A
  rare line's bubble is rimmed in the rare mark's blue, the rarest in its
  orange. The bubble's place and look live in css/styles.css (.speech-bubble);
  under prefers-reduced-motion it shows without the pop.

  A click on the figure pokes it: it flinches and says another line. Poked
  more than 6 times in one unbroken run (no pause over POKE_GAP) lasting over
  5 seconds, it snaps back with an angry line on a red bubble, and the count
  starts over.
*/
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var WEIGHT = { common: 10, rare: 3, legendary: 1 };
  var POKE_GAP = 1200, POKE_COUNT = 6, POKE_SPAN = 5000;
  var speakers = [].slice.call(document.querySelectorAll('.speaker'));
  if (!speakers.length) return;

  function linesOf(el) {
    return [].slice.call(el.querySelectorAll('.speaker__lines li')).map(function (li) {
      return { text: li.textContent.trim(), rarity: li.getAttribute('data-rarity') || 'common' };
    }).filter(function (l) { return l.text; });
  }
  function pick(lines, last) {
    var pool = lines.length > 1 ? lines.filter(function (l) { return l !== last; }) : lines;
    if (!pool.length) return last;
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
    var all = linesOf(el);
    var lines = all.filter(function (l) { return l.rarity !== 'angry'; });
    var angry = all.filter(function (l) { return l.rarity === 'angry'; });
    if (!lines.length) return;
    var bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    var body = document.createElement('div');
    body.className = 'speech-bubble__body';
    bubble.appendChild(body);
    el.appendChild(bubble);
    var s = { el: el, lines: lines, angry: angry, bubble: bubble, body: body, last: null,
              runStart: 0, lastPoke: 0, pokes: 0 };
    state.push(s);
    var figure = el.querySelector('img');
    if (figure) figure.addEventListener('click', function () { poke(s, figure); });
  });
  function show(s, line) {
    s.last = line;
    s.body.textContent = line.text;
    s.bubble.classList.remove('speech-bubble--rare', 'speech-bubble--legendary', 'speech-bubble--angry', 'is-visible');
    if (line.rarity !== 'common') s.bubble.classList.add('speech-bubble--' + line.rarity);
    void s.bubble.offsetWidth;                    // replay the pop
    s.bubble.classList.add('is-visible');
  }
  function say(s) { show(s, pick(s.lines, s.last)); }
  function poke(s, figure) {
    var now = performance.now();
    if (now - s.lastPoke > POKE_GAP) { s.runStart = now; s.pokes = 0; }
    s.lastPoke = now;
    s.pokes++;
    figure.classList.remove('is-poked');
    void figure.offsetWidth;
    figure.classList.add('is-poked');
    if (s.angry.length && s.pokes > POKE_COUNT && now - s.runStart > POKE_SPAN) {
      show(s, pick(s.angry, s.last));
      s.pokes = 0; s.runStart = now;
    } else {
      say(s);
    }
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

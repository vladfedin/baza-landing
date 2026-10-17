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
  shows about once in fifty-five) and never the same line twice in a row; a new
  line takes the place of the last one with the old bubble fading out first. A
  rare line's bubble is rimmed in the rare mark's blue, the rarest in its
  orange. The bubble's place and look live in css/styles.css (.speech-bubble);
  under prefers-reduced-motion it shows without the pop.

  A click on the figure pokes it: it flinches and says another line. So does
  rubbing it — every turn of the pointer back and forth over the figure (a
  swing of RUB_SWING px or more) counts as a poke, from the second turn on:
  the first may be just the pointer turning to leave. The pointer coming onto
  the figure makes it say a line too (not a poke; at most once in HOVER_GAP);
  leaving it says nothing. Poked more than 6 times in
  one unbroken run (no pause over POKE_GAP), it gets angry: from then on every
  line is an angry one on a red bubble, also when it scrolls back into view,
  until it is left alone for CALM_MS: then the red bubble melts away and the
  speaker hears `rb:calmed`.

  How long it takes to anger is the speaker's data-temper: stage lengths in
  pokes, each a number or a range ("1-2 1-3 2-3" — drawn anew for every run of
  pokes); it gets angry after the last stage. Without data-temper — after
  POKE_COUNT pokes.

  Every line said is told to the speaker as an `rb:said` event — { rarity,
  angry, poked, pokes, stage } (stage: which data-temper stage the run is in;
  the count of stages while angry) — for js/emotions.js, which changes the
  figure's face.
*/
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var WEIGHT = { common: 10, rare: 3, legendary: 1 };
  var POKE_GAP = 1200, POKE_COUNT = 6, CALM_MS = 5000, RUB_SWING = 24, HOVER_GAP = 1500;
  // the old line fades out before the new one pops in (the CSS transition's length)
  var SWAP_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
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

  /** Stage ends of a run of pokes, drawn from the speaker's data-temper. */
  function drawTemper(el) {
    var spec = (el.getAttribute('data-temper') || '').trim();
    var lengths = spec ? spec.split(/\s+/).map(function (r) {
      var b = r.split('-').map(Number), lo = b[0], hi = b.length > 1 ? b[1] : b[0];
      return lo + Math.floor(Math.random() * (hi - lo + 1));
    }) : [POKE_COUNT];
    var sum = 0;
    return lengths.map(function (n) { return (sum += n); });
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
              lastPoke: 0, pokes: 0, angryUntil: 0, ends: drawTemper(el) };
    state.push(s);
    var figure = el.querySelector('img');
    if (!figure) return;
    figure.addEventListener('click', function () { poke(s, figure); });
    // Hover: a line when the pointer comes on (not when it leaves).
    var lastHover = -Infinity;
    figure.addEventListener('pointerenter', function () {
      var now = performance.now();
      if (now - lastHover < HOVER_GAP || now - s.lastPoke < HOVER_GAP) return;
      lastHover = now;
      say(s);
    });
    // Rubbing: a poke on every turn of the pointer's horizontal travel, from
    // the second turn while over the figure.
    var rub = { x: null, dir: 0, from: 0, turns: 0 };
    figure.addEventListener('pointermove', function (e) {
      if (rub.x === null) { rub.x = rub.from = e.clientX; return; }
      var dx = e.clientX - rub.x;
      rub.x = e.clientX;
      if (!dx) return;
      var dir = dx > 0 ? 1 : -1;
      if (dir !== rub.dir) {
        if (rub.dir && Math.abs(e.clientX - rub.from) >= RUB_SWING && ++rub.turns >= 2) poke(s, figure);
        rub.dir = dir;
        rub.from = e.clientX - dx;
      }
    });
    figure.addEventListener('pointerleave', function () { rub.x = null; rub.dir = 0; rub.turns = 0; });
  });
  function put(s) {
    var line = s.next;
    s.body.textContent = line.text;
    s.bubble.classList.remove('speech-bubble--rare', 'speech-bubble--legendary', 'speech-bubble--angry');
    if (line.rarity !== 'common') s.bubble.classList.add('speech-bubble--' + line.rarity);
    void s.bubble.offsetWidth;                    // start the pop from the hidden state
    s.bubble.classList.add('is-visible');
  }
  function show(s, line) {
    s.last = line;
    s.next = line;
    if (s.swap) return;                           // a swap is under way: it takes the latest line
    if (!SWAP_MS || !s.bubble.classList.contains('is-visible')) { put(s); return; }
    s.bubble.classList.remove('is-visible');      // the old line fades out first
    s.swap = setTimeout(function () { s.swap = 0; put(s); }, SWAP_MS);
  }
  function calm(s) {
    if (s.bubble.classList.contains('speech-bubble--angry')) hide(s);
    s.el.dispatchEvent(new CustomEvent('rb:calmed'));
  }
  function hide(s) {
    clearTimeout(s.swap);
    s.swap = 0;
    s.bubble.classList.remove('is-visible');
  }
  function isAngry(s) { return s.angry.length > 0 && performance.now() < s.angryUntil; }
  function say(s, poked) {
    var angry = isAngry(s);
    var line = pick(angry ? s.angry : s.lines, s.last);
    show(s, line);
    var stage = 0;
    while (stage < s.ends.length && s.pokes > s.ends[stage]) stage++;
    s.el.dispatchEvent(new CustomEvent('rb:said', {
      detail: { rarity: line.rarity, angry: angry, poked: !!poked, pokes: s.pokes, stage: angry ? s.ends.length : stage }
    }));
  }
  function poke(s, figure) {
    var now = performance.now();
    if (now - s.lastPoke > POKE_GAP) { s.pokes = 0; s.ends = drawTemper(s.el); }
    s.lastPoke = now;
    s.pokes++;
    // Angry stays angry while it is still being poked; left alone, it calms:
    // the red bubble melts away, and the figure's face calms with it.
    if (isAngry(s) || s.pokes > s.ends[s.ends.length - 1]) {
      s.angryUntil = now + CALM_MS;
      clearTimeout(s.calmTimer);
      s.calmTimer = setTimeout(function () { calm(s); }, CALM_MS);
    }
    // the figure flinches with its face (js/emotions.js wraps them in one box)
    var flinch = figure.closest('.side-char__figure') || figure;
    flinch.classList.remove('is-poked');
    void flinch.offsetWidth;
    flinch.classList.add('is-poked');
    say(s, true);
  }

  if (!('IntersectionObserver' in window)) { state.forEach(say); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var s = state.filter(function (x) { return x.el === e.target; })[0];
      if (!s) return;
      if (e.isIntersecting) say(s);
      else hide(s);
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -25% 0px' });
  state.forEach(function (s) { io.observe(s.el); });
});

/*
  Character emotions: a figure's face follows how it is treated.
  --------------------------------------------------------------------------
  The faces are files on the figure's <img> (data-face-<name>, img/emotions/,
  made by tools/emotion-faces.mjs from the app's character art); what shows
  when is the figure's own:

    data-face-stages  faces for the stages of a run of pokes (js/speech-bubble
                      data-temper); «base» — the figure's own picture.
                      The people: "base joyful still", the chest: "sly angry"
    data-face-red     the face of the angry run (red lines); default «angry»
    data-face-hover   a face while the pointer is on the figure (the chest's
                      eyes in the gap); none — no change on hover
    data-face-ladder  the order it calms down in, a step at a time (the chest
                      closes again); none — straight back to its own picture

  The red face shows only with the red lines (the angry run of
  js/speech-bubble.js) and leaves exactly when they melt away (`rb:calmed`);
  every angry poke throws out a burst of red comic swearing — «!», «#», «@»…
  A run of pokes that stopped short of anger goes back to the figure's own
  picture after IDLE_MS. A line said on its own (the figure came into view)
  changes nothing: it only gets the faces loaded.

  A change never jumps: the figure and two face layers are stacked, the new
  face fades in on top while the old one fades out a little later, and a
  stronger mood gives a small bounce (css/styles.css .side-char__figure; no
  motion under prefers-reduced-motion).
*/
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var STEP_MS = 1600;          // one step down data-face-ladder when calming
  var IDLE_MS = 3200;          // a run of pokes that stopped short of anger fades back
  var GRAWLIX = ['!', '!!', '#', '@', '$', '%', '&', '*', '?!', '§'];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function words(v) { return (v || '').trim().split(/\s+/).filter(Boolean); }

  [].forEach.call(document.querySelectorAll('.speaker'), function (el) {
    var base = el.querySelector('img');
    var stages = base ? words(base.getAttribute('data-face-stages')) : [];
    if (!stages.length) return;
    var red = base.getAttribute('data-face-red') || 'angry';
    var hoverFace = base.getAttribute('data-face-hover');
    var ladder = words(base.getAttribute('data-face-ladder'));
    var src = {};
    stages.concat([red, hoverFace], ladder).forEach(function (k) {
      if (k && k !== 'base' && k !== 'calm') src[k] = base.getAttribute('data-face-' + k);
    });

    // The figure and two face layers in one box: a face lies exactly over the
    // figure, and the flinch (js/speech-bubble.js) moves them all.
    var wrap = document.createElement('span');
    wrap.className = 'side-char__figure';
    base.parentNode.insertBefore(wrap, base);
    wrap.appendChild(base);
    var faces = [0, 1].map(function () {
      var img = document.createElement('img');
      img.className = 'side-char__face';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      wrap.appendChild(img);
      return img;
    });
    base.classList.add('is-on');
    var shown = base;
    var z = 1;

    var ready = {};
    var asked = false;
    function preload() {
      if (asked) return;
      asked = true;
      Object.keys(src).forEach(function (k) {
        if (!src[k]) return;
        var img = new Image();
        img.src = src[k];
        (img.decode ? img.decode() : Promise.resolve())
          .then(function () { ready[k] = true; if (mood === k) paint(); })
          .catch(function () { /* that face stays away; the figure keeps its own */ });
      });
    }

    var mood = 'base';                           // 'base' — the figure's own picture
    var rank = 0;                                // how strong the mood is: for the bounce
    var angry = false;
    var hover = false;
    var timer = 0;

    function paint() {
      if (mood !== 'base' && !ready[mood]) return;   // still loading: keep what is on view
      var want = mood === 'base' ? null : src[mood];
      var next = !want ? base
        : faces.filter(function (f) { return f.getAttribute('src') === want; })[0]
          || faces.filter(function (f) { return f !== shown; })[0];
      if (next === shown) return;
      if (want && next.getAttribute('src') !== want) next.setAttribute('src', want);
      next.style.zIndex = String(++z);           // the new layer comes in on top
      next.classList.remove('is-off');
      next.classList.add('is-on');
      shown.classList.remove('is-on');
      shown.classList.add('is-off');
      shown = next;
    }
    function set(next, strength) {
      preload();
      if (next === 'calm') next = 'base';
      if (next !== 'base' && !src[next]) return;
      mood = next;
      paint();
      if (strength > rank && !reduced) {        // a stronger mood: a small jump
        wrap.classList.remove('is-rising');
        void wrap.offsetWidth;
        wrap.classList.add('is-rising');
      }
      rank = strength;
    }
    function restingFace() {
      if (hover && hoverFace) set(hoverFace, 1); else set('base', 0);
    }
    function idle() {
      clearTimeout(timer);
      timer = setTimeout(function () { if (!angry) restingFace(); }, IDLE_MS);
    }
    function calmDown() {
      clearTimeout(timer);
      if (!ladder.length) { restingFace(); return; }    // straight back to its own
      var i = ladder.indexOf(mood === 'base' ? 'calm' : mood);
      if (i < 0) i = ladder.length - 1;
      (function step() {
        do { i--; } while (i > 0 && ladder[i] !== 'calm' && !src[ladder[i]]);
        if (i <= 0 || ladder[i] === 'calm') { restingFace(); return; }
        if (hover && ladder[i] === hoverFace) { set(hoverFace, 1); return; }
        set(ladder[i], 0);
        timer = setTimeout(step, STEP_MS);
      })();
    }

    // Red comic swearing flying off over the head on an angry poke.
    function burst() {
      if (reduced) return;
      var box = document.createElement('span');
      box.className = 'grawlix';
      box.setAttribute('aria-hidden', 'true');
      for (var n = 0; n < 7; n++) {
        var g = document.createElement('span');
        g.textContent = GRAWLIX[Math.floor(Math.random() * GRAWLIX.length)];
        var a = (-150 + Math.random() * 120) * Math.PI / 180;   // a fan upward
        var d = 60 + Math.random() * 70;
        g.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
        g.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px');
        g.style.setProperty('--rot', Math.round(-40 + Math.random() * 80) + 'deg');
        g.style.animationDelay = Math.round(Math.random() * 120) + 'ms';
        box.appendChild(g);
      }
      wrap.appendChild(box);
      setTimeout(function () { box.remove(); }, 1300);
    }

    if (hoverFace) {
      base.addEventListener('pointerenter', function () {
        hover = true;
        if (mood === 'base') set(hoverFace, 1); else preload();
      });
      base.addEventListener('pointerleave', function () {
        hover = false;
        if (mood === hoverFace && !angry) idle();
      });
    }

    el.addEventListener('rb:said', function (e) {
      var d = e.detail || {};
      if (d.angry) {
        angry = true;
        clearTimeout(timer);
        set(red, stages.length + 2);
        burst();
        return;
      }
      if (!d.poked) { preload(); return; }       // came into view: get the faces ready
      var stage = Math.min(d.stage || 0, stages.length - 1);
      set(stages[stage], stage + 1);
      idle();
    });
    el.addEventListener('rb:calmed', function () {
      angry = false;
      calmDown();
    });
  });
});

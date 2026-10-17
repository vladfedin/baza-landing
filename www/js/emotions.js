/*
  Character emotions: a figure's face follows how it is treated.
  --------------------------------------------------------------------------
  A .speaker figure with data-face-curious / -angry / -attack (img/emotions/,
  made by tools/emotion-faces.mjs from the app's character art) changes face:

    the pointer comes near            → curious, and stays so while it is there
    a poke (click, rub)               → curious; from the fourth in a row — angry
    the angry run of js/speech-bubble → attack, for as long as it stays angry
    a rare line                       → curious; the rarest — attack
    left alone                        → it calms down a step at a time
                                        (attack → angry → curious → calm)

  js/speech-bubble.js tells what was said with an `rb:said` event on the
  speaker. The faces load only when the figure is seen or hovered; a face not
  loaded yet is skipped, never waited for. The face lies over the figure and
  crossfades in 160 ms (no fade under prefers-reduced-motion).
*/
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var LADDER = ['calm', 'curious', 'angry', 'attack'];
  var STEP_MS = 1600;          // one step down the ladder when left alone
  var ANGRY_HOLD_MS = 5000;    // = CALM_MS of js/speech-bubble.js

  [].forEach.call(document.querySelectorAll('.speaker'), function (el) {
    var base = el.querySelector('img');
    if (!base || !base.getAttribute('data-face-curious')) return;
    var src = {
      curious: base.getAttribute('data-face-curious'),
      angry: base.getAttribute('data-face-angry'),
      attack: base.getAttribute('data-face-attack')
    };

    // The figure and its face in one box: the face lies exactly over it, and
    // the flinch (js/speech-bubble.js) moves both.
    var wrap = document.createElement('span');
    wrap.className = 'side-char__figure';
    base.parentNode.insertBefore(wrap, base);
    wrap.appendChild(base);
    var face = document.createElement('img');
    face.className = 'side-char__face';
    face.alt = '';
    face.setAttribute('aria-hidden', 'true');
    wrap.appendChild(face);

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

    var mood = 'calm';
    var hover = false;
    var timer = 0;
    function paint() {
      var on = mood !== 'calm' && ready[mood];
      if (on && face.getAttribute('src') !== src[mood]) face.setAttribute('src', src[mood]);
      wrap.classList.toggle('has-face', !!on);
    }
    function settle(hold) {
      clearTimeout(timer);
      timer = setTimeout(function relax() {
        var i = LADDER.indexOf(mood);
        if (i <= 0 || (hover && mood === 'curious')) return;    // near the pointer it stays curious
        mood = LADDER[i - 1];
        paint();
        timer = setTimeout(relax, STEP_MS);
      }, hold);
    }
    function feel(next, hold) {
      preload();
      // a milder face does not interrupt a stronger one still being held
      if (LADDER.indexOf(next) < LADDER.indexOf(mood) && hold < ANGRY_HOLD_MS) { settle(STEP_MS); return; }
      mood = next;
      paint();
      settle(hold);
    }

    base.addEventListener('pointerenter', function () {
      hover = true;
      if (mood === 'calm') feel('curious', STEP_MS); else preload();
    });
    base.addEventListener('pointerleave', function () { hover = false; settle(STEP_MS); });

    el.addEventListener('rb:said', function (e) {
      var d = e.detail || {};
      if (d.angry) feel('attack', ANGRY_HOLD_MS);
      else if (d.poked) feel(d.pokes >= 4 ? 'angry' : 'curious', 2 * STEP_MS);
      else if (d.rarity === 'legendary') feel('attack', 2 * STEP_MS);
      else if (d.rarity === 'rare') feel('curious', 2 * STEP_MS);
      else preload();                  // came into view: get the faces ready
    });
  });
});

/*
  Character emotions: a figure's face follows how it is treated.
  --------------------------------------------------------------------------
  A .speaker figure with data-face-curious / -sly / -angry / -attack
  (img/emotions/, made by tools/emotion-faces.mjs from the app's character
  art) changes face along the ladder calm → curious → sly → angry → attack;
  a face the figure has not got is skipped (only the chest has «sly»):

    the pointer comes near            → curious, and stays so while it is there
    pokes (click, rub) 1–3 in a row   → sly (the chest's tongue; others: curious)
    pokes 4–6                         → angry (the chest opens its maw)
    the angry run of js/speech-bubble → attack (the chest stares at you),
                                        for as long as it stays angry
    a rare line                       → curious; the rarest — attack
    left alone                        → it calms down a step at a time
                                        (the chest ends closed again)

  js/speech-bubble.js tells what was said with an `rb:said` event on the
  speaker. The faces load only when the figure is seen or hovered; a face not
  loaded yet is skipped, never waited for. The face lies over the figure and
  crossfades in 160 ms (no fade under prefers-reduced-motion).
*/
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var LADDER = ['calm', 'curious', 'sly', 'angry', 'attack'];
  var POKES_PER_STEP = 3;
  var STEP_MS = 1600;          // one step down the ladder when left alone
  var ANGRY_HOLD_MS = 5000;    // = CALM_MS of js/speech-bubble.js

  [].forEach.call(document.querySelectorAll('.speaker'), function (el) {
    var base = el.querySelector('img');
    if (!base || !base.getAttribute('data-face-curious')) return;
    var src = {
      curious: base.getAttribute('data-face-curious'),
      sly: base.getAttribute('data-face-sly'),
      angry: base.getAttribute('data-face-angry'),
      attack: base.getAttribute('data-face-attack')
    };
    // the figure's own ladder: the faces it has
    var ladder = LADDER.filter(function (m) { return m === 'calm' || src[m]; });
    function own(m) {                            // a face it lacks → the next milder one it has
      for (var i = LADDER.indexOf(m); i > 0; i--) if (src[LADDER[i]]) return LADDER[i];
      return 'calm';
    }

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
        var i = ladder.indexOf(mood);
        if (i <= 0 || (hover && mood === 'curious')) return;    // near the pointer it stays curious
        mood = ladder[i - 1];
        paint();
        timer = setTimeout(relax, STEP_MS);
      }, hold);
    }
    function feel(next, hold) {
      preload();
      next = own(next);
      // a milder face does not interrupt a stronger one still being held
      if (ladder.indexOf(next) < ladder.indexOf(mood) && hold < ANGRY_HOLD_MS) { settle(STEP_MS); return; }
      mood = next;
      paint();
      settle(hold);
    }

    base.addEventListener('pointerenter', function () {
      hover = true;
      if (mood === 'calm') feel('curious', STEP_MS); else preload();
    });
    // leaving restarts the calm-down only where the pointer held it (curious);
    // a stronger face keeps its own hold
    base.addEventListener('pointerleave', function () { hover = false; if (mood === 'curious') settle(STEP_MS); });

    el.addEventListener('rb:said', function (e) {
      var d = e.detail || {};
      if (d.angry) feel('attack', ANGRY_HOLD_MS);
      else if (d.poked) feel(d.pokes > POKES_PER_STEP ? 'angry' : 'sly', 2 * STEP_MS);
      else if (d.rarity === 'legendary') feel('attack', 2 * STEP_MS);
      else if (d.rarity === 'rare') feel('curious', 2 * STEP_MS);
      else preload();                  // came into view: get the faces ready
    });
  });
});

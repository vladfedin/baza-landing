/*
  The stage: when the hero clip opens its curtain and the page is at the top,
  the hero gives the theatre room (.hero.is-stage, css «the stage»); a scroll
  down brings every block back to its reading form, a return to the top stages
  it again. Blocks move by FLIP: measured before and after the class flips,
  then animated back from the old place by transform only, so a move follows
  the scroll and reverses from mid-way. No clip (reduced motion, no codec) —
  no stage.
*/
(function () {
  'use strict';
  var ENTER_DELAY = 350;   // ms after the clip starts: the curtain is parting
  var DURATION = 700;
  var EASE = 'cubic-bezier(0.22, 0.8, 0.24, 1)';

  function wire() {
    var hero = document.querySelector('.hero');
    var video = document.querySelector('.hero-video');
    if (!hero || !video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // uniform: text and the cube keep their proportions; cards morph their box
    var parts = [];
    function add(sel, uniform) {
      document.querySelectorAll(sel).forEach(function (el) { parts.push({ el: el, uniform: uniform }); });
    }
    add('.hero-logo-wrap', true);
    add('.hero-inner h1', true);
    add('.hero .asks', true);
    add('.hero .adv-card', false);
    add('.hero-partners', true);

    var brandLogo = document.querySelector('.topbar .brand-logo');
    var bar = document.querySelector('.topbar-shell');
    function measureSlots() {
      if (brandLogo) {
        var r = brandLogo.getBoundingClientRect();
        hero.style.setProperty('--stage-logo-x', r.left + 'px');
        hero.style.setProperty('--stage-logo-y', r.top + 'px');
        hero.style.setProperty('--stage-logo-w', r.width + 'px');
      }
      if (bar) hero.style.setProperty('--stage-bar-h', bar.offsetHeight + 'px');
    }

    var morphTimer = null;
    function flip(change) {
      var first = parts.map(function (p) { return p.el.getBoundingClientRect(); });
      parts.forEach(function (p) { p.el.getAnimations().forEach(function (a) { a.cancel(); }); });
      change();
      hero.classList.add('is-morphing');
      clearTimeout(morphTimer);
      morphTimer = setTimeout(function () { hero.classList.remove('is-morphing'); }, DURATION * 0.7);
      parts.forEach(function (p, i) {
        var f = first[i], l = p.el.getBoundingClientRect();
        if (!f.width || !l.width || !f.height || !l.height) return;
        var sx = f.width / l.width, sy = p.uniform ? sx : f.height / l.height;
        var dx = f.left - l.left, dy = f.top - l.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
        p.el.animate([
          { transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' },
          { transformOrigin: '0 0', transform: 'none' }
        ], { duration: DURATION, easing: EASE });
      });
    }

    var opened = false, staged = false;
    function want() { return opened && window.scrollY <= 4; }
    function sync() {
      var on = want();
      if (on === staged) return;
      staged = on;
      flip(function () {
        if (on) measureSlots();
        hero.classList.toggle('is-stage', on);
      });
    }

    video.addEventListener('playing', function () {
      if (opened) return;
      setTimeout(function () { opened = true; sync(); }, ENTER_DELAY);
    });
    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; sync(); });
    }, { passive: true });
    window.addEventListener('resize', function () { if (staged) measureSlots(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
